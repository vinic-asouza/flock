import { Response } from 'express';
import supabase from '../services/supabase';
import { AuthRequest, Member } from '../types';
import { validateMember } from '../validators/memberValidator';
import { reportFiltersSchema } from '../validators/reportValidator';
import { logAudit } from '../utils/auditLogger';
import { normalizeMemberDates } from '../utils/dateNormalizer';
import { checkMemberLimit } from '../utils/planLimits';
import { debug, error as logError } from '../utils/logger';
import { validateEmailUniqueness, validateGroups } from '../utils/memberValidations';
import { calculateAge } from '../utils/ageCalculator';

/**
 * Lista todos os membros da igreja com paginação e filtros avançados
 */
export const listMembers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Parâmetros de paginação
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Parâmetros de busca geral
    const search = req.query.search as string || '';
    
    // Filtros básicos
    const active = req.query.active !== undefined ? req.query.active === 'true' : undefined;
    const role_id = req.query.role_id as string || '';
    const congregation_id = req.query.congregation_id as string || '';

    // Filtros por campos específicos
    const gender = req.query.gender as string || '';
    const marital_status = req.query.marital_status as string || '';
    const nationality = req.query.nationality as string || '';
    const occupation = req.query.occupation as string || '';
    const city = req.query.city as string || '';
    const state = req.query.state as string || '';

    // Filtros por datas
    const birth_date_from = req.query.birth_date_from as string || '';
    const birth_date_to = req.query.birth_date_to as string || '';
    const baptism_date_from = req.query.baptism_date_from as string || '';
    const baptism_date_to = req.query.baptism_date_to as string || '';
    const admission_date_from = req.query.admission_date_from as string || '';
    const admission_date_to = req.query.admission_date_to as string || '';

    // Filtros por faixa etária (calculada a partir da data de nascimento)
    const age_from = req.query.age_from ? parseInt(req.query.age_from as string) : undefined;
    const age_to = req.query.age_to ? parseInt(req.query.age_to as string) : undefined;

    // Ordenação
    const sort_by = req.query.sort_by as string || 'name';
    const sort_order = req.query.sort_order as 'asc' | 'desc' || 'asc';

    // Validações
    if (page < 1) {
      return res.status(400).json({
        error: 'Página inválida',
        details: 'A página deve ser maior que 0'
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Limite inválido',
        details: 'O limite deve estar entre 1 e 100'
      });
    }

    // Validações de datas
    const validateDate = (dateStr: string) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    const birthFrom = validateDate(birth_date_from);
    const birthTo = validateDate(birth_date_to);
    const baptismFrom = validateDate(baptism_date_from);
    const baptismTo = validateDate(baptism_date_to);
    const admissionFrom = validateDate(admission_date_from);
    const admissionTo = validateDate(admission_date_to);

    // Validações de faixa etária
    if (age_from !== undefined && (age_from < 0 || age_from > 150)) {
      return res.status(400).json({
        error: 'Idade inválida',
        details: 'A idade deve estar entre 0 e 150 anos'
      });
    }

    if (age_to !== undefined && (age_to < 0 || age_to > 150)) {
      return res.status(400).json({
        error: 'Idade inválida',
        details: 'A idade deve estar entre 0 e 150 anos'
      });
    }

    if (age_from !== undefined && age_to !== undefined && age_from > age_to) {
      return res.status(400).json({
        error: 'Faixa etária inválida',
        details: 'A idade inicial deve ser menor que a idade final'
      });
    }

    // Primeiro busca a igreja do usuário
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

    // Calcula o offset
    const offset = (page - 1) * limit;

    // Constrói a query base
    // children já está na tabela members como JSONB
    let query = supabase
      .from('members')
      .select(`
        *,
        roles (
          id,
          name,
          description
        ),
        congregations (
          id,
          name,
          address,
          city,
          state,
          leader,
          phone
        )
      `, { count: 'exact' })
      .eq('church_id', church.id);

    // Aplica filtros de busca geral
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,whatsapp.ilike.%${search}%,document.ilike.%${search}%`);
    }

    // Aplica filtros básicos
    if (active !== undefined) {
      query = query.eq('active', active);
    }

    if (role_id) {
      query = query.eq('role_id', role_id);
    }

    if (congregation_id) {
      if (congregation_id === 'sede') {
        // Filtrar membros sem congregação (congregation_id IS NULL)
        query = query.is('congregation_id', null);
      } else {
        // Filtrar por congregação específica
        query = query.eq('congregation_id', congregation_id);
      }
    }

    // Aplica filtros por campos específicos
    if (gender) {
      query = query.eq('gender', gender);
    }

    if (marital_status) {
      query = query.eq('marital_status', marital_status);
    }

    if (nationality) {
      query = query.ilike('nationality', `%${nationality}%`);
    }

    if (occupation) {
      query = query.ilike('occupation', `%${occupation}%`);
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    if (state) {
      query = query.eq('state', state);
    }

    // Aplica filtros por datas
    if (birthFrom) {
      query = query.gte('birth', birthFrom.toISOString());
    }

    if (birthTo) {
      query = query.lte('birth', birthTo.toISOString());
    }

    if (baptismFrom) {
      query = query.gte('baptism_date', baptismFrom.toISOString());
    }

    if (baptismTo) {
      query = query.lte('baptism_date', baptismTo.toISOString());
    }

    if (admissionFrom) {
      query = query.gte('admission_date', admissionFrom.toISOString());
    }

    if (admissionTo) {
      query = query.lte('admission_date', admissionTo.toISOString());
    }

    // Aplica ordenação
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // Aplica paginação
    const { data: members, error: membersError, count } = await query
      .range(offset, offset + limit - 1);

    if (membersError) {
      logError('Erro ao buscar membros:', membersError);
      return res.status(500).json({
        error: 'Erro ao buscar membros',
        details: membersError.message
      });
    }

    // Filtra por faixa etária se necessário (após buscar os dados)
    let filteredMembers = members;
    if (age_from !== undefined || age_to !== undefined) {
      filteredMembers = members.filter(member => {
        if (!member.birth) return false;
        
        const birthDate = new Date(member.birth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
          ? age - 1 
          : age;

        if (age_from !== undefined && actualAge < age_from) return false;
        if (age_to !== undefined && actualAge > age_to) return false;
        
        return true;
      });
    }

    // Buscar grupos para todos os membros
    const memberIds = filteredMembers.map(m => m.id);
    let memberGroupsMap: Record<string, any[]> = {};
    
    if (memberIds.length > 0) {
      const { data: memberGroups, error: memberGroupsError } = await supabase
        .from('member_groups')
        .select(`
          member_id,
          groups (
            id,
            name,
            type,
            status,
            congregation_id,
            congregations (
              id,
              name
            )
          )
        `)
        .in('member_id', memberIds);

      if (!memberGroupsError && memberGroups) {
        // Agrupar grupos por member_id
        memberGroups.forEach((mg: any) => {
          if (mg.groups) {
            if (!memberGroupsMap[mg.member_id]) {
              memberGroupsMap[mg.member_id] = [];
            }
            memberGroupsMap[mg.member_id].push(mg.groups);
          }
        });
      }
    }

    // Formatar a resposta para manter compatibilidade
    const formattedMembers = filteredMembers.map(member => ({
      ...member,
      role: member.roles,
      congregation: member.congregations,
      groups: memberGroupsMap[member.id] || [],
      roles: undefined, // Remove o campo roles da resposta
      congregations: undefined // Remove o campo congregations da resposta
    }));

    // Calcula informações de paginação (ajustado para filtros aplicados)
    const actualCount = age_from !== undefined || age_to !== undefined ? filteredMembers.length : (count || 0);
    const totalPages = Math.ceil(actualCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      data: formattedMembers,
      pagination: {
        page,
        limit,
        total: actualCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      },
      filters: {
        search: search || null,
        active: active !== undefined ? active : null,
        role_id: role_id || null,
        congregation_id: congregation_id || null,
        gender: gender || null,
        marital_status: marital_status || null,
        nationality: nationality || null,
        occupation: occupation || null,
        city: city || null,
        state: state || null,
        birth_date_from: birth_date_from || null,
        birth_date_to: birth_date_to || null,
        baptism_date_from: baptism_date_from || null,
        baptism_date_to: baptism_date_to || null,
        admission_date_from: admission_date_from || null,
        admission_date_to: admission_date_to || null,
        age_from: age_from || null,
        age_to: age_to || null
      },
      sorting: {
        sort_by,
        sort_order
      }
    });

  } catch (error) {
    logError('Erro ao listar membros:', error);
    
    // Mensagens de erro mais específicas
    let errorMessage = 'Erro ao buscar membros';
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
        errorMessage = 'Erro de conexão com o banco de dados. Tente novamente.';
      } else if (error.message.includes('validation')) {
        errorMessage = 'Erro de validação nos parâmetros de busca.';
      } else {
        errorMessage = `Erro ao processar requisição: ${error.message}`;
      }
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: errorMessage
    });
  }
};

/**
 * Busca um membro específico por ID
 * 
 * Retorna dados completos do membro incluindo:
 * - Informações pessoais
 * - Cargo (role)
 * - Congregação
 * - Grupos associados
 * - Filhos (children)
 * 
 * @param req - Request com member ID nos params
 * @param res - Response com dados completos do membro
 * @returns JSON com objeto Member completo
 */
export const getMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    // Primeiro busca a igreja do usuário
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

    // Busca o membro específico com informações do cargo e congregação
    const { data: memberWithDetails, error: memberError } = await supabase
      .from('members')
      .select(`
        *,
        roles (
          id,
          name,
          description
        ),
        congregations (
          id,
          name,
          address,
          city,
          state,
          leader,
          phone
        )
      `)
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (memberError) {
      logError('Erro ao buscar membro:', memberError);
      return res.status(404).json({
        error: 'Membro não encontrado',
        details: 'Não foi possível encontrar o membro solicitado'
      });
    }

    // Buscar grupos do membro
    const { data: memberGroups, error: memberGroupsError } = await supabase
      .from('member_groups')
      .select(`
        id,
        created_at,
        groups (
          id,
          name,
          type,
          status,
          congregation_id,
          congregations (
            id,
            name
          )
        )
      `)
      .eq('member_id', id);

    if (memberGroupsError) {
      logError('Erro ao buscar grupos do membro:', memberGroupsError);
    }

    // Normalizar datas para evitar problemas de timezone (birth, baptism_date, admission_date, children.birth, etc.)
    const normalizedMember = normalizeMemberDates(memberWithDetails as unknown as Record<string, unknown>);

    // Formatar a resposta para manter compatibilidade
    // children já vem no memberWithDetails como JSONB e foi normalizado acima
    const formattedMember = {
      ...normalizedMember,
      role: (normalizedMember as any).roles,
      congregation: (normalizedMember as any).congregations,
      children: (normalizedMember as any).children || [],
      groups: memberGroups?.map((mg: any) => ({
        ...mg.groups,
        memberGroupId: mg.id,
        addedAt: mg.created_at
      })) || [],
      roles: undefined, // Remove o campo roles da resposta
      congregations: undefined // Remove o campo congregations da resposta
    };

    res.json(formattedMember);

  } catch (error) {
    logError('Erro ao buscar membro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Cria um novo membro com suporte a transação para grupos
 * 
 * Processo:
 * 1. Valida dados do membro
 * 2. Verifica limite do plano
 * 3. Verifica duplicidade de nome
 * 4. Valida email único (se fornecido)
 * 5. Valida grupos (se fornecidos)
 * 6. Cria membro
 * 7. Associa grupos (transação: se falhar, faz rollback)
 * 8. Registra auditoria
 * 
 * @param req - Request com dados do membro no body (incluindo groups opcional)
 * @param res - Response com membro criado
 * @returns JSON com objeto Member criado (status 201) ou erro
 */
export const createMember = async (req: AuthRequest, res: Response) => {
  let createdMemberId: string | null = null; // Para rollback se necessário
  
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Primeiro busca a igreja do usuário
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

    // Verificar limite de membros do plano
    const limitCheck = await checkMemberLimit(church.id, 1);
    if (!limitCheck.canAdd) {
      return res.status(403).json({
        error: 'Limite de membros atingido',
        details: limitCheck.message || 'Não é possível adicionar mais membros',
        currentCount: limitCheck.currentCount,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining,
        planType: limitCheck.planType,
      });
    }

    // Separar grupos do payload (se fornecidos)
    const { groups, ...dataWithoutGroups } = req.body as any;
    const groupIds = Array.isArray(groups) ? groups : [];

    // Normalizar datas antes de criar o membro (evita problemas de timezone)
    const normalizedData = normalizeMemberDates(dataWithoutGroups);

    // Verificar duplicidade por nome (lowercase) - OTIMIZADO
    if (normalizedData.name && typeof normalizedData.name === 'string' && normalizedData.name.trim()) {
      const normalizedName = normalizedData.name.trim().toLowerCase();
      
      // Query otimizada - busca direto no banco com ilike (case-insensitive)
      const { data: duplicate, error: checkError } = await supabase
        .from('members')
        .select('id, name')
        .eq('church_id', church.id)
        .ilike('name', normalizedName)
        .limit(1);
      
      if (checkError) {
        logError('Erro ao verificar duplicidade:', checkError);
      }
      
      if (duplicate && duplicate.length > 0) {
        return res.status(400).json({
          error: 'Membro já cadastrado',
          details: 'Já existe um membro cadastrado com este nome completo.'
        });
      }
    }

    // Verificar email duplicado (se fornecido)
    const emailValidation = await validateEmailUniqueness(normalizedData.email as string, church.id);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        error: emailValidation.errorMessage || 'Email já cadastrado',
        details: emailValidation.duplicateMemberName 
          ? `Este email já está sendo usado pelo membro: ${emailValidation.duplicateMemberName}`
          : 'Este email já está cadastrado'
      });
    }

    // Validar que os grupos existem e pertencem à igreja (se fornecidos)
    const groupsValidation = await validateGroups(groupIds, church.id);
    if (!groupsValidation.isValid) {
      return res.status(400).json({
        error: 'Erro ao validar grupos',
        details: groupsValidation.errorMessage || 'Um ou mais grupos são inválidos'
      });
    }

    const memberData: Partial<Member> = {
      ...normalizedData,
      church_id: church.id,
      active: true,
      // Garantir que children seja um array JSON válido
      children: normalizedData.children && Array.isArray(normalizedData.children) 
        ? normalizedData.children 
        : []
    };

    // ====================
    // INÍCIO DA TRANSAÇÃO LÓGICA
    // ====================

    // PASSO 1: Cria o novo membro
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert([memberData])
      .select()
      .single();

    if (memberError) {
      return res.status(400).json({
        error: 'Erro ao criar membro',
        details: memberError.message
      });
    }

    createdMemberId = member.id; // Armazenar para rollback se necessário

    // PASSO 2: Associar membro aos grupos (se fornecidos)
    if (groupIds.length > 0) {
      const memberGroupsData = groupIds.map(groupId => ({
        member_id: member.id,
        group_id: groupId
      }));

      const { error: memberGroupsError } = await supabase
        .from('member_groups')
        .insert(memberGroupsData);

      if (memberGroupsError) {
        // ❌ ROLLBACK: Deletar o membro criado
        logError('Erro ao associar grupos, fazendo rollback...', memberGroupsError);
        
        await supabase
          .from('members')
          .delete()
          .eq('id', member.id);

        return res.status(400).json({
          error: 'Erro ao associar membro aos grupos',
          details: memberGroupsError.message,
          rollback: 'Membro não foi criado devido a erro na associação de grupos'
        });
      }
    }

    // ====================
    // FIM DA TRANSAÇÃO LÓGICA - SUCESSO!
    // ====================

    // Log da operação de criação
    debug('Criando log de auditoria:', {
      userId: req.user?.id,
      memberId: member.id,
      churchId: church.id,
      groupsCount: groupIds.length
    });
    
    await logAudit(req, {
      entity: 'member',
      entityId: member.id,
      action: 'create',
      changesAfter: { ...member, groups: groupIds }
    });
    
    debug(`Membro criado com sucesso e associado a ${groupIds.length} grupo(s)`);

    res.status(201).json(member);

  } catch (error) {
    // ❌ ROLLBACK: Se houver erro inesperado e o membro foi criado, deletar
    if (createdMemberId) {
      logError('Erro inesperado, fazendo rollback do membro criado...', error);
      
      try {
        await supabase
          .from('members')
          .delete()
          .eq('id', createdMemberId);
        
        debug('Rollback concluído - membro deletado');
      } catch (rollbackError) {
        logError('Erro ao fazer rollback:', rollbackError);
      }
    }

    logError('Erro ao criar membro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Atualiza um membro existente com suporte a transação para grupos
 * 
 * Processo:
 * 1. Valida que membro existe e pertence à igreja
 * 2. Valida email único (se fornecido e diferente do atual)
 * 3. Valida grupos (se fornecidos)
 * 4. Atualiza membro
 * 5. Se inativado, remove de eventos futuros de calendário
 * 6. Gerencia grupos (adiciona novos, remove antigos) - transação: se falhar, faz rollback
 * 7. Registra auditoria
 * 
 * @param req - Request com member ID nos params e dados atualizados no body (incluindo groups opcional)
 * @param res - Response com membro atualizado
 * @returns JSON com objeto Member atualizado ou erro
 */
export const updateMember = async (req: AuthRequest, res: Response) => {
  let memberUpdated = false;
  let previousMemberData: any = null;
  let previousGroups: string[] = [];
  let groupsAdded: string[] = [];
  let groupsRemoved: string[] = [];
  
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    // Primeiro busca a igreja do usuário
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

    // Verifica se o membro pertence a esta igreja e busca dados atuais
    const { data: existingMember, error: checkError } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (checkError || !existingMember) {
      return res.status(404).json({
        error: 'Membro não encontrado',
        details: 'Não foi possível encontrar o membro solicitado'
      });
    }

    previousMemberData = { ...existingMember }; // Backup para rollback

    // Buscar grupos atuais do membro (para rollback se necessário)
    const { data: currentMemberGroups, error: currentGroupsError } = await supabase
      .from('member_groups')
      .select('group_id')
      .eq('member_id', id);

    if (currentGroupsError) {
      logError('Erro ao buscar grupos atuais:', currentGroupsError);
    }

    previousGroups = currentMemberGroups ? currentMemberGroups.map(mg => mg.group_id) : [];

    // Separar grupos do payload (se fornecidos)
    const { groups, ...dataWithoutGroups } = req.body as any;
    const newGroupIds = Array.isArray(groups) ? groups : [];

    // Normalizar datas antes de atualizar o membro (evita problemas de timezone)
    const normalizedData = normalizeMemberDates(dataWithoutGroups);

    // Verificar email duplicado no update (se fornecido e diferente do atual)
    const emailValidation = await validateEmailUniqueness(normalizedData.email as string, church.id, id);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        error: emailValidation.errorMessage || 'Email já cadastrado',
        details: emailValidation.duplicateMemberName 
          ? `Este email já está sendo usado pelo membro: ${emailValidation.duplicateMemberName}`
          : 'Este email já está cadastrado'
      });
    }

    // Validar que os novos grupos existem e pertencem à igreja (se fornecidos)
    const groupsValidation = await validateGroups(newGroupIds, church.id);
    if (!groupsValidation.isValid) {
      return res.status(400).json({
        error: 'Erro ao validar grupos',
        details: groupsValidation.errorMessage || 'Um ou mais grupos são inválidos'
      });
    }

    // ====================
    // INÍCIO DA TRANSAÇÃO LÓGICA
    // ====================

    // PASSO 1: Atualiza o membro
    const updateData = {
      ...normalizedData,
      // Garantir que children seja um array JSON válido
      children: normalizedData.children !== undefined 
        ? (Array.isArray(normalizedData.children) ? normalizedData.children : [])
        : undefined
    };

    const { data: member, error: memberError } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', church.id)
      .select()
      .single();

    if (memberError) {
      return res.status(400).json({
        error: 'Erro ao atualizar membro',
        details: memberError.message
      });
    }

    memberUpdated = true; // Marcador para rollback

    // PASSO 1.5: Se o membro foi inativado, remover de eventos futuros de calendário
    if (existingMember.active === true && member.active === false) {
      debug(`Membro ${member.name} foi inativado. Removendo de eventos futuros...`);
      
      // Buscar participações futuras do membro em eventos
      const now = new Date().toISOString();
      
      const { data: futureParticipations, error: participationsError } = await supabase
        .from('calendar_participants')
        .select(`
          id,
          calendar_item_id,
          calendar_items!inner (
            start_date
          )
        `)
        .eq('member_id', id)
        .gte('calendar_items.start_date', now);

      if (participationsError) {
        logError('Erro ao buscar participações futuras:', participationsError);
        // Não falhar a operação, apenas logar o erro
      } else if (futureParticipations && futureParticipations.length > 0) {
        const participationIds = futureParticipations.map(p => p.id);
        
        const { error: removeParticipationsError } = await supabase
          .from('calendar_participants')
          .delete()
          .in('id', participationIds);

        if (removeParticipationsError) {
          logError('Erro ao remover participações futuras:', removeParticipationsError);
          // Não falhar a operação, apenas logar o erro
        } else {
          debug(`${futureParticipations.length} participação(ões) futura(s) removida(s)`);
        }
      } else {
        debug('Nenhuma participação futura encontrada');
      }
    }

    // PASSO 2: Gerenciar grupos (adicionar novos e remover antigos)
    // Calcular diferenças
    groupsAdded = newGroupIds.filter(gid => !previousGroups.includes(gid));
    groupsRemoved = previousGroups.filter(gid => !newGroupIds.includes(gid));

    // Remover grupos antigos
    if (groupsRemoved.length > 0) {
      const { error: removeError } = await supabase
        .from('member_groups')
        .delete()
        .eq('member_id', id)
        .in('group_id', groupsRemoved);

      if (removeError) {
        // ❌ ROLLBACK: Reverter atualização do membro
        logError('Erro ao remover grupos, fazendo rollback...', removeError);
        
        await supabase
          .from('members')
          .update(previousMemberData)
          .eq('id', id);

        return res.status(400).json({
          error: 'Erro ao remover membro dos grupos',
          details: removeError.message,
          rollback: 'Alterações do membro foram revertidas'
        });
      }
    }

    // Adicionar novos grupos
    if (groupsAdded.length > 0) {
      const memberGroupsData = groupsAdded.map(groupId => ({
        member_id: id,
        group_id: groupId
      }));

      const { error: addError } = await supabase
        .from('member_groups')
        .insert(memberGroupsData);

      if (addError) {
        // ❌ ROLLBACK: Reverter tudo (membro + grupos removidos)
        logError('Erro ao adicionar grupos, fazendo rollback completo...', addError);
        
        // Reverter membro
        await supabase
          .from('members')
          .update(previousMemberData)
          .eq('id', id);

        // Re-adicionar grupos que foram removidos
        if (groupsRemoved.length > 0) {
          const reAddGroupsData = groupsRemoved.map(groupId => ({
            member_id: id,
            group_id: groupId
          }));
          
          await supabase
            .from('member_groups')
            .insert(reAddGroupsData);
        }

        return res.status(400).json({
          error: 'Erro ao adicionar membro aos grupos',
          details: addError.message,
          rollback: 'Todas as alterações foram revertidas'
        });
      }
    }

    // ====================
    // FIM DA TRANSAÇÃO LÓGICA - SUCESSO!
    // ====================

    // Log da operação de atualização
    await logAudit(req, {
      entity: 'member',
      entityId: member.id,
      action: 'update',
      changesBefore: existingMember,
      changesAfter: { ...member, groups: newGroupIds }
    });

    debug(`Membro atualizado com sucesso. Grupos adicionados: ${groupsAdded.length}, removidos: ${groupsRemoved.length}`);

    res.json(member);

  } catch (error) {
    // ❌ ROLLBACK: Se houver erro inesperado, reverter tudo
    if (memberUpdated && previousMemberData) {
      logError('Erro inesperado, fazendo rollback completo...', error);
      
      try {
        // Reverter membro
        await supabase
          .from('members')
          .update(previousMemberData)
          .eq('id', req.params.id);

        // Reverter grupos adicionados
        if (groupsAdded.length > 0) {
          await supabase
            .from('member_groups')
            .delete()
            .eq('member_id', req.params.id)
            .in('group_id', groupsAdded);
        }

        // Re-adicionar grupos removidos
        if (groupsRemoved.length > 0) {
          const reAddGroupsData = groupsRemoved.map(groupId => ({
            member_id: req.params.id,
            group_id: groupId
          }));
          
          await supabase
            .from('member_groups')
            .insert(reAddGroupsData);
        }

        debug('Rollback completo concluído');
      } catch (rollbackError) {
        logError('Erro ao fazer rollback:', rollbackError);
      }
    }

    logError('Erro ao atualizar membro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Remove um membro permanentemente
 */
export const deleteMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    // Primeiro busca a igreja do usuário
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

    // Verifica se o membro pertence a esta igreja e busca dados atuais
    const { data: existingMember, error: checkError } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (checkError || !existingMember) {
      return res.status(404).json({
        error: 'Membro não encontrado',
        details: 'Não foi possível encontrar o membro solicitado'
      });
    }

    // Remove o membro permanentemente
    const { error: memberError } = await supabase
      .from('members')
      .delete()
      .eq('id', id)
      .eq('church_id', church.id);

    if (memberError) {
      return res.status(400).json({
        error: 'Erro ao remover membro',
        details: memberError.message
      });
    }

    // Log da operação de exclusão
    await logAudit(req, {
      entity: 'member',
      entityId: existingMember.id,
      action: 'delete',
      changesBefore: existingMember
    });

    res.json({
      message: 'Membro removido com sucesso'
    });

  } catch (error) {
    logError('Erro ao remover membro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Cria múltiplos membros de uma vez
 */
export const createBatchMembers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Primeiro busca a igreja do usuário
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

    const members = req.body;

    if (!Array.isArray(members)) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: 'O corpo da requisição deve ser um array de membros'
      });
    }

    // Verificar limite de membros do plano (criação em massa - tudo ou nada)
    const limitCheck = await checkMemberLimit(church.id, members.length);
    if (!limitCheck.canAdd) {
      return res.status(403).json({
        error: 'Limite de membros atingido',
        details: limitCheck.message || 'Não é possível adicionar esta quantidade de membros',
        currentCount: limitCheck.currentCount,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining,
        requested: members.length,
        planType: limitCheck.planType,
      });
    }

    // Processa cada membro para adicionar o church_id, normalizar datas e garantir que active seja true
    const membersWithChurchId = members.map(member => {
      const normalized = normalizeMemberDates(member);
      return {
        ...normalized,
        church_id: church.id,
        active: true
      };
    });

    // Insere os membros em lote
    const { data, error: insertError } = await supabase
      .from('members')
      .insert(membersWithChurchId)
      .select();

    if (insertError) {
      logError('Erro ao inserir membros:', insertError);
      return res.status(500).json({
        error: 'Erro ao criar membros',
        details: insertError.message
      });
    }

    res.status(201).json({
      message: 'Membros criados com sucesso',
      count: members.length,
      data
    });

  } catch (error) {
    logError('Erro ao criar membros em lote:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Gera relatórios agregados dos membros
 * 
 * @param req - Request com query parameters para filtros
 * @param res - Response com dados agregados de relatórios
 * 
 * @remarks
 * - Valida todos os filtros usando Joi
 * - Processa dados em lotes para melhor performance
 * - Valida que congregation_id pertence à igreja do usuário
 * - Registra operação no audit log
 */
export const getMemberReports = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Validar filtros usando Joi
    const { error: validationError, value: validatedFilters } = reportFiltersSchema.validate(req.query, {
      allowUnknown: false,
      stripUnknown: true
    });

    if (validationError) {
      return res.status(400).json({
        error: 'Filtros inválidos',
        details: validationError.details[0]?.message || 'Erro na validação dos filtros'
      });
    }

    // Parâmetros de filtro (já validados)
    const congregation_id = (validatedFilters.congregation_id as string) || '';

    // Primeiro busca a igreja do usuário
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

    // Constrói a query base
    let query = supabase
      .from('members')
      .select(`
        *,
        roles (
          id,
          name,
          description
        ),
        congregations (
          id,
          name,
          address,
          city,
          state,
          leader,
          phone
        )
      `)
      .eq('church_id', church.id);

    // Aplica filtro por congregação
    if (congregation_id) {
      if (congregation_id === 'sede') {
        // Filtrar membros sem congregação (congregation_id IS NULL)
        query = query.is('congregation_id', null);
      } else {
        // Filtrar por congregação específica
        query = query.eq('congregation_id', congregation_id);
      }
    }

    // Buscar contagem total primeiro (mais eficiente)
    let countQuery = supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('church_id', church.id);

    // Aplicar filtro de congregação na contagem
    if (congregation_id) {
      if (congregation_id === 'sede') {
        countQuery = countQuery.is('congregation_id', null);
      } else {
        countQuery = countQuery.eq('congregation_id', congregation_id);
      }
    }

    const { count: totalCount, error: countError } = await countQuery;
    
    if (countError) {
      logError('Erro ao contar membros:', countError);
      return res.status(500).json({
        error: 'Erro ao contar membros',
        details: countError.message
      });
    }

    const totalMembers = totalCount || 0;

    // Processar membros em lotes para evitar problemas de memória
    // Para igrejas grandes (>5000 membros), processar em chunks de 1000
    // Para igrejas menores, buscar todos de uma vez (mais eficiente)
    const CHUNK_SIZE = 1000;
    const allMembers: any[] = [];

    if (totalMembers > 5000) {
      // Processar em lotes para igrejas grandes
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        // Recriar query base para cada chunk (Supabase queries são imutáveis)
        let chunkQuery = supabase
          .from('members')
          .select(`
            *,
            roles (
              id,
              name,
              description
            ),
            congregations (
              id,
              name,
              address,
              city,
              state,
              leader,
              phone
            )
          `)
          .eq('church_id', church.id)
          .range(offset, offset + CHUNK_SIZE - 1);

        // Reaplicar filtro de congregação
        if (congregation_id) {
          if (congregation_id === 'sede') {
            chunkQuery = chunkQuery.is('congregation_id', null);
          } else {
            chunkQuery = chunkQuery.eq('congregation_id', congregation_id);
          }
        }

        const { data: chunk, error: chunkError } = await chunkQuery;

        if (chunkError) {
          logError('Erro ao buscar chunk de membros:', chunkError);
          return res.status(500).json({
            error: 'Erro ao buscar membros',
            details: chunkError.message
          });
        }

        if (chunk && chunk.length > 0) {
          allMembers.push(...chunk);
          offset += CHUNK_SIZE;
          hasMore = chunk.length === CHUNK_SIZE;
        } else {
          hasMore = false;
        }
      }
    } else {
      // Para igrejas menores, buscar todos de uma vez (mais eficiente)
      const { data: membersData, error: membersError } = await query;

      if (membersError) {
        logError('Erro ao buscar membros:', membersError);
        return res.status(500).json({
          error: 'Erro ao buscar membros',
          details: membersError.message
        });
      }

      if (membersData) {
        allMembers.push(...membersData);
      }
    }

    // Calcula estatísticas gerais
    const activeMembers = allMembers.filter(m => m.active).length;
    const inactiveMembers = totalMembers - activeMembers;

    // Filtrar apenas membros ativos para dados demográficos
    const activeMembersOnly = allMembers.filter(m => m.active);

    // Estatísticas por gênero (apenas membros ativos)
    // Ordenado alfabeticamente por chave para consistência
    const genderStats = activeMembersOnly.reduce((acc, member) => {
      const gender = member.gender || 'Não informado';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const genderStatsSorted = Object.fromEntries(
      Object.entries(genderStats).sort(([a], [b]) => a.localeCompare(b))
    );

    // Estatísticas por estado civil (apenas membros ativos)
    // Ordenado alfabeticamente por chave para consistência
    const maritalStats = activeMembersOnly.reduce((acc, member) => {
      const status = member.marital_status || 'Não informado';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const maritalStatsSorted = Object.fromEntries(
      Object.entries(maritalStats).sort(([a], [b]) => a.localeCompare(b))
    );

    // Estatísticas por cargo (apenas membros ativos)
    const roleStats = activeMembersOnly.reduce((acc, member) => {
      const roleName = member.roles?.name || 'Sem cargo';
      const roleId = member.roles?.id || null;
      
      if (!acc[roleName]) {
        acc[roleName] = { count: 0, id: roleId };
      }
      acc[roleName].count++;
      return acc;
    }, {} as Record<string, { count: number; id: string | null }>);


    // Estatísticas por congregação (apenas membros ativos)
    const congregationStats = activeMembersOnly.reduce((acc, member) => {
      const congregationName = member.congregations?.name || 'Sem congregação';
      const congregationId = member.congregations?.id || null;
      
      if (!acc[congregationName]) {
        acc[congregationName] = { count: 0, id: congregationId };
      }
      acc[congregationName].count++;
      return acc;
    }, {} as Record<string, { count: number; id: string | null }>);


    // Estatísticas por cidade (apenas membros ativos)
    // Ordenado alfabeticamente por chave para consistência
    const cityStats = activeMembersOnly.reduce((acc, member) => {
      const city = member.city || 'Não informado';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const cityStatsSorted = Object.fromEntries(
      Object.entries(cityStats).sort(([a], [b]) => a.localeCompare(b))
    );

    // Estatísticas por estado (apenas membros ativos)
    // Ordenado alfabeticamente por chave para consistência
    const stateStats = activeMembersOnly.reduce((acc, member) => {
      const state = member.state || 'Não informado';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const stateStatsSorted = Object.fromEntries(
      Object.entries(stateStats).sort(([a], [b]) => a.localeCompare(b))
    );

    // Análise de faixa etária (apenas membros ativos)
    const ageRanges = {
      '0-12': 0,
      '13-17': 0,
      '18-25': 0,
      '26-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0
    };

    // Usar função utilitária para cálculo correto de idade (considera timezone)
    const { calculateAge } = require('../utils/ageCalculator');
    
    activeMembersOnly.forEach(member => {
      const actualAge = calculateAge(member.birth);
      
      if (actualAge !== null) {
        if (actualAge <= 12) ageRanges['0-12']++;
        else if (actualAge <= 17) ageRanges['13-17']++;
        else if (actualAge <= 25) ageRanges['18-25']++;
        else if (actualAge <= 35) ageRanges['26-35']++;
        else if (actualAge <= 50) ageRanges['36-50']++;
        else if (actualAge <= 65) ageRanges['51-65']++;
        else ageRanges['65+']++;
      }
    });

    // Análise de batismos por período (membros com admission = "Batismo" ou "Batismo Infantil")
    const baptismByYear = allMembers.reduce((acc, member) => {
      if ((member.admission === 'Batismo' || member.admission === 'Batismo Infantil') && member.admission_date) {
        const year = new Date(member.admission_date).getFullYear();
        acc[year] = (acc[year] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Análise de admissões por período (membros com admission diferente de "Batismo" e "Batismo Infantil")
    const admissionByYear = allMembers.reduce((acc, member) => {
      if (member.admission && member.admission !== 'Batismo' && member.admission !== 'Batismo Infantil' && member.admission_date) {
        const year = new Date(member.admission_date).getFullYear();
        acc[year] = (acc[year] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Análise de batismos por mês (membros com admission = "Batismo" ou "Batismo Infantil")
    const baptismByMonth = allMembers.reduce((acc, member) => {
      if ((member.admission === 'Batismo' || member.admission === 'Batismo Infantil') && member.admission_date) {
        const date = new Date(member.admission_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const key = `${year}-${month}`;
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Análise de admissões por mês (membros com admission diferente de "Batismo" e "Batismo Infantil")
    const admissionByMonth = allMembers.reduce((acc, member) => {
      if (member.admission && member.admission !== 'Batismo' && member.admission !== 'Batismo Infantil' && member.admission_date) {
        const date = new Date(member.admission_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const key = `${year}-${month}`;
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Formatar todos os membros para manter compatibilidade com o frontend
    const formattedMembers = allMembers.map(member => ({
      ...member,
      role: member.roles,
      congregation: member.congregations,
      roles: undefined,
      congregations: undefined
    }));

    // Membros por ano (batizados ou admitidos)
    const membersByYear = formattedMembers.reduce((acc, member) => {
      if (!member.admission_date) return acc;
      
      const admissionYear = new Date(member.admission_date).getFullYear();
      
      // Adiciona o membro ao ano da admissão (seja batismo ou outro tipo)
      if (!acc[admissionYear]) acc[admissionYear] = [];
      acc[admissionYear].push(member);
      
      return acc;
    }, {} as Record<string, any[]>);

    // Membros por mês (batizados ou admitidos)
    const membersByMonth = formattedMembers.reduce((acc, member) => {
      if (!member.admission_date) return acc;
      
      // Adiciona o membro ao mês da admissão (seja batismo ou outro tipo)
      const admissionDate = new Date(member.admission_date);
      const year = admissionDate.getFullYear();
      const month = String(admissionDate.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(member);
      
      return acc;
    }, {} as Record<string, any[]>);

    // Top 10 ocupações
    const occupationStats = allMembers.reduce((acc, member) => {
      const occupation = member.occupation || 'Não informado';
      acc[occupation] = (acc[occupation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topOccupations = Object.entries(occupationStats)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([occupation, count]) => ({ occupation, count }));

    // Membros admitidos no ano atual
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1); // 1º de janeiro do ano atual
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999); // 31 de dezembro do ano atual
    
    const recentMembers = allMembers.filter(member => {
      if (!member.admission_date) return false;
      const admissionDate = new Date(member.admission_date);
      return admissionDate >= yearStart && admissionDate <= yearEnd;
    }).length;

    // Membros batizados recentemente (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentBaptisms = allMembers.filter(member => {
      if ((member.admission !== 'Batismo' && member.admission !== 'Batismo Infantil') || !member.admission_date) return false;
      return new Date(member.admission_date) >= thirtyDaysAgo;
    }).length;

    const integrationSelect = `
      id,
      name,
      status,
      created_at,
      expected_congregation:congregations!integration_members_expected_congregation_id_fkey (
        id,
        name
      ),
      mentor:members!integration_members_mentor_id_fkey (
        id,
        name
      )
    `;

    let integrationQuery = supabase
      .from('integration_members')
      .select(integrationSelect)
      .eq('church_id', church.id);

    if (congregation_id) {
      if (congregation_id === 'sede') {
        integrationQuery = integrationQuery.is('expected_congregation_id', null);
      } else {
        integrationQuery = integrationQuery.eq('expected_congregation_id', congregation_id);
      }
    }

    const {
      data: integrationData,
      error: integrationError
    } = await integrationQuery;

    if (integrationError) {
      logError('Erro ao buscar integrantes de integração:', integrationError);
      return res.status(500).json({
        error: 'Erro ao buscar dados de integração',
        details: integrationError.message
      });
    }

    interface IntegrationStatusCounts {
      inProgress: number;
      integrated: number;
      discarded: number;
    }

    interface IntegrationMemberSummary {
      id: string;
      name: string;
      status: string;
      created_at: string;
      expected_congregation?: { id: string; name: string | null } | null;
      mentor?: { id: string; name: string | null } | null;
    }

    const createEmptyCounts = (): IntegrationStatusCounts => ({
      inProgress: 0,
      integrated: 0,
      discarded: 0
    });

    const ensureCounts = (
      collection: Record<string, IntegrationStatusCounts>,
      key: string
    ) => {
      if (!collection[key]) {
        collection[key] = createEmptyCounts();
      }
      return collection[key];
    };

    const statusMap = {
      em_progresso: 'inProgress',
      integrado: 'integrated',
      descartado: 'discarded'
    } as const;

    const integrationTotals: IntegrationStatusCounts = createEmptyCounts();
    const integrationTotalsByYear: Record<string, IntegrationStatusCounts> = {};
    const integrationTotalsByMonth: Record<string, IntegrationStatusCounts> = {};
    const integrationMembersByYear: Record<string, IntegrationMemberSummary[]> = {};
    const integrationMembersByMonth: Record<string, IntegrationMemberSummary[]> = {};

    // Transforma os dados do Supabase (que retorna arrays para relacionamentos) 
    // para o formato esperado (objetos únicos ou null)
    const integrationMembers: IntegrationMemberSummary[] = (integrationData || []).map((member: any) => {
      const expectedCongregation = Array.isArray(member.expected_congregation) 
        ? (member.expected_congregation[0] || null)
        : (member.expected_congregation || null);
      
      const mentor = Array.isArray(member.mentor)
        ? (member.mentor[0] || null)
        : (member.mentor || null);

      return {
        id: member.id,
        name: member.name,
        status: member.status,
        created_at: member.created_at,
        expected_congregation: expectedCongregation,
        mentor: mentor
      } as IntegrationMemberSummary;
    });

    integrationMembers.forEach(member => {
      if (!member.created_at) {
        return;
      }

      const createdAt = new Date(member.created_at);

      if (Number.isNaN(createdAt.getTime())) {
        return;
      }

      const year = createdAt.getFullYear().toString();
      const month = String(createdAt.getMonth() + 1).padStart(2, '0');
      const yearMonthKey = `${year}-${month}`;

      const statusKey =
        statusMap[member.status as keyof typeof statusMap] ?? 'inProgress';

      integrationTotals[statusKey] += 1;
      ensureCounts(integrationTotalsByYear, year)[statusKey] += 1;
      ensureCounts(integrationTotalsByMonth, yearMonthKey)[statusKey] += 1;

      const summary: IntegrationMemberSummary = {
        id: member.id,
        name: member.name,
        status: member.status,
        created_at: member.created_at,
        expected_congregation: member.expected_congregation || null,
        mentor: member.mentor || null
      };

      if (!integrationMembersByYear[year]) {
        integrationMembersByYear[year] = [];
      }
      integrationMembersByYear[year].push(summary);

      if (!integrationMembersByMonth[yearMonthKey]) {
        integrationMembersByMonth[yearMonthKey] = [];
      }
      integrationMembersByMonth[yearMonthKey].push(summary);
    });

    const sortByCreatedDesc = (list: IntegrationMemberSummary[]) => {
      return list.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
    };

    Object.keys(integrationMembersByYear).forEach(year => {
      integrationMembersByYear[year] = sortByCreatedDesc(integrationMembersByYear[year]);
    });

    Object.keys(integrationMembersByMonth).forEach(yearMonth => {
      integrationMembersByMonth[yearMonth] = sortByCreatedDesc(integrationMembersByMonth[yearMonth]);
    });

    res.json({
      summary: {
        totalMembers,
        activeMembers,
        inactiveMembers,
        recentMembers,
        recentBaptisms,
        activePercentage: totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0
      },
      demographics: {
        gender: genderStatsSorted,
        maritalStatus: maritalStatsSorted,
        ageRanges,
        cities: cityStatsSorted,
        states: stateStatsSorted
      },
      churchStructure: {
        roles: roleStats,
        congregations: congregationStats
      },
      timeline: {
        baptismsByYear: baptismByYear,
        admissionsByYear: admissionByYear,
        baptismsByMonth: baptismByMonth,
        admissionsByMonth: admissionByMonth,
        membersByYear: membersByYear,
        membersByMonth: membersByMonth
      },
      integration: {
        totals: {
          ...integrationTotals,
          total: integrationMembers.length
        },
        timeline: {
          totalsByYear: integrationTotalsByYear,
          totalsByMonth: integrationTotalsByMonth,
          membersByYear: integrationMembersByYear,
          membersByMonth: integrationMembersByMonth
        }
      },
      topOccupations,
      filters: {
        congregation_id: congregation_id || null
      },
      generatedAt: new Date().toISOString()
    });

    // Log da operação de geração de relatório
    await logAudit(req, {
      entity: 'member',
      entityId: null,
      action: 'import', // Usar 'import' como ação genérica para relatórios
      changesAfter: {
        filters: validatedFilters,
        summary: {
          totalMembers,
          activeMembers,
          inactiveMembers
        }
      }
    });

  } catch (error) {
    logError('Erro ao gerar relatório:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Retorna a contagem de aniversariantes em um mês específico
 */
export const getBirthdaysCount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Parâmetros de filtro (mês, ano e congregação)
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1; // 1-12
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const congregationId = req.query.congregation_id as string | undefined;

    // Validar mês
    if (month < 1 || month > 12) {
      return res.status(400).json({
        error: 'Parâmetro inválido',
        details: 'O mês deve estar entre 1 e 12'
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

    // Buscar todos os membros ativos da igreja com data de nascimento
    let query = supabase
      .from('members')
      .select('id, name, birth')
      .eq('church_id', church.id)
      .eq('active', true)
      .not('birth', 'is', null);

    // Aplicar filtro de congregação se fornecido
    if (congregationId) {
      if (congregationId === 'sede') {
        // "sede" representa membros sem congregação (congregation_id = null)
        query = query.is('congregation_id', null);
      } else {
        // Filtrar por UUID da congregação específica
        query = query.eq('congregation_id', congregationId);
      }
    }

    const { data: members, error: membersError } = await query;

    if (membersError) {
      logError('Erro ao buscar membros:', membersError);
      return res.status(500).json({
        error: 'Erro ao buscar membros',
        details: membersError.message
      });
    }

    debug(`Total de membros ativos com data de nascimento: ${members.length}`);
    debug(`Buscando aniversariantes do mês ${month}/${year}`);

    // Função auxiliar para extrair mês de uma data "YYYY-MM-DD" (ou ISO)
    const getMonthFromBirth = (birth: unknown): number | null => {
      if (!birth) return null;
      const raw = String(birth);
      const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
      const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      return parseInt(match[2], 10);
    };

    // Filtrar membros que fazem aniversário no mês especificado (sem usar Date() para evitar timezone)
    const birthdaysInMonth = (members || []).filter(member => {
      const birthMonth = getMonthFromBirth(member.birth);
      if (!birthMonth) return false;
      if (birthMonth === month) {
        debug(`Aniversariante encontrado: ${member.name} - ${member.birth}`);
      }
      return birthMonth === month;
    });

    debug(`Aniversariantes no mês ${month}: ${birthdaysInMonth.length}`);

    res.json({
      count: birthdaysInMonth.length,
      month,
      year
    });

  } catch (error) {
    logError('Erro ao buscar aniversariantes:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Retorna a lista completa de aniversariantes em um mês específico
 */
export const getBirthdaysList = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Parâmetros de filtro (mês, ano e congregação)
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1; // 1-12
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const congregationId = req.query.congregation_id as string | undefined;

    // Validar mês
    if (month < 1 || month > 12) {
      return res.status(400).json({
        error: 'Parâmetro inválido',
        details: 'O mês deve estar entre 1 e 12'
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

    // Buscar todos os membros ativos da igreja com data de nascimento
    let query = supabase
      .from('members')
      .select(`
        id,
        name,
        birth,
        phone,
        whatsapp,
        email,
        congregations (
          id,
          name
        )
      `)
      .eq('church_id', church.id)
      .eq('active', true)
      .not('birth', 'is', null);

    // Aplicar filtro de congregação se fornecido
    if (congregationId) {
      if (congregationId === 'sede') {
        // "sede" representa membros sem congregação (congregation_id = null)
        query = query.is('congregation_id', null);
      } else {
        // Filtrar por UUID da congregação específica
        query = query.eq('congregation_id', congregationId);
      }
    }

    const { data: members, error: membersError } = await query;

    if (membersError) {
      logError('Erro ao buscar membros:', membersError);
      return res.status(500).json({
        error: 'Erro ao buscar membros',
        details: membersError.message
      });
    }

    // Função auxiliar para extrair dia e mês de uma data "YYYY-MM-DD" (ou ISO)
    const getDayMonthFromBirth = (birth: unknown): { day: number; month: number } | null => {
      if (!birth) return null;
      const raw = String(birth);
      const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
      const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return null;
      const day = parseInt(match[3], 10);
      const month = parseInt(match[2], 10);
      return { day, month };
    };

    // Filtrar e mapear membros que fazem aniversário no mês especificado (sem usar Date() para evitar timezone)
    const birthdaysInMonth = (members || [])
      .reduce<Array<{
        id: string;
        name: string;
        birth: string;
        birthDay: number;
        birthMonth: number;
        phone?: string | null;
        whatsapp?: string | null;
        email?: string | null;
        congregation?: any;
      }>>((acc, member) => {
        const dm = getDayMonthFromBirth(member.birth);
        if (!dm || dm.month !== month) return acc;

        acc.push({
          id: member.id as string,
          name: member.name as string,
          birth: member.birth as string,
          birthDay: dm.day,
          birthMonth: dm.month,
          phone: member.phone as string | null | undefined,
          whatsapp: member.whatsapp as string | null | undefined,
          email: member.email as string | null | undefined,
          congregation: Array.isArray(member.congregations) 
            ? member.congregations[0] 
            : member.congregations
        });

        return acc;
      }, [])
      .sort((a, b) => a.birthDay - b.birthDay); // Ordenar por dia do mês

    res.json({
      data: birthdaysInMonth,
      count: birthdaysInMonth.length,
      month,
      year
    });

  } catch (error) {
    logError('Erro ao buscar lista de aniversariantes:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}; 