import { Response } from 'express';
import supabase from '../services/supabase';
import { AuthRequest, IntegrationMember, Member } from '../types';
import { validateIntegrationMember } from '../validators/integrationMemberValidator';
import { validateMember } from '../validators/memberValidator';
import { logAudit } from '../utils/auditLogger';
import { normalizeMemberDates } from '../utils/dateNormalizer';
import { checkMemberLimit } from '../utils/planLimits';

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

const getChurchByUser = async (userId: string) => {
  return supabase
    .from('churches')
    .select('id')
    .eq('user_id', userId)
    .single();
};

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

export const listIntegrationMembers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const page = parseInt(req.query.page as string, 10) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string, 10) || DEFAULT_LIMIT;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const expected_congregation_id = (req.query.expected_congregation_id as string) || '';
    const mentor_id = (req.query.mentor_id as string) || '';
    const sort_by = (req.query.sort_by as string) || 'created_at';
    const sort_order = (req.query.sort_order as 'asc' | 'desc') || 'desc';

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        error: 'Dados de paginação inválidos',
        details: 'Página deve ser maior que 0 e limite entre 1 e 100'
      });
    }

    const { data: church, error: churchError } = await getChurchByUser(req.user.id);

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    const offset = (page - 1) * limit;

    let query = supabase
      .from('integration_members')
      .select(selectIntegrationMember, { count: 'exact' })
      .eq('church_id', church.id);

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
    console.error('Erro ao listar integrantes:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const getIntegrationMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const { data: church, error: churchError } = await getChurchByUser(req.user.id);

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    const { data, error } = await supabase
      .from('integration_members')
      .select(selectIntegrationMember)
      .eq('id', id)
      .eq('church_id', church.id)
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
    console.error('Erro ao buscar integrante:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const createIntegrationMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { error: validationError, value } = validateIntegrationMember(req.body);

    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    const { data: church, error: churchError } = await getChurchByUser(req.user.id);

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    const payload: Partial<IntegrationMember> = {
      ...value,
      church_id: church.id,
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
    console.error('Erro ao criar integrante:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const updateIntegrationMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
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

    const { data: church, error: churchError } = await getChurchByUser(req.user.id);

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('integration_members')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        error: 'Integrante não encontrado',
        details: 'Não foi possível encontrar o integrante solicitado'
      });
    }

    const updatePayload: Partial<IntegrationMember> = {
      ...value,
      expected_congregation_id: value.expected_congregation_id || null,
      mentor_id: value.mentor_id || null,
      notes: value.notes ?? null
    };

    const { data, error } = await supabase
      .from('integration_members')
      .update(updatePayload)
      .eq('id', id)
      .eq('church_id', church.id)
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
    console.error('Erro ao atualizar integrante:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const deleteIntegrationMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const { data: church, error: churchError } = await getChurchByUser(req.user.id);

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('integration_members')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
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
      .eq('church_id', church.id);

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
    console.error('Erro ao descartar integrante:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const convertIntegrationMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const { data: church, error: churchError } = await getChurchByUser(req.user.id);

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    const { data: integrationMember, error: fetchError } = await supabase
      .from('integration_members')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
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

    // Montar payload base do membro a partir do integrante + dados enviados
    const baseMemberPayload: Partial<Member> = {
      ...req.body,
      name: integrationMember.name,
      birth: integrationMember.birth ?? req.body.birth,
      gender: req.body.gender ?? mapGenderToMember(integrationMember.gender),
      marital_status: req.body.marital_status ?? mapMaritalStatusToMember(integrationMember.marital_status),
      phone: req.body.phone ?? integrationMember.phone,
      whatsapp: req.body.whatsapp ?? integrationMember.whatsapp,
      admission: req.body.admission ?? mapAdmissionTypeToMember(integrationMember.expected_admission_type),
      congregation_id: req.body.congregation_id ?? integrationMember.expected_congregation_id,
      role_id: req.body.role_id ?? null,
      church_id: church.id,
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

    const { data: updatedIntegrationMember, error: updateError } = await supabase
      .from('integration_members')
      .update({ status: 'integrado' })
      .eq('id', id)
      .eq('church_id', church.id)
      .select(selectIntegrationMember)
      .single();

    if (updateError || !updatedIntegrationMember) {
      return res.status(500).json({
        error: 'Erro ao atualizar integrante',
        details: updateError?.message ?? 'Não foi possível atualizar o status do integrante'
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
    console.error('Erro ao integrar integrante:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

