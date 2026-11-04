import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { AuthRequest } from '../types';
import {
  createEventPublicLinkSchema,
  patchEventPublicLinkSchema,
} from '../validators/eventValidator';
import { generateSecureToken } from './registrationLinkController';
import { logAudit } from '../utils/auditLogger';
import { assertCongregationAccess } from '../utils/congregationScope';
import { error as logError } from '../utils/logger';

function buildEventPublicUrl(token: string) {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/+$/, '');
  return `${frontendUrl}/public/events/${token}`;
}

function withLinkMeta(link: any, event?: { status?: string } | null) {
  const eventStatus = event?.status;
  const enrollmentAllowed =
    Boolean(link.is_active) &&
    new Date(link.expires_at) > new Date() &&
    (link.max_uses == null || link.current_uses < link.max_uses) &&
    (eventStatus === 'open' || eventStatus === 'in_progress');

  return {
    ...link,
    url: buildEventPublicUrl(link.token),
    is_expired: new Date(link.expires_at) <= new Date(),
    remaining_uses:
      link.max_uses != null ? Math.max(link.max_uses - link.current_uses, 0) : null,
    is_limit_reached: link.max_uses != null ? link.current_uses >= link.max_uses : false,
    enrollment_allowed: enrollmentAllowed,
    event_status: eventStatus || null,
  };
}

async function loadEventForChurch(eventId: string, churchId: string) {
  return supabase
    .from('events')
    .select('id, church_id, congregation_id, name, status')
    .eq('id', eventId)
    .eq('church_id', churchId)
    .single();
}

export const getEventPublicLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autorizado', details: 'Usuário não autenticado' });
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
    if (!access.ok) return res.status(access.status).json(access.body);

    const { data: link, error } = await supabase
      .from('event_public_links')
      .select('*')
      .eq('event_id', eventId)
      .eq('church_id', churchId)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: 'Erro ao buscar link', details: error.message });
    }

    if (!link) {
      return res.status(404).json({
        error: 'Link não encontrado',
        details: 'Este evento ainda não possui link público',
      });
    }

    return res.json(withLinkMeta(link, event));
  } catch (err) {
    logError('Erro ao buscar link público de evento:', err);
    return res.status(500).json({
      error: 'Erro ao carregar link',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const createEventPublicLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autorizado', details: 'Usuário não autenticado' });
    }

    const { error: validationError, value } = createEventPublicLinkSchema.validate(req.body || {}, {
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
    if (!access.ok) return res.status(access.status).json(access.body);

    const { data: existing } = await supabase
      .from('event_public_links')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        error: 'Link já existe',
        details: 'Este evento já possui um link público. Use PATCH para ativar/desativar.',
      });
    }

    let expiresAt: Date;
    if (value.expires_at) {
      expiresAt = new Date(value.expires_at);
      if (expiresAt <= new Date()) {
        return res.status(400).json({
          error: 'Data inválida',
          details: 'Data de expiração deve ser no futuro',
        });
      }
    } else {
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    let token = generateSecureToken();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: collision } = await supabase
        .from('event_public_links')
        .select('id')
        .eq('token', token)
        .maybeSingle();
      if (!collision) break;
      token = generateSecureToken();
    }

    const { data: link, error: createError } = await supabase
      .from('event_public_links')
      .insert([
        {
          church_id: churchId,
          event_id: eventId,
          token,
          expires_at: expiresAt.toISOString(),
          max_uses: value.max_uses ?? null,
          current_uses: 0,
          is_active: true,
          created_by: req.user.id,
        },
      ])
      .select()
      .single();

    if (createError || !link) {
      return res.status(400).json({
        error: 'Erro ao criar link',
        details: createError?.message || 'Não foi possível criar o link',
      });
    }

    await logAudit(req, {
      entity: 'event_public_link',
      entityId: link.id,
      action: 'create',
      changesAfter: link,
    });

    return res.status(201).json(withLinkMeta(link, event));
  } catch (err) {
    logError('Erro ao criar link público de evento:', err);
    return res.status(500).json({
      error: 'Erro ao criar link',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const patchEventPublicLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autorizado', details: 'Usuário não autenticado' });
    }

    const { error: validationError, value } = patchEventPublicLinkSchema.validate(req.body, {
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
    if (!access.ok) return res.status(access.status).json(access.body);

    const { data: existing, error: existingError } = await supabase
      .from('event_public_links')
      .select('*')
      .eq('event_id', eventId)
      .eq('church_id', churchId)
      .maybeSingle();

    if (existingError || !existing) {
      return res.status(404).json({
        error: 'Link não encontrado',
        details: 'Este evento ainda não possui link público',
      });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (value.is_active !== undefined) updates.is_active = value.is_active;
    if (value.expires_at !== undefined) updates.expires_at = value.expires_at;
    if (value.max_uses !== undefined) updates.max_uses = value.max_uses;
    if (value.regenerate_token) {
      updates.token = generateSecureToken();
      updates.current_uses = 0;
    }

    const { data: link, error: updateError } = await supabase
      .from('event_public_links')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError || !link) {
      return res.status(400).json({
        error: 'Erro ao atualizar link',
        details: updateError?.message || 'Não foi possível atualizar o link',
      });
    }

    await logAudit(req, {
      entity: 'event_public_link',
      entityId: link.id,
      action: 'update',
      changesBefore: existing,
      changesAfter: link,
    });

    return res.json(withLinkMeta(link, event));
  } catch (err) {
    logError('Erro ao atualizar link público de evento:', err);
    return res.status(500).json({
      error: 'Erro ao atualizar link',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};
