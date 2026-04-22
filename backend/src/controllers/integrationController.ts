import { Response } from 'express';
import supabase from '../services/supabase';
import { AuthRequest, IntegrationMember, Member } from '../types';
import { validateIntegrationMember } from '../validators/integrationMemberValidator';
import { validateMember } from '../validators/memberValidator';
import { logAudit } from '../utils/auditLogger';
import { normalizeMemberDates } from '../utils/dateNormalizer';
import { checkMemberLimit } from '../utils/planLimits';
import { 
  validateIntegrationMemberData,
  validateCongregation,
  validateMentorAndCongregation,
  validateIntegrationMemberNameUniqueness
} from '../utils/integrationValidations';
import { debug, error as logError } from '../utils/logger';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const selectIntegrationMember = `
  *,
  expected_congregation:congregations!integration_members_expected_congregation_id_fkey (
    id,
    name,
    city,
    state
  ),
  mentor:members!integration_members_mentor_id_fkey (
    id,
    name,
    phone,
    whatsapp
  )
`;

const mapGenderToMember = (gender?: string | null): Member['gender'] | undefined => {
  if (!gender) return undefined;
  if (gender.toLowerCase() === 'masculino') return 'Masculino';
  if (gender.toLowerCase() === 'feminino') return 'Feminino';
  return undefined;
};

const mapMaritalStatusToMember = (status?: string | null): Member['marital_status'] | undefined => {
  if (!status) return undefined;

  switch (status.toLowerCase()) {
    case 'solteiro':
      return 'Solteiro';
    case 'casado':
      return 'Casado';
    case 'divorciado':
      return 'Divorciado';
    case 'viuvo':
      return 'Viúvo';
    case 'outro':
      return 'Outro';
    default:
      return undefined;
  }
};

const mapAdmissionTypeToMember = (admission?: string | null): string | undefined => {
  if (!admission) return undefined;

  switch (admission.toLowerCase()) {
    case 'batismo':
      return 'Batismo';
    case 'transferencia':
      return 'Transferência';
    case 'profissao de fe':
      return 'Profissão de Fé';
    case 'outro':
      return 'Outro';
    default:
      return undefined;
  }
};

/**
 * Lista todos os integrantes da igreja com paginação e filtros
 * 
 * Suporta:
 * - Paginação (page, limit)
 * - Busca geral (nome, telefone, WhatsApp)
 * - Filtros por status, congregação prevista, mentor
 * - Ordenação dinâmica por qualquer campo
 * 
 * @param req - Request com query parameters para filtros e paginação
 * @param res - Response com lista paginada de integrantes
 * @returns JSON com data (integrantes), pagination (metadados), filters (filtros aplicados) e sorting (ordenação)
 */
export const listIntegrationMembers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    if (!req.church) {
      return res.status(403).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não está vinculado a nenhuma igreja'
      });
    }

    const page = parseInt(req.query.page as string, 10) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const expected_congregation_id = (req.query.expected_congregation_id as string) || '';
    const mentor_id = (req.query.mentor_id as string) || '';
    const ALLOWED_SORT_FIELDS = ['created_at', 'updated_at', 'name', 'birth', 'status'] as const;
    const requestedSort = (req.query.sort_by as string) || 'created_at';
    const sort_by = ALLOWED_SORT_FIELDS.includes(requestedSort as typeof ALLOWED_SORT_FIELDS[number])
      ? requestedSort
      : 'created_at';
    const sort_order = (req.query.sort_order as 'asc' | 'desc') || 'desc';

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Dados de paginação inválidos',
        details: 'Página deve ser maior que 0 e limite entre 1 e 100'
      });
    }

    const churchId = req.church.churchId;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('integration_members')
      .select(selectIntegrationMember, { count: 'exact' })
      .eq('church_id', churchId);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,whatsapp.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (expected_congregation_id) {
      if (expected_congregation_id === 'sede') {
        query = query.is('expected_congregation_id', null);
      } else {
        query = query.eq('expected_congregation_id', expected_congregation_id);
      }
    }

    if (mentor_id) {
      query = query.eq('mentor_id', mentor_id);
    }

    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        error: 'Erro ao listar integrantes',
        details: error.message
      });
    }

    const formatted = data?.map(member => ({
      ...member,
      expected_congregation: member.expected_congregation || null,
      mentor: member.mentor || null
    })) ?? [];

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      },
      filters: {
        search: search || null,
        status: status || null,
        expected_congregation_id: expected_congregation_id || null,
        mentor_id: mentor_id || null
      },
      sorting: {
        sort_by,
        sort_order
      }
    });
  } catch (error) {
    logError('Erro ao listar integrantes:', error);
    res.status(500).json({
      error: 'Erro ao buscar lista de integrantes',
      details: error instanceof Error ? error.message : 'Não foi possível carregar a lista de integrantes. Tente novamente.'
    });
  }
};

