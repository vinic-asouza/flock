import { Response, NextFunction } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { PublicEventRequest } from '../types';

const UNAVAILABLE = {
  error: 'Esta inscrição não está disponível.',
  details: 'Esta inscrição não está disponível.',
};

const publicEventAuth = async (
  req: PublicEventRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json(UNAVAILABLE);
    }

    const { data: eventLink, error: linkError } = await supabase
      .from('event_public_links')
      .select('*')
      .eq('token', token)
      .single();

    if (linkError || !eventLink) {
      return res.status(404).json(UNAVAILABLE);
    }

    if (!eventLink.is_active) {
      return res.status(403).json(UNAVAILABLE);
    }

    if (new Date(eventLink.expires_at) <= new Date()) {
      return res.status(403).json(UNAVAILABLE);
    }

    if (
      eventLink.max_uses !== null &&
      eventLink.max_uses !== undefined &&
      eventLink.current_uses >= eventLink.max_uses
    ) {
      return res.status(403).json(UNAVAILABLE);
    }

    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', eventLink.church_id)
      .single();

    if (churchError || !church) {
      return res.status(404).json(UNAVAILABLE);
    }

    req.eventLink = eventLink as PublicEventRequest['eventLink'];
    req.churchId = eventLink.church_id;
    req.churchName = church.name;

    next();
  } catch (error) {
    console.error('Erro na autenticação pública de eventos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

export default publicEventAuth;
