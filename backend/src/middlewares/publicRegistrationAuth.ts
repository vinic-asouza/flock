import { Response, NextFunction } from 'express';
import supabase from '../services/supabase';
import { PublicRegistrationRequest } from '../types';

/**
 * Middleware para autenticação de registro público via token de link
 * Valida o token do link sem exigir login do usuário
 */
const publicRegistrationAuth = async (
  req: PublicRegistrationRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'Token não fornecido',
        details: 'O token do link de registro é obrigatório'
      });
    }

    // Buscar o link de registro pelo token
    const { data: registrationLink, error: linkError } = await supabase
      .from('public_registration_links')
      .select('*')
      .eq('token', token)
      .single();

    if (linkError || !registrationLink) {
      return res.status(404).json({
        error: 'Link inválido',
        details: 'O link de registro não foi encontrado ou é inválido'
      });
    }

    // Verificar se o link está ativo
    if (!registrationLink.is_active) {
      return res.status(403).json({
        error: 'Link desativado',
        details: 'Este link de registro foi desativado'
      });
    }

    // Verificar se o link não expirou
    const now = new Date();
    const expiresAt = new Date(registrationLink.expires_at);
    
    if (expiresAt <= now) {
      return res.status(403).json({
        error: 'Link expirado',
        details: 'Este link de registro expirou'
      });
    }

    // Verificar se o limite de usos foi atingido
    if (registrationLink.max_uses !== null && registrationLink.max_uses !== undefined) {
      if (registrationLink.current_uses >= registrationLink.max_uses) {
        return res.status(403).json({
          error: 'Limite de usos atingido',
          details: 'Este link de registro atingiu o número máximo de cadastros permitidos'
        });
      }
    }

    // Buscar informações da igreja para validação adicional
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', registrationLink.church_id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'A igreja associada a este link não foi encontrada'
      });
    }

    // Adicionar informações ao request para uso nos controllers
    req.registrationLink = registrationLink as any;
    req.churchId = registrationLink.church_id;

    next();

  } catch (error) {
    console.error('Erro na autenticação pública:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export default publicRegistrationAuth;