/**
 * Busca um integrante específico por ID
 * 
 * Retorna dados completos do integrante incluindo:
 * - Informações pessoais
 * - Congregação prevista
 * - Mentor/Responsável
 * 
 * @param req - Request com integration member ID nos params
 * @param res - Response com dados completos do integrante
 * @returns JSON com objeto IntegrationMember completo
 */
export const getIntegrationMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    if (!req.church) {
      return res.status(403).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não está vinculado a nenhuma igreja'
      });
    }

    const { id } = req.params;
    const churchId = req.church.churchId;

    const { data, error } = await supabase
      .from('integration_members')
      .select(selectIntegrationMember)
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Integrante não encontrado',
        details: 'Não foi possível encontrar o integrante solicitado'
      });
    }

    res.json({
      ...data,
      expected_congregation: data.expected_congregation || null,
      mentor: data.mentor || null
    });
  } catch (error) {
    logError('Erro ao buscar integrante:', error);
    res.status(500).json({
      error: 'Erro ao carregar dados do integrante',
      details: error instanceof Error ? error.message : 'Não foi possível carregar os dados do integrante. Tente novamente.'
    });
  }
};

/**
 * Cria um novo integrante
 * 
 * Processo:
 * 1. Valida dados do integrante
 * 2. Valida congregação prevista
 * 3. Valida mentor e associação com congregação
 * 4. Verifica duplicidade de nome
 * 5. Normaliza datas
 * 6. Cria integrante
 * 7. Registra auditoria
 * 
 * @param req - Request com dados do integrante no body
 * @param res - Response com integrante criado
 * @returns JSON com objeto IntegrationMember criado (status 201) ou erro
 */
export const createIntegrationMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    if (!req.church) {
      return res.status(403).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não está vinculado a nenhuma igreja'
      });
    }

    const { error: validationError, value } = validateIntegrationMember(req.body);

    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    const churchId = req.church.churchId;

    // Validar todos os dados do integrante (congregação, mentor, duplicidade de nome)
    const dataValidation = await validateIntegrationMemberData(value, churchId);
    if (!dataValidation.isValid) {
      const errorTitle = dataValidation.field === 'name' 
        ? 'Nome já cadastrado'
        : dataValidation.field === 'mentor_id'
        ? 'Mentor inválido'
        : 'Congregação inválida';
      
      return res.status(400).json({
        error: errorTitle,
        details: dataValidation.errorMessage || 'Dados inválidos'
      });
    }

    // Normalizar datas antes de criar o integrante (evita problemas de timezone)
    const normalizedData = normalizeMemberDates(value as unknown as Record<string, unknown>);

    const payload: Partial<IntegrationMember> = {
      ...normalizedData,
      church_id: churchId,
      status: value.status ?? 'em_progresso',
      expected_congregation_id: value.expected_congregation_id || null,
      mentor_id: value.mentor_id || null,
      notes: value.notes ?? null
    };

    const { data, error } = await supabase
      .from('integration_members')
      .insert([payload])
      .select(selectIntegrationMember)
      .single();

    if (error || !data) {
      return res.status(400).json({
        error: 'Erro ao criar integrante',
        details: error?.message ?? 'Erro desconhecido ao criar integrante'
      });
    }

    await logAudit(req, {
      entity: 'integration_member',
      entityId: data.id,
      action: 'create',
      changesAfter: data
    });

    res.status(201).json({
      ...data,
      expected_congregation: data.expected_congregation || null,
      mentor: data.mentor || null
    });
  } catch (error) {
    logError('Erro ao criar integrante:', error);
    res.status(500).json({
      error: 'Erro ao cadastrar integrante',
      details: error instanceof Error ? error.message : 'Não foi possível cadastrar o integrante. Verifique os dados e tente novamente.'
    });
  }
};

/**
 * Atualiza um integrante existente
 * 
 * Processo:
 * 1. Valida que integrante existe e pertence à igreja
 * 2. Valida congregação prevista (se fornecida)
 * 3. Valida mentor e associação com congregação (se fornecido)
 * 4. Verifica duplicidade de nome (se nome foi alterado)
 * 5. Normaliza datas
 * 6. Atualiza integrante
 * 7. Registra auditoria
 * 
 * @param req - Request com integration member ID nos params e dados atualizados no body
 * @param res - Response com integrante atualizado
 * @returns JSON com objeto IntegrationMember atualizado ou erro
 */
