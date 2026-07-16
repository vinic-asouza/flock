import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { AuthRequest, Group } from '../types';
import { createGroupSchema, updateGroupSchema } from '../validators/groupValidator';
import { logAudit } from '../utils/auditLogger';
import { validateResponsibleAndCongregation, validateGroupCongregation, validateMemberForGroup } from '../utils/groupValidations';
import { resolveCongregationFilter } from '../utils/primaryCongregation';
import { debug, error as logError } from '../utils/logger';

/**
 * Lista todos os grupos da igreja com filtros
 *
 * Suporta:
 * - Filtro por congregação (query param congregation_id)
 * - Filtro por tipo (query param type)
 * - Filtro por status (query param status: active | inactive | all)
 * - Busca por nome (query param search)
 * - Ordenação (query params sort_by, sort_order) com whitelist
 * - Contagem de membros por grupo
 *
 * @param req - Request com query params de filtro e ordenação (opcionais)
 * @param res - Response com lista de grupos incluindo contagem de membros
 * @returns JSON com array de grupos
 */
export const listGroups = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const churchId = req.church!.churchId;

    const congregation_id = (req.query.congregation_id as string) || '';
    const type = req.query.type as string || '';
    const statusParam = (req.query.status as string) || 'all';
    const search = (req.query.search as string) || '';

    // Whitelist de campos para sort_by — evita acesso indireto a colunas sensíveis
    const ALLOWED_SORT_FIELDS = ['name', 'type', 'created_at', 'updated_at', 'status'] as const;
    const sort_by_raw = (req.query.sort_by as string) || 'name';
    const sort_by = ALLOWED_SORT_FIELDS.includes(sort_by_raw as (typeof ALLOWED_SORT_FIELDS)[number])
      ? sort_by_raw
      : 'name';
    const sort_order = (req.query.sort_order as string) === 'desc' ? 'desc' : 'asc';

    // Construir query base
    let query = supabase
      .from('groups')
      .select(`
        *,
        congregations (
          id,
          name,
          abbreviation
        ),
        members!groups_responsible_id_fkey (
          id,
          name
        )
      `)
      .eq('church_id', churchId);

    // Aplicar filtro de congregação
    const congregationFilter = resolveCongregationFilter(congregation_id);
    if (!congregationFilter.ok) {
      return res.status(400).json({
        error: 'Filtro inválido',
        details: congregationFilter.message
      });
    }
    if (congregationFilter.congregationId) {
      query = query.eq('congregation_id', congregationFilter.congregationId);
    }

    // Aplicar filtro de tipo
    if (type) {
      query = query.eq('type', type);
    }

    // Aplicar filtro de status (active = true, inactive = false)
    if (statusParam === 'active') {
      query = query.eq('status', true);
    } else if (statusParam === 'inactive') {
      query = query.eq('status', false);
    }

    // Busca por nome (ilike para correspondência parcial)
    if (search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .order('id', { ascending: true });

    const { data: groups, error } = await query;

    if (error) {
      return res.status(400).json({
        error: 'Erro ao buscar grupos',
        details: error.message
      });
    }

    if (!groups || groups.length === 0) {
      return res.json([]);
    }

    const groupIds = groups.map((group: any) => group.id);
    const { data: memberGroups, error: memberGroupsError } = await supabase
      .from('member_groups')
      .select('group_id')
      .in('group_id', groupIds);

    if (memberGroupsError) {
      logError('Erro ao carregar contagem de membros dos grupos:', memberGroupsError);
      return res.status(500).json({
        error: 'Erro ao calcular resumo dos grupos',
        details: 'Não foi possível carregar a contagem de membros por grupo no momento'
      });
    }

    const memberCountByGroup = (memberGroups || []).reduce((acc, current) => {
      if (current.group_id) {
        acc[current.group_id] = (acc[current.group_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const groupsWithMemberCount = groups.map((group: any) => ({
      ...group,
      memberCount: memberCountByGroup[group.id] || 0
    }));

    res.json(groupsWithMemberCount);
  } catch (error) {
    logError('Erro ao buscar grupos:', error);
    return res.status(500).json({
      error: 'Erro ao carregar lista de grupos',
      details: error instanceof Error ? error.message : 'Não foi possível carregar a lista de grupos. Tente novamente.'
    });
  }
};

/**
 * Busca um grupo específico com informações relacionadas
 * 
 * Retorna dados completos do grupo incluindo:
 * - Informações básicas
 * - Congregação
 * - Responsável
 * - Lista de membros vinculados
 * 
 * @param req - Request com group ID nos params
 * @param res - Response com dados completos do grupo
 * @returns JSON com objeto GroupWithMembers completo
 */
export const getGroup = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const churchId = req.church!.churchId;

    // Buscar grupo específico com informações relacionadas
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        *,
        congregations (
          id,
          name,
          abbreviation,
          address,
          city,
          state
        ),
        members!groups_responsible_id_fkey (
          id,
          name,
          email,
          phone,
          whatsapp
        )
      `)
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (groupError || !group) {
      return res.status(404).json({
        error: 'Grupo não encontrado',
        details: 'Não foi possível encontrar o grupo solicitado'
      });
    }

    // Buscar membros vinculados ao grupo
    const { data: memberGroups, error: memberGroupsError } = await supabase
      .from('member_groups')
      .select(`
        id,
        created_at,
        members (
          id,
          name,
          email,
          phone,
          whatsapp,
          active,
          congregation_id,
          congregations (
            id,
            name,
            abbreviation
          )
        )
      `)
      .eq('group_id', id);

    if (memberGroupsError) {
      logError('Erro ao buscar membros do grupo:', memberGroupsError);
      return res.status(500).json({
        error: 'Erro ao carregar membros do grupo',
        details: 'Não foi possível carregar os membros vinculados a este grupo no momento'
      });
    }

    // Separar responsável dos membros vinculados
    const { members: responsible, ...groupWithoutMembers } = group as any;

    res.json({
      ...groupWithoutMembers,
      responsible: responsible || null,
      membersList: memberGroups?.map((mg: any) => ({
        ...mg.members,
        memberGroupId: mg.id,
        addedAt: mg.created_at
      })) || []
    });
  } catch (error) {
    logError('Erro ao buscar grupo:', error);
    return res.status(500).json({
      error: 'Erro ao carregar dados do grupo',
      details: error instanceof Error ? error.message : 'Não foi possível carregar os dados do grupo. Tente novamente.'
    });
  }
};

/**
 * Cria um novo grupo
 * 
 * Processo:
 * 1. Valida dados do grupo
 * 2. Valida congregação (se fornecida)
 * 3. Valida responsável e associação com congregação (se fornecido)
 * 4. Verifica duplicidade de nome+tipo+congregação (apenas grupos ativos)
 * 5. Cria grupo
 * 6. Registra auditoria
 * 
 * @param req - Request com dados do grupo no body
 * @param res - Response com grupo criado
 * @returns JSON com objeto Group criado (status 201) ou erro
 */
export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { error: validationError } = createGroupSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message
      });
    }

    const { name, type, description, congregation_id, responsible_id, status } = req.body;

    const churchId = req.church!.churchId;

    // Validar congregação (se fornecida)
    const congregationValidation = await validateGroupCongregation(congregation_id, churchId);
    if (!congregationValidation.isValid) {
      return res.status(400).json({
        error: 'Congregação inválida',
        details: congregationValidation.errorMessage || 'A congregação não é válida'
      });
    }

    // Validar responsável e sua associação com a congregação (se fornecido)
    const responsibleValidation = await validateResponsibleAndCongregation(
      responsible_id,
      congregation_id,
      churchId
    );
    if (!responsibleValidation.isValid) {
      return res.status(400).json({
        error: 'Responsável inválido',
        details: responsibleValidation.errorMessage || 'O responsável selecionado não é válido'
      });
    }

    // Verificar se já existe um grupo ATIVO com o mesmo nome e tipo na mesma congregação
    // Grupos inativos não bloqueiam a criação de novos grupos
    let duplicateQuery = supabase
      .from('groups')
      .select('id')
      .eq('church_id', churchId)
      .eq('name', name)
      .eq('type', type)
      .eq('status', true); // Apenas grupos ativos

    duplicateQuery = duplicateQuery.eq('congregation_id', congregation_id);

    const { data: existingGroup } = await duplicateQuery.single();

    if (existingGroup) {
      return res.status(400).json({
        error: 'Grupo já existe',
        details: 'Já existe um grupo com este nome e tipo nesta congregação'
      });
    }

    // Criar novo grupo
    const groupData: Partial<Group> = {
      church_id: churchId,
      name,
      type,
      description: description || null,
      congregation_id,
      responsible_id: responsible_id || null,
      status: status !== undefined ? status : true
    };

    const { data: group, error: createError } = await supabase
      .from('groups')
      .insert([groupData])
      .select()
      .single();

    if (createError) {
      return res.status(400).json({
        error: 'Erro ao criar grupo',
        details: createError.message
      });
    }

    // Log da operação de criação
    await logAudit(req, {
      entity: 'group',
      entityId: group.id,
      action: 'create',
      changesAfter: group
    });

    res.status(201).json(group);
  } catch (error) {
    logError('Erro ao criar grupo:', error);
    return res.status(500).json({
      error: 'Erro ao cadastrar grupo',
      details: error instanceof Error ? error.message : 'Não foi possível cadastrar o grupo. Verifique os dados e tente novamente.'
    });
  }
};

/**
 * Atualiza um grupo existente
 * 
 * Processo:
 * 1. Valida que grupo existe e pertence à igreja
 * 2. Valida congregação (se fornecida)
 * 3. Valida responsável e associação com congregação (se fornecido)
 * 4. Verifica duplicidade de nome+tipo+congregação (apenas grupos ativos)
 * 5. Atualiza grupo
 * 6. Registra auditoria
 * 
 * @param req - Request com group ID nos params e dados atualizados no body
 * @param res - Response com grupo atualizado
 * @returns JSON com objeto Group atualizado ou erro
 */
export const updateGroup = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const { error: validationError } = updateGroupSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message
      });
    }

    const churchId = req.church!.churchId;

    // Buscar grupo existente
    const { data: existingGroup, error: existingError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (existingError || !existingGroup) {
      return res.status(404).json({
        error: 'Grupo não encontrado',
        details: 'Não foi possível encontrar o grupo solicitado'
      });
    }

    const { name, type, congregation_id, responsible_id } = req.body;

    if (congregation_id !== undefined && (!congregation_id || String(congregation_id).trim() === '')) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: 'A congregação é obrigatória para o grupo',
      });
    }

    const finalCongregationId =
      congregation_id !== undefined ? congregation_id : existingGroup.congregation_id;
    const finalResponsibleId =
      responsible_id !== undefined ? (responsible_id || null) : existingGroup.responsible_id;

    // Aplicar as mesmas validações do create usando o estado final do grupo
    const congregationValidation = await validateGroupCongregation(finalCongregationId, churchId);
    if (!congregationValidation.isValid) {
      return res.status(400).json({
        error: 'Congregação inválida',
        details: congregationValidation.errorMessage || 'A congregação não é válida'
      });
    }

    const responsibleValidation = await validateResponsibleAndCongregation(
      finalResponsibleId,
      finalCongregationId,
      churchId
    );
    if (!responsibleValidation.isValid) {
      return res.status(400).json({
        error: 'Responsável inválido',
        details: responsibleValidation.errorMessage || 'O responsável selecionado não é válido'
      });
    }

    // Se nome ou tipo foram alterados, verificar duplicatas
    if (name || type || congregation_id !== undefined) {
      const finalName = name || existingGroup.name;
      const finalType = type || existingGroup.type;

      // Verificar duplicidade considerando apenas grupos ativos (exceto o próprio grupo sendo editado)
      const { data: duplicateGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('church_id', churchId)
        .eq('name', finalName)
        .eq('type', finalType)
        .eq('status', true) // Apenas grupos ativos
        .eq('congregation_id', finalCongregationId)
        .neq('id', id)
        .single();

      if (duplicateGroup) {
        return res.status(400).json({
          error: 'Grupo já existe',
          details: 'Já existe outro grupo com este nome e tipo nesta congregação'
        });
      }
    }

    // Atualizar grupo
    const updateData: Partial<Group> = {
      ...req.body,
      updated_at: new Date()
    };

    if (updateData.responsible_id === '') {
      updateData.responsible_id = null;
    }

    // Remover campos undefined para não sobrescrever com null
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof Group] === undefined) {
        delete updateData[key as keyof Group];
      }
    });

    const { data: group, error: updateError } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', churchId)
      .select()
      .single();

    if (updateError || !group) {
      return res.status(400).json({
        error: 'Erro ao atualizar grupo',
        details: updateError?.message || 'Erro desconhecido'
      });
    }

    // Log da operação de atualização
    await logAudit(req, {
      entity: 'group',
      entityId: group.id,
      action: 'update',
      changesBefore: existingGroup,
      changesAfter: group
    });

    res.json(group);
  } catch (error) {
    logError('Erro ao atualizar grupo:', error);
    return res.status(500).json({
      error: 'Erro ao atualizar grupo',
      details: error instanceof Error ? error.message : 'Não foi possível atualizar os dados do grupo. Tente novamente.'
    });
  }
};

/**
 * Remove permanentemente um grupo
 * 
 * O CASCADE nas foreign keys remove automaticamente os registros em member_groups.
 * 
 * @param req - Request com group ID nos params
 * @param res - Response com status 204 (sem conteúdo)
 * @returns Status 204 ou erro
 */
export const deleteGroup = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const churchId = req.church!.churchId;

    // Buscar grupo para verificar existência e obter dados para log
    const { data: existingGroup, error: existingError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (existingError || !existingGroup) {
      return res.status(404).json({
        error: 'Grupo não encontrado',
        details: 'Não foi possível encontrar o grupo solicitado'
      });
    }

    // Verificar se existem membros vinculados (opcional - pode permitir deletar mesmo assim)
    const { count: memberCount } = await supabase
      .from('member_groups')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', id);

    // Deletar grupo (CASCADE deletará automaticamente os registros em member_groups)
    const { error: deleteError } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)
      .eq('church_id', churchId);

    if (deleteError) {
      return res.status(400).json({
        error: 'Erro ao deletar grupo',
        details: deleteError.message
      });
    }

    // Log da operação de deleção
    await logAudit(req, {
      entity: 'group',
      entityId: existingGroup.id,
      action: 'delete',
      changesBefore: existingGroup
    });

    res.status(204).send();
  } catch (error) {
    logError('Erro ao deletar grupo:', error);
    return res.status(500).json({
      error: 'Erro ao remover grupo',
      details: error instanceof Error ? error.message : 'Não foi possível remover o grupo. Tente novamente.'
    });
  }
};

/**
 * Lista todos os membros vinculados a um grupo
 * 
 * Retorna membros ordenados por data de adição (mais recente primeiro)
 * com informações completas incluindo congregação e cargo.
 * 
 * @param req - Request com group ID nos params
 * @param res - Response com lista de membros
 * @returns JSON com array de membros incluindo addedAt
 */
export const getGroupMembers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const churchId = req.church!.churchId;

    // Verificar se o grupo pertence à igreja
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (!group) {
      return res.status(404).json({
        error: 'Grupo não encontrado',
        details: 'Não foi possível encontrar o grupo solicitado'
      });
    }

    // Buscar membros vinculados ao grupo
    const { data: memberGroups, error: memberGroupsError } = await supabase
      .from('member_groups')
      .select(`
        id,
        created_at,
        members (
          id,
          name,
          email,
          phone,
          whatsapp,
          active,
          congregation_id,
          congregations (
            id,
            name,
            abbreviation
          )
        )
      `)
      .eq('group_id', id)
      .order('created_at', { ascending: false });

    if (memberGroupsError) {
      return res.status(400).json({
        error: 'Erro ao buscar membros do grupo',
        details: memberGroupsError.message
      });
    }

    res.json(
      memberGroups?.map((mg: any) => ({
        ...mg.members,
        memberGroupId: mg.id,
        addedAt: mg.created_at
      })) || []
    );
  } catch (error) {
    logError('Erro ao buscar membros do grupo:', error);
    return res.status(500).json({
      error: 'Erro ao carregar membros do grupo',
      details: error instanceof Error ? error.message : 'Não foi possível carregar os membros do grupo. Tente novamente.'
    });
  }
};

/**
 * Adiciona um membro a um grupo
 * 
 * Processo:
 * 1. Valida que grupo e membro pertencem à igreja
 * 2. Valida que membro pertence à congregação do grupo
 * 3. Verifica se membro já está no grupo
 * 4. Adiciona membro ao grupo
 * 5. Registra auditoria
 * 
 * @param req - Request com group ID nos params e member_id no body
 * @param res - Response com member_group criado (status 201) ou erro
 * @returns JSON com objeto MemberGroup criado ou erro
 */
export const addMemberToGroup = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params; // group_id
    const { member_id } = req.body;

    if (!member_id) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: 'member_id é obrigatório'
      });
    }

    const churchId = req.church!.churchId;

    // Verificar se o grupo pertence à igreja
    const { data: group } = await supabase
      .from('groups')
      .select('id, congregation_id')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (!group) {
      return res.status(404).json({
        error: 'Grupo não encontrado',
        details: 'Não foi possível encontrar o grupo solicitado'
      });
    }

    // Validar se o membro pode ser adicionado ao grupo (pertence à igreja e congregação)
    const memberValidation = await validateMemberForGroup(member_id, id, churchId);
    if (!memberValidation.isValid) {
      return res.status(400).json({
        error: 'Membro inválido',
        details: memberValidation.errorMessage || 'O membro não pode ser adicionado a este grupo'
      });
    }

    // Verificar se já está vinculado
    const { data: existingMemberGroup } = await supabase
      .from('member_groups')
      .select('id')
      .eq('member_id', member_id)
      .eq('group_id', id)
      .single();

    if (existingMemberGroup) {
      return res.status(400).json({
        error: 'Membro já está no grupo',
        details: 'Este membro já está vinculado a este grupo'
      });
    }

    // Adicionar membro ao grupo
    const { data: memberGroup, error: addError } = await supabase
      .from('member_groups')
      .insert([{
        member_id,
        group_id: id
      }])
      .select()
      .single();

    if (addError) {
      return res.status(400).json({
        error: 'Erro ao adicionar membro ao grupo',
        details: addError.message
      });
    }

    // Buscar dados do membro para auditoria
    const { data: member } = await supabase
      .from('members')
      .select('id, name')
      .eq('id', member_id)
      .single();

    // Buscar dados do grupo para auditoria
    const { data: groupForAudit } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', id)
      .single();

    // Log da operação de adicionar membro
    await logAudit(req, {
      entity: 'member_group',
      entityId: memberGroup.id,
      action: 'create',
      changesAfter: {
        member_id,
        group_id: id,
        member_name: member?.name || 'N/A',
        group_name: groupForAudit?.name || 'N/A'
      }
    });

    res.status(201).json(memberGroup);
  } catch (error) {
    logError('Erro ao adicionar membro ao grupo:', error);
    return res.status(500).json({
      error: 'Erro ao adicionar membro ao grupo',
      details: error instanceof Error ? error.message : 'Não foi possível adicionar o membro ao grupo. Tente novamente.'
    });
  }
};

/**
 * Remove um membro de um grupo
 * 
 * Processo:
 * 1. Valida que grupo pertence à igreja
 * 2. Remove membro do grupo
 * 3. Registra auditoria
 * 
 * @param req - Request com group ID e memberId nos params
 * @param res - Response com status 204 (sem conteúdo)
 * @returns Status 204 ou erro
 */
export const removeMemberFromGroup = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id, memberId: member_id } = req.params; // group_id e member_id

    const churchId = req.church!.churchId;

    // Verificar se o grupo pertence à igreja
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (!group) {
      return res.status(404).json({
        error: 'Grupo não encontrado',
        details: 'Não foi possível encontrar o grupo solicitado'
      });
    }

    // Buscar dados do membro e grupo para auditoria antes de remover
    const { data: memberGroupForAudit } = await supabase
      .from('member_groups')
      .select(`
        id,
        members (
          id,
          name
        ),
        groups (
          id,
          name
        )
      `)
      .eq('member_id', member_id)
      .eq('group_id', id)
      .single();

    // Remover membro do grupo
    const { error: removeError } = await supabase
      .from('member_groups')
      .delete()
      .eq('member_id', member_id)
      .eq('group_id', id);

    if (removeError) {
      return res.status(400).json({
        error: 'Erro ao remover membro do grupo',
        details: removeError.message
      });
    }

    // Log da operação de remover membro
    if (memberGroupForAudit) {
      await logAudit(req, {
        entity: 'member_group',
        entityId: (memberGroupForAudit as any).id,
        action: 'delete',
        changesBefore: {
          member_id,
          group_id: id,
          member_name: (memberGroupForAudit as any).members?.name || 'N/A',
          group_name: (memberGroupForAudit as any).groups?.name || 'N/A'
        }
      });
    }

    res.status(204).send();
  } catch (error) {
    logError('Erro ao remover membro do grupo:', error);
    return res.status(500).json({
      error: 'Erro ao remover membro do grupo',
      details: error instanceof Error ? error.message : 'Não foi possível remover o membro do grupo. Tente novamente.'
    });
  }
};
