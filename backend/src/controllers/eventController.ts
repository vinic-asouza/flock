import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { AuthRequest } from '../types';
import {
  createEventSchema,
  replaceEventOrganizersSchema,
  updateEventSchema,
} from '../validators/eventValidator';
import { logAudit } from '../utils/auditLogger';
import {
  applyScopedCongregationFilter,
  assertCongregationAccess,
  resolveScopedCongregationFilter,
  ScopedCongregationFilter,
} from '../utils/congregationScope';
import {
  validateGroupCongregation,
  validateResponsibleAndCongregation,
} from '../utils/groupValidations';
import { error as logError } from '../utils/logger';
import { buildPagination, parsePageLimit } from '../utils/pagination';
import { computeSpotsRemaining, isEventFull } from '../services/eventCapacity';

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

const ALLOWED_EVENT_SORT_FIELDS = ['starts_at', 'created_at', 'name'] as const;

function parseListIso(raw: unknown): { ok: true; value: string | null } | { ok: false } {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: null };
  const value = String(raw);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { ok: false };
  return { ok: true, value: parsed.toISOString() };
}

/**
 * Escopo de congregação com eventos "todas as congregações" (congregation_id null)
 * visíveis para qualquer filtro, como nos programas de ensino.
 */
function applyEventScope(query: any, scoped: Exclude<ScopedCongregationFilter, { ok: false }>) {
  if (scoped.mode === 'single') {
    return query.or(`congregation_id.is.null,congregation_id.eq.${scoped.congregationId}`);
  }
  return applyScopedCongregationFilter(query, 'congregation_id', scoped);
}

/**
 * Valida o ministério (group_id): mesma igreja; se o evento tem congregação,
 * o ministério deve pertencer a ela.
 */
async function validateEventGroup(
  groupId: string | null | undefined,
  congregationId: string | null | undefined,
  churchId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!groupId) return { ok: true };

  const { data: group, error } = await supabase
    .from('groups')
    .select('id, church_id, congregation_id')
    .eq('id', groupId)
    .eq('church_id', churchId)
    .single();

  if (error || !group) {
    return { ok: false, message: 'Ministério não encontrado ou não pertence a esta igreja' };
  }

  if (congregationId && group.congregation_id && group.congregation_id !== congregationId) {
    return {
      ok: false,
      message: 'O ministério deve pertencer à mesma congregação do evento',
    };
  }

  return { ok: true };
}

async function validateOrganizers(
  organizerIds: string[],
  responsibleId: string,
  churchId: string
): Promise<{ ok: true; uniqueIds: string[] } | { ok: false; message: string }> {
  const uniqueIds = [...new Set(organizerIds.filter(Boolean))];
  if (uniqueIds.includes(responsibleId)) {
    return {
      ok: false,
      message: 'O responsável não pode ser incluído também como organizador',
    };
  }
  if (uniqueIds.length === 0) {
    return { ok: true, uniqueIds: [] };
  }

  const { data: members, error } = await supabase
    .from('members')
    .select('id')
    .eq('church_id', churchId)
    .in('id', uniqueIds);

  if (error) {
    logError('Erro ao validar organizadores:', error);
    return { ok: false, message: 'Não foi possível validar os organizadores' };
  }

  if (!members || members.length !== uniqueIds.length) {
    return {
      ok: false,
      message: 'Um ou mais organizadores não foram encontrados nesta igreja',
    };
  }

  return { ok: true, uniqueIds };
}

async function replaceEventOrganizersRows(eventId: string, organizerIds: string[]) {
  const { error: deleteError } = await supabase
    .from('event_organizers')
    .delete()
    .eq('event_id', eventId);

  if (deleteError) {
    return { error: deleteError };
  }

  if (organizerIds.length === 0) {
    return { error: null };
  }

  const { error: insertError } = await supabase.from('event_organizers').insert(
    organizerIds.map((member_id) => ({ event_id: eventId, member_id }))
  );

  return { error: insertError };
}

