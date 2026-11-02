import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { PublicEventRequest } from '../types';
import { publicEventEnrollSchema } from '../validators/eventValidator';
import { matchEnrollment } from '../services/teachingMatchService';
import { shouldSkipPossibleMemberQueue } from '../services/teachingEnrollmentPolicy';
import {
  countEventRegistrations,
  isEventFull,
} from '../services/eventCapacity';
import { error as logError } from '../utils/logger';

const UNAVAILABLE = {
  error: 'Esta inscrição não está disponível.',
  details: 'Esta inscrição não está disponível.',
};

const FULL = {
  error: 'Não há vagas disponíveis.',
  details: 'Não há vagas disponíveis.',
};

const OPEN_STATUSES = new Set(['open', 'in_progress']);

async function loadEventContext(eventId: string, churchId: string) {
  const { data: event, error } = await supabase
    .from('events')
    .select('id, name, status, capacity, starts_at, ends_at, location, church_id')
    .eq('id', eventId)
    .eq('church_id', churchId)
    .single();

  if (error || !event) return null;

  const { data: church } = await supabase
    .from('churches')
    .select('id, name')
    .eq('id', churchId)
    .single();

  const { count } = await supabase
    .from('event_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  const registrationCount = count || 0;
  const capacity = event.capacity ?? null;
  const spotsRemaining = capacity == null ? null : Math.max(capacity - registrationCount, 0);
  const full = capacity != null && registrationCount >= capacity;

  return {
    event,
    churchName: church?.name || '',
    registrationCount,
    spotsRemaining,
    full,
  };
}

export const getPublicEventLink = async (req: PublicEventRequest, res: Response) => {
  try {
    const eventLink = req.eventLink!;
    const churchId = req.churchId!;

    const ctx = await loadEventContext(eventLink.event_id, churchId);
    if (!ctx) return res.status(404).json(UNAVAILABLE);

    if (!OPEN_STATUSES.has(ctx.event.status)) {
      return res.status(403).json(UNAVAILABLE);
    }

    if (ctx.full) {
      return res.json({
        status: 'ok',
        church_name: ctx.churchName,
        event_name: ctx.event.name,
        starts_at: ctx.event.starts_at,
        ends_at: ctx.event.ends_at,
        location: ctx.event.location,
        expires_at: eventLink.expires_at,
        enrollment_allowed: false,
        full: true,
        spots_remaining: 0,
      });
    }

    return res.json({
      status: 'ok',
      church_name: ctx.churchName,
      event_name: ctx.event.name,
      starts_at: ctx.event.starts_at,
      ends_at: ctx.event.ends_at,
      location: ctx.event.location,
      expires_at: eventLink.expires_at,
      enrollment_allowed: true,
      full: false,
      spots_remaining: ctx.spotsRemaining,
    });
  } catch (err) {
    logError('Erro ao validar link público de evento:', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const createPublicEventRegistration = async (
  req: PublicEventRequest,
  res: Response
) => {
  try {
    const eventLink = req.eventLink!;
    const churchId = req.churchId!;

    const { error: validationError, value } = publicEventEnrollSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const ctx = await loadEventContext(eventLink.event_id, churchId);
    if (!ctx || !OPEN_STATUSES.has(ctx.event.status)) {
      return res.status(403).json(UNAVAILABLE);
    }

    if (isEventFull(ctx.event.capacity, ctx.registrationCount)) {
      return res.status(409).json(FULL);
    }

    const matchInput = {
      fullName: value.full_name,
      whatsapp: value.whatsapp,
      birthDate: value.birth_date,
    };
    const memberSelect = 'id, name, whatsapp, phone, birth';

    const { data: birthMatches, error: birthError } = await supabase
      .from('members')
      .select(memberSelect)
      .eq('church_id', churchId)
      .eq('active', true)
      .eq('birth', value.birth_date);

    if (birthError) {
      logError('Erro ao buscar membros para match de evento:', birthError);
      return res.status(500).json({
        error: 'Erro interno do servidor',
        details: 'Não foi possível processar a inscrição no momento',
      });
    }

    let match = matchEnrollment(matchInput, birthMatches || []);

    if (match.kind !== 'member') {
      const { data: otherMembers, error: membersError } = await supabase
        .from('members')
        .select(memberSelect)
        .eq('church_id', churchId)
        .eq('active', true)
        .or(`birth.is.null,birth.neq.${value.birth_date}`);

      if (membersError) {
        logError('Erro ao buscar membros para match de evento:', membersError);
        return res.status(500).json({
          error: 'Erro interno do servidor',
          details: 'Não foi possível processar a inscrição no momento',
        });
      }

      match = matchEnrollment(matchInput, [...(birthMatches || []), ...(otherMembers || [])]);
    }

    const enrollmentPayload: Record<string, unknown> = {
      church_id: churchId,
      event_id: eventLink.event_id,
      kind: match.kind,
      member_id: match.kind === 'member' ? match.memberId || null : null,
      full_name: value.full_name.trim(),
      whatsapp: value.whatsapp.trim(),
      birth_date: value.birth_date,
      email: value.email ? String(value.email).trim() : null,
      match_meta:
        match.kind === 'possible_member'
          ? { signals: match.signals, candidates: match.candidates }
          : match.kind === 'member'
            ? { signals: match.signals }
            : null,
    };

    if (match.kind === 'member' && match.memberId) {
      const { data: existing } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', eventLink.event_id)
        .eq('member_id', match.memberId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('event_public_links')
          .update({ current_uses: eventLink.current_uses + 1 })
          .eq('id', eventLink.id);

        return res.status(200).json({
          outcome: 'confirmed',
          church_name: ctx.churchName,
          event_name: ctx.event.name,
        });
      }
    }

    if (match.kind === 'possible_member') {
      const candidateIds = (match.candidates || []).map((c) => c.id).filter(Boolean);
      if (candidateIds.length > 0) {
        const { data: alreadyInEvent } = await supabase
          .from('event_registrations')
          .select('member_id')
          .eq('event_id', eventLink.event_id)
          .in('member_id', candidateIds);

        if (
          shouldSkipPossibleMemberQueue({
            kind: match.kind,
            candidateIds,
            enrolledMemberIds: (alreadyInEvent || []).map((row) => row.member_id),
          })
        ) {
          await supabase
            .from('event_public_links')
            .update({ current_uses: eventLink.current_uses + 1 })
            .eq('id', eventLink.id);

          return res.status(200).json({
            outcome: 'submitted',
            church_name: ctx.churchName,
            event_name: ctx.event.name,
          });
        }
      }
    }

    const { count: latestCount } = await countEventRegistrations(
      eventLink.event_id,
      churchId
    );
    if (isEventFull(ctx.event.capacity, latestCount)) {
      return res.status(409).json(FULL);
    }

    const { error: insertError } = await supabase
      .from('event_registrations')
      .insert([enrollmentPayload]);

    if (insertError) {
      logError('Erro ao inserir inscrição pública de evento:', insertError);
      return res.status(500).json({
        error: 'Erro interno do servidor',
        details: 'Não foi possível concluir a inscrição',
      });
    }

    await supabase
      .from('event_public_links')
      .update({ current_uses: eventLink.current_uses + 1 })
      .eq('id', eventLink.id);

    const outcome = match.kind === 'member' ? 'confirmed' : 'submitted';

    return res.status(201).json({
      outcome,
      church_name: ctx.churchName,
      event_name: ctx.event.name,
    });
  } catch (err) {
    logError('Erro na inscrição pública de evento:', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};
