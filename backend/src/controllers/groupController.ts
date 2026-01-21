import { Response } from 'express';
import supabase from '../services/supabase';
import { AuthRequest, Group } from '../types';
import { createGroupSchema, updateGroupSchema } from '../validators/groupValidator';
import { logAudit } from '../utils/auditLogger';

/**
 * Lista todos os grupos da igreja com filtros
 */
export const listGroups = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Filtro por congregação (query param)
    const congregation_id = req.query.congregation_id as string || '';
    
    // Construir query base
    let query = supabase
      .from('groups')
      .select(`
        *,
        congregations (
          id,
          name
        ),
        members!groups_responsible_id_fkey (
          id,
          name
        )
      `)
      .eq('church_id', church.id)
      .order('type')
      .order('name');

    // Aplicar filtro de congregação
    if (congregation_id) {
      if (congregation_id === 'sede') {
        // Filtrar grupos sem congregação (congregation_id IS NULL)
        query = query.is('congregation_id', null);
      } else {
        // Filtrar por congregação específica
        query = query.eq('congregation_id', congregation_id);
      }
    }

    const { data: groups, error } = await query;

    if (error) {
      return res.status(400).json({
        error: 'Erro ao buscar grupos',
        details: error.message
      });
    }

    // Para cada grupo, buscar contagem de membros
    const groupsWithMemberCount = await Promise.all(
      (groups || []).map(async (group: any) => {
        const { count: memberCount, error: countError } = await supabase
          .from('member_groups')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        if (countError) {
          console.error(`Erro ao contar membros para o grupo ${group.name}:`, countError);
          return { ...group, memberCount: 0 };
        }

        return {
          ...group,
          memberCount: memberCount || 0
        };
      })
    );

    res.json(groupsWithMemberCount);
  } catch (error) {
    console.error('Erro ao buscar grupos:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Busca um grupo específico
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

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Buscar grupo específico com informações relacionadas
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        *,
        congregations (
          id,
          name,
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
      .eq('church_id', church.id)
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
          role_id,
          congregations (
            id,
            name
          ),
          roles (
            id,
            name
          )
        )
      `)
      .eq('group_id', id);

    if (memberGroupsError) {
      console.error('Erro ao buscar membros do grupo:', memberGroupsError);
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
    console.error('Erro ao buscar grupo:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Cria um novo grupo
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

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Verificar se já existe um grupo com o mesmo nome e tipo na mesma congregação
    let duplicateQuery = supabase
      .from('groups')
      .select('id')
      .eq('church_id', church.id)
      .eq('name', name)
      .eq('type', type);

    if (congregation_id) {
      duplicateQuery = duplicateQuery.eq('congregation_id', congregation_id);
    } else {
      duplicateQuery = duplicateQuery.is('congregation_id', null);
    }

    const { data: existingGroup } = await duplicateQuery.single();

    if (existingGroup) {
      return res.status(400).json({
        error: 'Grupo já existe',
        details: 'Já existe um grupo com este nome e tipo nesta congregação'
      });
    }

    // Criar novo grupo
    const groupData: Partial<Group> = {
      church_id: church.id,
      name,
      type,
      description: description || null,
      congregation_id: congregation_id || null,
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
    console.error('Erro ao criar grupo:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Atualiza um grupo
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

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Buscar grupo existente
    const { data: existingGroup, error: existingError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (existingError || !existingGroup) {
      return res.status(404).json({
        error: 'Grupo não encontrado',
        details: 'Não foi possível encontrar o grupo solicitado'
      });
    }

    // Se nome ou tipo foram alterados, verificar duplicatas
    const { name, type, congregation_id } = req.body;
    if (name || type || congregation_id !== undefined) {
      const finalName = name || existingGroup.name;
      const finalType = type || existingGroup.type;
      const finalCongregationId = congregation_id !== undefined ? congregation_id : existingGroup.congregation_id;

      let duplicateQuery = supabase
        .from('groups')
        .select('id')
        .eq('church_id', church.id)
        .eq('name', finalName)
        .eq('type', finalType)
        .neq('id', id);

      if (finalCongregationId) {
        duplicateQuery = duplicateQuery.eq('congregation_id', finalCongregationId);
      } else {
        duplicateQuery = duplicateQuery.is('congregation_id', null);
      }

      const { data: duplicateGroup } = await duplicateQuery.single();

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
      .eq('church_id', church.id)
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
    console.error('Erro ao atualizar grupo:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Deleta um grupo
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

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Buscar grupo para verificar existência e obter dados para log
    const { data: existingGroup, error: existingError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
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
      .eq('church_id', church.id);

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
    console.error('Erro ao deletar grupo:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Lista membros de um grupo
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

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Verificar se o grupo pertence à igreja
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', id)
      .eq('church_id', church.id)
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
          role_id,
          congregations (
            id,
            name
          ),
          roles (
            id,
            name
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
    console.error('Erro ao buscar membros do grupo:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Adiciona um membro a um grupo
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

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Verificar se o grupo pertence à igreja
    const { data: group } = await supabase
      .from('groups')
      .select('id, congregation_id')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (!group) {
      return res.status(404).json({
        error: 'Grupo não encontrado',
        details: 'Não foi possível encontrar o grupo solicitado'
      });
    }

    // Verificar se o membro pertence à igreja
    const { data: member } = await supabase
      .from('members')
      .select('id, congregation_id')
      .eq('id', member_id)
      .eq('church_id', church.id)
      .single();

    if (!member) {
      return res.status(404).json({
        error: 'Membro não encontrado',
        details: 'Não foi possível encontrar o membro solicitado'
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

    res.status(201).json(memberGroup);
  } catch (error) {
    console.error('Erro ao adicionar membro ao grupo:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Remove um membro de um grupo
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

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Verificar se o grupo pertence à igreja
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (!group) {
      return res.status(404).json({
        error: 'Grupo não encontrado',
        details: 'Não foi possível encontrar o grupo solicitado'
      });
    }

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

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover membro do grupo:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};
