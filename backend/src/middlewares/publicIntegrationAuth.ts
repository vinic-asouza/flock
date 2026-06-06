import { Response, NextFunction } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { PublicIntegrationRequest } from '../types';

/**
 * Middleware para autenticação de integração pública via token de link
 * Valida o token do link sem exigir login do usuário
 */
const publicIntegrationAuth = async (
  req: PublicIntegrationRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'Token não fornecido',
        details: 'O token do link de integração é obrigatório'
      });
    }

    // Buscar o link de integração pelo token
    const { data: integrationLink, error: linkError } = await supabase
      .from('public_integration_links')
      .select('*')
      .eq('token', token)
      .single();

    if (linkError || !integrationLink) {
      return res.status(404).json({
        error: 'Link inválido',
        details: 'O link de integração não foi encontrado ou é inválido'
      });
    }

    // Verificar se o link está ativo
    if (!integrationLink.is_active) {
      return res.status(403).json({
        error: 'Link desativado',
        details: 'Este link de integração foi desativado'
      });
    }

    // Verificar se o link não expirou
    const now = new Date();
    const expiresAt = new Date(integrationLink.expires_at);
    
    if (expiresAt <= now) {
      return res.status(403).json({
        error: 'Link expirado',
        details: 'Este link de integração expirou'
      });
    }

    // Verificar se o limite de usos foi atingido
    if (integrationLink.max_uses !== null && integrationLink.max_uses !== undefined) {
      if (integrationLink.current_uses >= integrationLink.max_uses) {
        return res.status(403).json({
          error: 'Limite de usos atingido',
          details: 'Este link de integração atingiu o número máximo de cadastros permitidos'
        });
      }
    }

    // Buscar informações da igreja para validação adicional
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', integrationLink.church_id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'A igreja associada a este link não foi encontrada'
      });
    }

    // Adicionar informações ao request para uso nos controllers
    req.integrationLink = integrationLink as any;
    req.churchId = integrationLink.church_id;

    next();

  } catch (error) {
    console.error('Erro na autenticação pública de integração:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export default publicIntegrationAuth;