async function loadEventOrganizers(eventId: string) {
  const { data, error } = await supabase
    .from('event_organizers')
    .select(
      `
      member_id,
      created_at,
      members (
        id,
        name,
        congregation_id,
        whatsapp,
        phone
      )
    `
    )
    .eq('event_id', eventId);

  if (error) {
    return { organizers: [], error };
  }

  return {
    organizers: (data || []).map((row: any) => ({
      id: row.members?.id || row.member_id,
      name: row.members?.name || '',
      congregation_id: row.members?.congregation_id || null,
    })),
    error: null,
  };
}

async function loadRegistrationCounts(
  eventIds: string[],
  churchId: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (eventIds.length === 0) return counts;

  const { data, error } = await supabase
    .from('event_registrations')
    .select('event_id')
    .eq('church_id', churchId)
    .in('event_id', eventIds);

  if (error) {
    logError('Erro ao contar inscrições dos eventos:', error);
    return counts;
  }

  for (const row of data || []) {
    counts[row.event_id] = (counts[row.event_id] || 0) + 1;
  }
  return counts;
}

const eventSelect = `
  *,
  congregations (
    id,
    name,
    abbreviation
  ),
  groups (
    id,
    name,
    congregation_id
  ),
  members!events_responsible_id_fkey (
    id,
    name,
    congregation_id,
    whatsapp,
    phone
  )
`;

function serializeEvent(row: any, registrationCount: number) {
  const { members: responsible, groups: group, ...rest } = row;
  return {
    ...rest,
    group: group || null,
    responsible: responsible || null,
    registration_count: registrationCount,
    spots_remaining: computeSpotsRemaining(rest.capacity, registrationCount),
    is_full: isEventFull(rest.capacity, registrationCount),
  };
}