export const updateIntegrationMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    if (!req.church) {
      return res.status(403).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não está vinculado a nenhuma igreja'
      });
    }

    const { id } = req.params;

    const { error: validationError, value } = validateIntegrationMember(req.body);

    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    const churchId = req.church.churchId;

    const { data: existing, error: fetchError } = await supabase
      .from('integration_members')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        error: 'Integrante não encontrado',
        details: 'Não foi possível encontrar o integrante solicitado'
      });
    }

    // Validar todos os dados do integrante (congregação, mentor, duplicidade de nome)
    // Só verifica duplicidade se o nome foi alterado
    const shouldCheckName = value.name && value.name.trim() !== existing.name.trim();
    const dataValidation = await validateIntegrationMemberData(
      value, 
      churchId, 
      shouldCheckName ? id : undefined
    );
    if (!dataValidation.isValid) {
      const errorTitle = dataValidation.field === 'name' 
        ? 'Nome já cadastrado'
        : dataValidation.field === 'mentor_id'
        ? 'Mentor inválido'
        : 'Congregação inválida';
      
      return res.status(400).json({
        error: errorTitle,
        details: dataValidation.errorMessage || 'Dados inválidos'
      });
    }

    // Normalizar datas antes de atualizar o integrante (evita problemas de timezone)
    const normalizedData = normalizeMemberDates(value as unknown as Record<string, unknown>);

    // Campos anuláveis só são incluídos no payload quando explicitamente presentes no body,
    // evitando que um PUT parcial (ex.: só status) apague mentor, congregação ou notas.
    const bodyKeys = Object.keys(req.body);
    const updatePayload: Partial<IntegrationMember> = { ...normalizedData };
    if (bodyKeys.includes('expected_congregation_id')) {
      updatePayload.expected_congregation_id = value.expected_congregation_id || null;
    }
    if (bodyKeys.includes('mentor_id')) {
      updatePayload.mentor_id = value.mentor_id || null;
    }
    if (bodyKeys.includes('notes')) {
      updatePayload.notes = value.notes ?? null;
    }

    const { data, error } = await supabase
      .from('integration_members')
      .update(updatePayload)
      .eq('id', id)
      .eq('church_id', churchId)
      .select(selectIntegrationMember)
      .single();

    if (error || !data) {
      return res.status(400).json({
        error: 'Erro ao atualizar integrante',
        details: error?.message ?? 'Erro desconhecido ao atualizar integrante'
      });
    }

    await logAudit(req, {
      entity: 'integration_member',
      entityId: data.id,
      action: 'update',
      changesBefore: existing,
      changesAfter: data
    });

    res.json({
      ...data,
      expected_congregation: data.expected_congregation || null,
      mentor: data.mentor || null
    });
  } catch (error) {
    logError('Erro ao atualizar integrante:', error);
    res.status(500).json({
      error: 'Erro ao atualizar integrante',
      details: error instanceof Error ? error.message : 'Não foi possível atualizar os dados do integrante. Tente novamente.'
    });
  }
};

/**
 * Remove permanentemente um integrante
 * 
 * @param req - Request com integration member ID nos params
 * @param res - Response com mensagem de sucesso
 * @returns JSON com mensagem de confirmação ou erro
 */
export const deleteIntegrationMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    if (!req.church) {
      return res.status(403).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não está vinculado a nenhuma igreja'
      });
    }

    const { id } = req.params;
    const churchId = req.church.churchId;

    const { data: existing, error: fetchError } = await supabase
      .from('integration_members')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        error: 'Integrante não encontrado',
        details: 'Não foi possível encontrar o integrante solicitado'
      });
    }

    const { error } = await supabase
      .from('integration_members')
      .delete()
      .eq('id', id)
      .eq('church_id', churchId);

    if (error) {
      return res.status(400).json({
        error: 'Erro ao descartar integrante',
        details: error.message
      });
    }

    await logAudit(req, {
      entity: 'integration_member',
      entityId: existing.id,
      action: 'delete',
      changesBefore: existing
    });

    res.json({
      message: 'Integrante descartado com sucesso'
    });
  } catch (error) {
    logError('Erro ao descartar integrante:', error);
    res.status(500).json({
      error: 'Erro ao remover integrante',
      details: error instanceof Error ? error.message : 'Não foi possível remover o integrante. Tente novamente.'
    });
  }
};

/**
 * Converte um integrante em membro da igreja
 * 
 * Processo:
 * 1. Valida que integrante existe e está em status válido
 * 2. Verifica limite de membros do plano
 * 3. Mapeia dados do integrante para membro
 * 4. Normaliza datas
 * 5. Valida dados do membro
 * 6. Cria membro (TRANSAÇÃO: se falhar ao atualizar status, faz rollback)
 * 7. Atualiza status do integrante para 'integrado'
 * 8. Registra auditoria
 * 
 * @param req - Request com integration member ID nos params e dados do membro no body
 * @param res - Response com membro criado e integrante atualizado
 * @returns JSON com objeto contendo member e integrationMember (status 201) ou erro
 */
