import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { AuthRequest } from '../types';
import {
  createEventRegistrationSchema,
  resolveEventRegistrationSchema,
} from '../validators/eventValidator';
import { logAudit } from '../utils/auditLogger';
import { assertCongregationAccess } from '../utils/congregationScope';
import { error as logError } from '../utils/logger';
import { buildPagination, parsePageLimit } from '../utils/pagination';
import { buildIlikeContainsOrFilter } from '../utils/postgrestFilter';
import { decideLinkMemberResolve } from '../services/teachingEnrollmentPolicy';
import {
  normalizeWhatsAppDigits,
  whatsappLast4National,
} from '../services/teachingMatchService';
import {
  EVENT_FULL_MESSAGE,
  insertEventRegistrationWithCapacity,
} from '../services/eventCapacity';

function maskWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const last4 = whatsappLast4National(normalizeWhatsAppDigits(phone));
  if (!last4) return '****';
  return `****${last4}`;
}

function toBirthDateString(birth: Date | string | null | undefined): string | null {
  if (birth == null || birth === '') return null;
  if (typeof birth === 'string') return birth.slice(0, 10);
  if (birth instanceof Date && !Number.isNaN(birth.getTime())) {
    return birth.toISOString().slice(0, 10);
  }
  return null;
}

function calcAge(birth: string | Date | null | undefined): number | null {
  const iso = toBirthDateString(birth);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

async function loadEventForChurch(eventId: string, churchId: string) {
  return supabase
    .from('events')
    .select('id, church_id, congregation_id, name, status, capacity')
    .eq('id', eventId)
    .eq('church_id', churchId)
    .single();
}

function serializeRegistration(row: any) {
  const rawWhatsapp =
    row.kind === 'member'
      ? row.members?.whatsapp || row.members?.phone || row.whatsapp || null
      : row.whatsapp || null;
  return {
    id: row.id,
    church_id: row.church_id,
    event_id: row.event_id,
    kind: row.kind,
    member_id: row.member_id,
    full_name: row.full_name,
    birth_date: toBirthDateString(row.birth_date),
    email: row.email,
    created_at: row.created_at,
    updated_at: row.updated_at,
    display_name: row.members?.name || row.full_name || null,
    whatsapp: rawWhatsapp,
    whatsapp_masked: maskWhatsApp(rawWhatsapp),
    age: calcAge(row.birth_date || row.members?.birth),
    member: row.members
      ? {
          id: row.members.id,
          name: row.members.name,
          congregation_id: row.members.congregation_id,
          whatsapp: row.members.whatsapp || row.members.phone || null,
          whatsapp_masked: maskWhatsApp(row.members.whatsapp || row.members.phone),
          age: calcAge(row.members.birth),
          birth: toBirthDateString(row.members.birth),
          congregations: row.members.congregations || null,
        }
      : null,
  };
}

async function registeredMemberIdsForEvent(eventId: string, churchId: string) {
  const { data } = await supabase
    .from('event_registrations')
    .select('member_id')
    .eq('event_id', eventId)
    .eq('church_id', churchId)
    .not('member_id', 'is', null);

  return new Set(
    (data || []).map((row: { member_id?: string | null }) => row.member_id).filter(Boolean)
  );
}

async function enrichPossibleMemberCandidates(registration: any, churchId: string) {
  const meta = registration.match_meta || {};
  const candidateIds: string[] = Array.isArray(meta.candidates)
    ? meta.candidates.map((c: any) => c.id).filter(Boolean)
    : [];

  const base = serializeRegistration(registration);

  if (candidateIds.length === 0) {
    return {
      ...base,
      signals: meta.signals || null,
      queue_candidates: [],
    };
  }

  const registeredIds = await registeredMemberIdsForEvent(registration.event_id, churchId);

  const { data: members } = await supabase
    .from('members')
    .select(
      `
      id,
      name,
      birth,
      whatsapp,
      phone,
      email,
      congregation_id,
      congregations (
        id,
        name,
        abbreviation
      )
    `
    )
    .eq('church_id', churchId)
    .in('id', candidateIds);

  const byId = new Map((members || []).map((m: any) => [m.id, m]));
  const signalById = new Map(
    (meta.candidates || []).map((c: any) => [c.id, c.signals || { N: false, W: false, D: false }])
  );

  const queue_candidates = candidateIds
    .map((id) => {
      const member = byId.get(id);
      if (!member) return null;
      const rawWhatsapp = member.whatsapp || member.phone || null;
      return {
        id: member.id,
        name: member.name,
        age: calcAge(member.birth),
        birth: toBirthDateString(member.birth),
        email: member.email || null,
        whatsapp: rawWhatsapp,
        whatsapp_masked: maskWhatsApp(rawWhatsapp),
        congregation_id: member.congregation_id,
        congregation: member.congregations || null,
        already_enrolled: registeredIds.has(member.id),
        signals: signalById.get(id) || { N: false, W: false, D: false },
      };
    })
    .filter(Boolean);

  return {
    ...base,
    signals: meta.signals || null,
    queue_candidates,
  };
}

export const listEventRegistrations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { id: eventId } = req.params;

    const { data: event, error: eventError } = await loadEventForChurch(eventId, churchId);
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

    const { page, limit, offset } = parsePageLimit(req.query);
    const searchFilter = buildIlikeContainsOrFilter(
      ['full_name', 'whatsapp', 'email'],
      String(req.query.search || '')
    );

    const registrationSelect = `
        *,
        members (
          id,
          name,
          birth,
          whatsapp,
          phone,
          congregation_id,
          congregations (
            id,
            name,
            abbreviation
          )
        )
      `;

    const { data: queueRows, error: queueError } = await supabase
      .from('event_registrations')
      .select(registrationSelect)
      .eq('event_id', eventId)
      .eq('church_id', churchId)
      .eq('kind', 'possible_member')
      .order('created_at', { ascending: false });

    if (queueError) {
      return res.status(400).json({
        error: 'Erro ao buscar inscrições',
        details: queueError.message,
      });
    }

    let othersQuery = supabase
      .from('event_registrations')
      .select(registrationSelect, { count: 'exact' })
      .eq('event_id', eventId)
      .eq('church_id', churchId)
      .neq('kind', 'possible_member');

    if (searchFilter) {
      othersQuery = othersQuery.or(searchFilter);
    }

    const { data: otherRows, error, count } = await othersQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({
        error: 'Erro ao buscar inscrições',
        details: error.message,
      });
    }

    const queue = [];
    for (const registration of queueRows || []) {
      queue.push(await enrichPossibleMemberCandidates(registration, churchId));
    }

    const data = (otherRows || []).map((registration) => serializeRegistration(registration));

    return res.json({
      data,
      queue,
      pagination: buildPagination(page, limit, count || 0),
    });
  } catch (err) {
    logError('Erro ao listar inscrições de evento:', err);
    return res.status(500).json({
      error: 'Erro ao carregar inscrições',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const createEventRegistration = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = createEventRegistrationSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const churchId = req.church!.churchId;
    const { id: eventId } = req.params;

    const { data: event, error: eventError } = await loadEventForChurch(eventId, churchId);
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

    let payload: Record<string, unknown>;

    if (value.type === 'member') {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, name, birth, whatsapp, phone, email')
        .eq('id', value.member_id)
        .eq('church_id', churchId)
        .single();

      if (memberError || !member) {
        return res.status(400).json({
          error: 'Membro inválido',
          details: 'Membro não encontrado ou não pertence a esta igreja',
        });
      }

      const { data: existing } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('member_id', member.id)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({
          error: 'Inscrição duplicada',
          details: 'Este membro já está inscrito neste evento',
        });
      }

      payload = {
        church_id: churchId,
        event_id: eventId,
        kind: 'member',
        member_id: member.id,
        full_name: member.name,
        whatsapp: member.whatsapp || member.phone || null,
        birth_date: toBirthDateString(member.birth),
        email: member.email || null,
        match_meta: null,
      };
    } else {
      // Convidado manual — nunca cria members
      payload = {
        church_id: churchId,
        event_id: eventId,
        kind: 'guest',
        member_id: null,
        full_name: value.full_name.trim(),
        whatsapp: value.whatsapp.trim(),
        birth_date: value.birth_date,
        email: emptyToNull(value.email),
        match_meta: null,
      };
    }

    const result = await insertEventRegistrationWithCapacity(event, payload);

    if (!result.ok) {
      if (result.reason === 'full') {
        return res.status(409).json({
          error: 'Evento lotado',
          details: EVENT_FULL_MESSAGE,
        });
      }
      if (result.code === '23505') {
        return res.status(400).json({
          error: 'Inscrição duplicada',
          details: 'Este membro já está inscrito neste evento',
        });
      }
      return res.status(400).json({
        error: 'Erro ao criar inscrição',
        details: result.message,
      });
    }

    await logAudit(req, {
      entity: 'event_registration',
      entityId: result.registration.id,
      action: 'create',
      changesAfter: result.registration,
    });

    return res.status(201).json(serializeRegistration(result.registration));
  } catch (err) {
    logError('Erro ao criar inscrição de evento:', err);
    return res.status(500).json({
      error: 'Erro ao cadastrar inscrição',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const resolveEventRegistration = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = resolveEventRegistrationSchema.validate(req.body, {
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

    const { data: registration, error: registrationError } = await supabase
      .from('event_registrations')
      .select('*, events ( id, congregation_id )')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (registrationError || !registration) {
      return res.status(404).json({
        error: 'Inscrição não encontrada',
        details: 'Não foi possível encontrar a inscrição solicitada',
      });
    }

    const eventRow = registration.events as any;
    const access = assertCongregationAccess(req.church!, eventRow?.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    if (registration.kind !== 'possible_member') {
      return res.status(400).json({
        error: 'Ação inválida',
        details: 'Somente inscrições de possível membro podem ser resolvidas',
      });
    }

    let updates: Record<string, unknown>;

    if (value.action === 'keep_guest') {
      updates = {
        kind: 'guest',
        member_id: null,
        match_meta: null,
        updated_at: new Date().toISOString(),
      };
    } else {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, name, birth, whatsapp, phone, email')
        .eq('id', value.member_id)
        .eq('church_id', churchId)
        .single();

      if (memberError || !member) {
        return res.status(400).json({
          error: 'Membro inválido',
          details: 'Membro não encontrado ou não pertence a esta igreja',
        });
      }

      const { data: duplicate } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', registration.event_id)
        .eq('member_id', member.id)
        .neq('id', registration.id)
        .maybeSingle();

      if (decideLinkMemberResolve(Boolean(duplicate)) === 'dismiss_already_enrolled') {
        const { error: deleteError } = await supabase
          .from('event_registrations')
          .delete()
          .eq('id', id)
          .eq('church_id', churchId);

        if (deleteError) {
          return res.status(400).json({
            error: 'Inscrição duplicada',
            details: 'Este membro já está inscrito neste evento',
          });
        }

        await logAudit(req, {
          entity: 'event_registration',
          entityId: id,
          action: 'delete',
          changesBefore: registration,
        });

        return res.json({
          already_enrolled: true,
          id,
          member_id: member.id,
        });
      }

      updates = {
        kind: 'member',
        member_id: member.id,
        full_name: member.name,
        whatsapp: member.whatsapp || member.phone || registration.whatsapp,
        birth_date: toBirthDateString(member.birth) || registration.birth_date,
        email: member.email || registration.email,
        match_meta: null,
        updated_at: new Date().toISOString(),
      };
    }

    const { data: updated, error: updateError } = await supabase
      .from('event_registrations')
      .update(updates)
      .eq('id', id)
      .eq('church_id', churchId)
      .select()
      .single();

    if (updateError || !updated) {
      return res.status(400).json({
        error: 'Erro ao resolver inscrição',
        details: updateError?.message || 'Não foi possível resolver a inscrição',
      });
    }

    await logAudit(req, {
      entity: 'event_registration',
      entityId: updated.id,
      action: 'update',
      changesBefore: registration,
      changesAfter: updated,
    });

    return res.json(serializeRegistration(updated));
  } catch (err) {
    logError('Erro ao resolver inscrição de evento:', err);
    return res.status(500).json({
      error: 'Erro ao resolver inscrição',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const deleteEventRegistration = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { id } = req.params;

    const { data: registration, error: registrationError } = await supabase
      .from('event_registrations')
      .select('*, events ( id, congregation_id )')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (registrationError || !registration) {
      return res.status(404).json({
        error: 'Inscrição não encontrada',
        details: 'Não foi possível encontrar a inscrição solicitada',
      });
    }

    const eventRow = registration.events as any;
    const access = assertCongregationAccess(req.church!, eventRow?.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const { error: deleteError } = await supabase
      .from('event_registrations')
      .delete()
      .eq('id', id)
      .eq('church_id', churchId);

    if (deleteError) {
      return res.status(400).json({
        error: 'Erro ao excluir inscrição',
        details: deleteError.message,
      });
    }

    await logAudit(req, {
      entity: 'event_registration',
      entityId: id,
      action: 'delete',
      changesBefore: { kind: registration.kind, event_id: registration.event_id },
    });

    return res.status(204).send();
  } catch (err) {
    logError('Erro ao excluir inscrição de evento:', err);
    return res.status(500).json({
      error: 'Erro ao excluir inscrição',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};