export const listEvents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const congregation_id = (req.query.congregation_id as string) || '';
    const status = (req.query.status as string) || '';
    const group_id = (req.query.group_id as string) || '';
    const search = (req.query.search as string) || '';
    const starts_from = parseListIso(req.query.starts_from);
    const starts_to = parseListIso(req.query.starts_to);
    if (!starts_from.ok || !starts_to.ok) {
      return res.status(400).json({
        error: 'Filtro inválido',
        details: 'As datas do filtro devem estar em formato ISO válido',
      });
    }
    if (starts_from.value && starts_to.value && starts_to.value < starts_from.value) {
      return res.status(400).json({
        error: 'Filtro inválido',
        details: 'A data final do filtro deve ser igual ou posterior à data inicial',
      });
    }

    const { page, limit, offset } = parsePageLimit(req.query);
    const sort_by_raw = (req.query.sort_by as string) || 'starts_at';
    const sort_by = ALLOWED_EVENT_SORT_FIELDS.includes(
      sort_by_raw as (typeof ALLOWED_EVENT_SORT_FIELDS)[number]
    )
      ? sort_by_raw
      : 'starts_at';
    const defaultOrder = sort_by === 'name' ? 'asc' : 'desc';
    const sort_order_raw = (req.query.sort_order as string) || defaultOrder;
    const sort_order = sort_order_raw === 'asc' ? 'asc' : 'desc';

    const scoped = resolveScopedCongregationFilter(req.church!, congregation_id, {
      includeNullAsChurchWide: true,
    });
    if (!scoped.ok) {
      return res.status(scoped.status).json({
        error: 'Filtro inválido',
        details: scoped.message,
      });
    }

    let query = supabase
      .from('events')
      .select(eventSelect, { count: 'exact' })
      .eq('church_id', churchId);

    query = applyEventScope(query, scoped);

    if (status) query = query.eq('status', status);
    if (group_id) query = query.eq('group_id', group_id);
    if (search.trim()) query = query.ilike('name', `%${search.trim()}%`);
    if (starts_from.value) query = query.gte('starts_at', starts_from.value);
    if (starts_to.value) query = query.lte('starts_at', starts_to.value);

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;
    if (error) {
      return res.status(400).json({
        error: 'Erro ao buscar eventos',
        details: error.message,
      });
    }

    const pagination = buildPagination(page, limit, count || 0);

    if (!events || events.length === 0) {
      return res.json({ data: [], pagination });
    }

    const eventIds = events.map((e: any) => e.id);
    const { data: organizerRows, error: organizersError } = await supabase
      .from('event_organizers')
      .select('event_id, member_id')
      .in('event_id', eventIds);

    if (organizersError) {
      logError('Erro ao carregar organizadores dos eventos:', organizersError);
      return res.status(500).json({
        error: 'Erro ao carregar eventos',
        details: 'Não foi possível carregar os organizadores dos eventos',
      });
    }

    const organizersByEvent = (organizerRows || []).reduce(
      (acc: Record<string, string[]>, row: { event_id: string; member_id: string }) => {
        if (!acc[row.event_id]) acc[row.event_id] = [];
        acc[row.event_id].push(row.member_id);
        return acc;
      },
      {}
    );

    const counts = await loadRegistrationCounts(eventIds, churchId);

    const data = events.map((event: any) => ({
      ...serializeEvent(event, counts[event.id] || 0),
      organizer_ids: organizersByEvent[event.id] || [],
    }));

    return res.json({ data, pagination });
  } catch (err) {
    logError('Erro ao listar eventos:', err);
    return res.status(500).json({
      error: 'Erro ao carregar eventos',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const getEvent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { id } = req.params;

    const { data: event, error } = await supabase
      .from('events')
      .select(eventSelect)
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (error || !event) {
      return res.status(404).json({
        error: 'Evento não encontrado',
        details: 'Não foi possível encontrar o evento solicitado',
      });
    }

    const access = assertCongregationAccess(req.church!, event.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const { organizers, error: organizersError } = await loadEventOrganizers(id);
    if (organizersError) {
      return res.status(500).json({
        error: 'Erro ao carregar organizadores',
        details: organizersError.message,
      });
    }

    const counts = await loadRegistrationCounts([id], churchId);

    return res.json({
      ...serializeEvent(event, counts[id] || 0),
      organizers,
      organizer_ids: organizers.map((o: any) => o.id),
    });
  } catch (err) {
    logError('Erro ao buscar evento:', err);
    return res.status(500).json({
      error: 'Erro ao carregar evento',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = createEventSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const churchId = req.church!.churchId;
    const congregationId = emptyToNull(value.congregation_id);
    const groupId = emptyToNull(value.group_id);

    if (congregationId) {
      const congregationValidation = await validateGroupCongregation(congregationId, churchId);
      if (!congregationValidation.isValid) {
        return res.status(400).json({
          error: 'Congregação inválida',
          details: congregationValidation.errorMessage,
        });
      }
    }

    const access = assertCongregationAccess(req.church!, congregationId);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const responsibleValidation = await validateResponsibleAndCongregation(
      value.responsible_id,
      congregationId,
      churchId
    );
    if (!responsibleValidation.isValid) {
      return res.status(400).json({
        error: 'Responsável inválido',
        details: responsibleValidation.errorMessage,
      });
    }

    const groupValidation = await validateEventGroup(groupId, congregationId, churchId);
    if (!groupValidation.ok) {
      return res.status(400).json({
        error: 'Ministério inválido',
        details: groupValidation.message,
      });
    }

    const organizersValidation = await validateOrganizers(
      value.organizer_ids || [],
      value.responsible_id,
      churchId
    );
    if (!organizersValidation.ok) {
      return res.status(400).json({
        error: 'Organizadores inválidos',
        details: organizersValidation.message,
      });
    }

    const { data: event, error: createError } = await supabase
      .from('events')
      .insert([
        {
          church_id: churchId,
          name: value.name.trim(),
          description: emptyToNull(value.description),
          starts_at: value.starts_at,
          ends_at: emptyToNull(value.ends_at),
          location: emptyToNull(value.location),
          congregation_id: congregationId,
          status: value.status || 'draft',
          capacity: value.capacity ?? null,
          responsible_id: value.responsible_id,
          group_id: groupId,
        },
      ])
      .select()
      .single();

    if (createError || !event) {
      return res.status(400).json({
        error: 'Erro ao criar evento',
        details: createError?.message || 'Não foi possível criar o evento',
      });
    }

    const { error: organizersError } = await replaceEventOrganizersRows(
      event.id,
      organizersValidation.uniqueIds
    );
    if (organizersError) {
      await supabase.from('events').delete().eq('id', event.id);
      return res.status(400).json({
        error: 'Erro ao associar organizadores',
        details: organizersError.message,
      });
    }

    await logAudit(req, {
      entity: 'event',
      entityId: event.id,
      action: 'create',
      changesAfter: { ...event, organizer_ids: organizersValidation.uniqueIds },
    });

    return res.status(201).json({
      ...event,
      organizer_ids: organizersValidation.uniqueIds,
    });
  } catch (err) {
    logError('Erro ao criar evento:', err);
    return res.status(500).json({
      error: 'Erro ao cadastrar evento',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = updateEventSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const churchId = req.church!.churchId;
    const { id } = req.params;

    const { data: existing, error: existingError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        error: 'Evento não encontrado',
        details: 'Não foi possível encontrar o evento solicitado',
      });
    }

    const existingAccess = assertCongregationAccess(req.church!, existing.congregation_id);
    if (!existingAccess.ok) {
      return res.status(existingAccess.status).json(existingAccess.body);
    }

    const congregationChanged = value.congregation_id !== undefined;
    const nextCongregationId = congregationChanged
      ? emptyToNull(value.congregation_id)
      : existing.congregation_id;
    const nextResponsibleId = value.responsible_id || existing.responsible_id;
    const nextGroupId =
      value.group_id !== undefined ? emptyToNull(value.group_id) : existing.group_id;

    if (congregationChanged) {
      if (nextCongregationId) {
        const congregationValidation = await validateGroupCongregation(
          nextCongregationId,
          churchId
        );
        if (!congregationValidation.isValid) {
          return res.status(400).json({
            error: 'Congregação inválida',
            details: congregationValidation.errorMessage,
          });
        }
      }
      const access = assertCongregationAccess(req.church!, nextCongregationId);
      if (!access.ok) {
        return res.status(access.status).json(access.body);
      }
    }

    if (value.responsible_id || congregationChanged) {
      const responsibleValidation = await validateResponsibleAndCongregation(
        nextResponsibleId,
        nextCongregationId,
        churchId
      );
      if (!responsibleValidation.isValid) {
        return res.status(400).json({
          error: 'Responsável inválido',
          details: responsibleValidation.errorMessage,
        });
      }
    }

    if (value.group_id !== undefined || congregationChanged) {
      const groupValidation = await validateEventGroup(nextGroupId, nextCongregationId, churchId);
      if (!groupValidation.ok) {
        return res.status(400).json({
          error: 'Ministério inválido',
          details: groupValidation.message,
        });
      }
    }

    const nextStartsAt = value.starts_at !== undefined ? value.starts_at : existing.starts_at;
    const nextEndsAt =
      value.ends_at !== undefined ? emptyToNull(value.ends_at) : existing.ends_at;
    if (
      nextStartsAt &&
      nextEndsAt &&
      new Date(nextEndsAt).getTime() < new Date(nextStartsAt).getTime()
    ) {
      return res.status(400).json({
        error: 'Período inválido',
        details: 'A data de término deve ser igual ou posterior à data de início',
      });
    }

    if (value.capacity !== undefined && value.capacity !== null) {
      const counts = await loadRegistrationCounts([id], churchId);
      if ((counts[id] || 0) > value.capacity) {
        return res.status(400).json({
          error: 'Capacidade inválida',
          details: 'A capacidade não pode ser menor que o número de inscrições existentes',
        });
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (value.name !== undefined) updates.name = value.name.trim();
    if (value.description !== undefined) updates.description = emptyToNull(value.description);
    if (value.starts_at !== undefined) updates.starts_at = value.starts_at;
    if (value.ends_at !== undefined) updates.ends_at = emptyToNull(value.ends_at);
    if (value.location !== undefined) updates.location = emptyToNull(value.location);
    if (congregationChanged) updates.congregation_id = nextCongregationId;
    if (value.status !== undefined) updates.status = value.status;
    if (value.capacity !== undefined) updates.capacity = value.capacity;
    if (value.responsible_id !== undefined) updates.responsible_id = value.responsible_id;
    if (value.group_id !== undefined) updates.group_id = nextGroupId;

    // Se o responsável mudou, ele não pode permanecer como organizador
    if (value.responsible_id && value.responsible_id !== existing.responsible_id) {
      await supabase
        .from('event_organizers')
        .delete()
        .eq('event_id', id)
        .eq('member_id', value.responsible_id);
    }

    const { data: event, error: updateError } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .eq('church_id', churchId)
      .select()
      .single();

    if (updateError || !event) {
      return res.status(400).json({
        error: 'Erro ao atualizar evento',
        details: updateError?.message || 'Não foi possível atualizar o evento',
      });
    }

    let organizerIds: string[] | undefined;
    if (value.organizer_ids !== undefined) {
      const organizersValidation = await validateOrganizers(
        value.organizer_ids || [],
        event.responsible_id,
        churchId
      );
      if (!organizersValidation.ok) {
        return res.status(400).json({
          error: 'Organizadores inválidos',
          details: organizersValidation.message,
        });
      }
      const { error: organizersError } = await replaceEventOrganizersRows(
        id,
        organizersValidation.uniqueIds
      );
      if (organizersError) {
        return res.status(400).json({
          error: 'Erro ao atualizar organizadores',
          details: organizersError.message,
        });
      }
      organizerIds = organizersValidation.uniqueIds;
    }

    await logAudit(req, {
      entity: 'event',
      entityId: event.id,
      action: 'update',
      changesBefore: existing,
      changesAfter: event,
    });

    if (organizerIds) {
      return res.json({ ...event, organizer_ids: organizerIds });
    }
    return res.json(event);
  } catch (err) {
    logError('Erro ao atualizar evento:', err);
    return res.status(500).json({
      error: 'Erro ao atualizar evento',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { id } = req.params;

    const { data: existing, error: existingError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        error: 'Evento não encontrado',
        details: 'Não foi possível encontrar o evento solicitado',
      });
    }

    const access = assertCongregationAccess(req.church!, existing.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('church_id', churchId);

    if (deleteError) {
      return res.status(400).json({
        error: 'Erro ao excluir evento',
        details: deleteError.message,
      });
    }

    await logAudit(req, {
      entity: 'event',
      entityId: id,
      action: 'delete',
      changesBefore: existing,
    });

    return res.status(204).send();
  } catch (err) {
    logError('Erro ao excluir evento:', err);
    return res.status(500).json({
      error: 'Erro ao excluir evento',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const replaceEventOrganizers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = replaceEventOrganizersSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const churchId = req.church!.churchId;
    const { id } = req.params;

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        error: 'Evento não encontrado',
        details: 'Não foi possível encontrar o evento solicitado',
      });
    }

    const access = assertCongregationAccess(req.church!, event.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const organizersValidation = await validateOrganizers(
      value.organizer_ids || [],
      event.responsible_id,
      churchId
    );
    if (!organizersValidation.ok) {
      return res.status(400).json({
        error: 'Organizadores inválidos',
        details: organizersValidation.message,
      });
    }

    const { error: organizersError } = await replaceEventOrganizersRows(
      id,
      organizersValidation.uniqueIds
    );
    if (organizersError) {
      return res.status(400).json({
        error: 'Erro ao atualizar organizadores',
        details: organizersError.message,
      });
    }

    const { organizers } = await loadEventOrganizers(id);

    await logAudit(req, {
      entity: 'event_organizers',
      entityId: id,
      action: 'update',
      changesAfter: { organizer_ids: organizersValidation.uniqueIds },
    });

    return res.json({
      event_id: id,
      organizer_ids: organizersValidation.uniqueIds,
      organizers,
    });
  } catch (err) {
    logError('Erro ao atualizar organizadores do evento:', err);
    return res.status(500).json({
      error: 'Erro ao atualizar organizadores',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};