export const convertIntegrationMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    if (!req.church) {
      return res.status(403).json({
        error: 'Igreja não encontrada',
        details: 'Usuário não está vinculado a nenhuma igreja'
      });
    }

    const { id } = req.params;
    const churchId = req.church.churchId;

    const { data: integrationMember, error: fetchError } = await supabase
      .from('integration_members')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (fetchError || !integrationMember) {
      return res.status(404).json({
        error: 'Integrante não encontrado',
        details: 'Não foi possível encontrar o integrante solicitado'
      });
    }

    if (integrationMember.status === 'integrado') {
      return res.status(400).json({
        error: 'Integrante já integrado',
        details: 'Este integrante já foi convertido em membro'
      });
    }

    if (integrationMember.status === 'descartado') {
      return res.status(400).json({
        error: 'Integrante descartado',
        details: 'Não é possível integrar um registro descartado'
      });
    }

    // Verificar limite de membros do plano
    const limitCheck = await checkMemberLimit(churchId, 1);
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

    // Montar payload base do membro a partir do integrante + dados enviados (sem grupos)
    const baseMemberPayload: Partial<Member> = {
      ...dataWithoutGroups,
      name: integrationMember.name,
      birth: integrationMember.birth ?? dataWithoutGroups.birth,
      gender: dataWithoutGroups.gender ?? mapGenderToMember(integrationMember.gender),
      marital_status: dataWithoutGroups.marital_status ?? mapMaritalStatusToMember(integrationMember.marital_status),
      phone: dataWithoutGroups.phone ?? integrationMember.phone,
      whatsapp: dataWithoutGroups.whatsapp ?? integrationMember.whatsapp,
      admission: dataWithoutGroups.admission ?? mapAdmissionTypeToMember(integrationMember.expected_admission_type),
      congregation_id: dataWithoutGroups.congregation_id ?? integrationMember.expected_congregation_id,
      church_id: churchId,
      active: true
    };

    // Normalizar datas (birth, baptism_date, admission_date, etc.) para evitar problemas de timezone
    const normalizedMemberPayload = normalizeMemberDates(baseMemberPayload as unknown as Record<string, unknown>) as Partial<Member>;

    const { church_id: _ignoredChurchId, ...payloadForValidation } = normalizedMemberPayload;
    const { error: validationError } = validateMember(payloadForValidation);

    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos para membro',
        details: validationError.details.map(detail => detail.message)
      });
    }

    // ✅ TRANSAÇÃO: Criar membro primeiro
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert([normalizedMemberPayload])
      .select('*')
      .single();

    if (memberError || !member) {
      return res.status(400).json({
        error: 'Erro ao integrar integrante',
        details: memberError?.message ?? 'Erro desconhecido ao criar membro'
      });
    }

    // ✅ TRANSAÇÃO: Associar membro aos grupos (se fornecidos)
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
          error: 'Erro ao integrar integrante',
          details: memberGroupsError.message
        });
      }
    }

    // ✅ TRANSAÇÃO: Atualizar status do integrante (se falhar, fazer rollback)
    const { data: updatedIntegrationMember, error: updateError } = await supabase
      .from('integration_members')
      .update({ status: 'integrado' })
      .eq('id', id)
      .eq('church_id', churchId)
      .select(selectIntegrationMember)
      .single();

    if (updateError || !updatedIntegrationMember) {
      // ✅ ROLLBACK: Se falhar ao atualizar status, deletar o membro criado
      logError('Erro ao atualizar status do integrante, fazendo rollback do membro criado...', updateError);
      const { error: rollbackError } = await supabase
        .from('members')
        .delete()
        .eq('id', member.id);

      if (rollbackError) {
        logError('Erro ao fazer rollback do membro criado:', rollbackError);
      } else {
        debug('Rollback concluído - membro deletado');
      }

      return res.status(500).json({
        error: 'Erro ao atualizar integrante',
        details: updateError?.message ?? 'Não foi possível atualizar o status do integrante. O membro não foi criado.'
      });
    }

    await logAudit(req, {
      entity: 'integration_member',
      entityId: integrationMember.id,
      action: 'convert',
      changesBefore: integrationMember,
      changesAfter: {
        status: 'integrado',
        memberId: member.id
      }
    });

    await logAudit(req, {
      entity: 'member',
      entityId: member.id,
      action: 'create',
      changesAfter: member
    });

    res.status(201).json({
      member,
      integrationMember: updatedIntegrationMember
    });
  } catch (error) {
    logError('Erro ao integrar integrante:', error);
    res.status(500).json({
      error: 'Erro ao converter integrante em membro',
      details: error instanceof Error ? error.message : 'Não foi possível converter o integrante em membro. Verifique os dados e tente novamente.'
    });
  }
};

