import { Response, NextFunction } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { PublicTeachingRequest } from '../types';

const publicTeachingAuth = async (
  req: PublicTeachingRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'Esta inscrição não está disponível.',
        details: 'Esta inscrição não está disponível.',
      });
    }

    const { data: teachingLink, error: linkError } = await supabase
      .from('teaching_public_links')
      .select('*')
      .eq('token', token)
      .single();

    if (linkError || !teachingLink) {
      return res.status(404).json({
        error: 'Esta inscrição não está disponível.',
        details: 'Esta inscrição não está disponível.',
      });
    }

    if (!teachingLink.is_active) {
      return res.status(403).json({
        error: 'Esta inscrição não está disponível.',
        details: 'Esta inscrição não está disponível.',
      });
    }

    if (new Date(teachingLink.expires_at) <= new Date()) {
      return res.status(403).json({
        error: 'Esta inscrição não está disponível.',
        details: 'Esta inscrição não está disponível.',
      });
    }

    if (
      teachingLink.max_uses !== null &&
      teachingLink.max_uses !== undefined &&
      teachingLink.current_uses >= teachingLink.max_uses
    ) {
      return res.status(403).json({
        error: 'Esta inscrição não está disponível.',
        details: 'Esta inscrição não está disponível.',
      });
    }

    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', teachingLink.church_id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Esta inscrição não está disponível.',
        details: 'Esta inscrição não está disponível.',
      });
    }

    req.teachingLink = teachingLink as PublicTeachingRequest['teachingLink'];
    req.churchId = teachingLink.church_id;
    req.churchName = church.name;

    next();
  } catch (error) {
    console.error('Erro na autenticação pública de ensino:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

export default publicTeachingAuth;
