import { Response } from 'express';
import { randomBytes } from 'crypto';
import supabase from '../services/supabase';
import { AuthRequest, PublicIntegrationLink, CreateIntegrationLinkData } from '../types';
import { logAudit } from '../utils/auditLogger';

/**
 * Gera um token único e seguro para o link de integração
 */
const generateSecureToken = (): string => {
  // Gera um token de 32 bytes (256 bits) em base64
  // Remove caracteres especiais e deixa apenas alfanuméricos
  return randomBytes(32)
    .toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, 48); // Limita a 48 caracteres para URLs mais curtas
};

/**
 * Lista todos os links de integração da igreja do usuário
 */
export const listIntegrationLinks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Buscar a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Buscar todos os links da igreja
    const { data: links, error: linksError } = await supabase
      .from('public_integration_links')
      .select('*')
      .eq('church_id', church.id)
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('Erro ao buscar links:', linksError);
      return res.status(500).json({
        error: 'Erro ao buscar links de integração',
        details: linksError.message
      });
    }

    // Construir URLs completas para cada link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const linksWithUrls = links.map(link => ({
      ...link,
      url: `${frontendUrl}/public/integration/${link.token}`,
      is_expired: new Date(link.expires_at) <= new Date(),
      remaining_uses: link.max_uses 
        ? link.max_uses - link.current_uses 
        : null,
      is_limit_reached: link.max_uses 
        ? link.current_uses >= link.max_uses 
        : false
    }));

    res.json({
      data: linksWithUrls,
      count: linksWithUrls.length
    });

  } catch (error) {
    console.error('Erro ao listar links de integração:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Busca um link de integração específico
 */
export const getIntegrationLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    // Buscar a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Buscar o link
    const { data: link, error: linkError } = await supabase
      .from('public_integration_links')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (linkError || !link) {
      return res.status(404).json({
        error: 'Link não encontrado',
        details: 'O link de integração solicitado não foi encontrado'
      });
    }

    // Construir URL completa
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const linkWithUrl = {
      ...link,
      url: `${frontendUrl}/public/integration/${link.token}`
    };

    res.json(linkWithUrl);

  } catch (error) {
    console.error('Erro ao buscar link de integração:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Cria um novo link de integração pública
 */
export const createIntegrationLink = async (
  req: AuthRequest<{}, {}, CreateIntegrationLinkData>,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Validar data de expiração
    const expiresAt = new Date(req.body.expires_at);
    if (isNaN(expiresAt.getTime())) {
      return res.status(400).json({
        error: 'Data inválida',
        details: 'A data de expiração fornecida é inválida'
      });
    }

    if (expiresAt <= new Date()) {
      return res.status(400).json({
        error: 'Data inválida',
        details: 'A data de expiração deve ser no futuro'
      });
    }

    // Validar max_uses se fornecido
    if (req.body.max_uses !== null && req.body.max_uses !== undefined) {
      if (req.body.max_uses < 1) {
        return res.status(400).json({
          error: 'Número de usos inválido',
          details: 'O número máximo de usos deve ser maior que zero'
        });
      }
    }

    // Buscar a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Gerar token único
    let token = generateSecureToken();
    let attempts = 0;
    const maxAttempts = 10;

    // Garantir que o token seja único (verificar colisões)
    while (attempts < maxAttempts) {
      const { data: existingLink } = await supabase
        .from('public_integration_links')
        .select('id')
        .eq('token', token)
        .single();

      if (!existingLink) {
        break; // Token único encontrado
      }

      token = generateSecureToken();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({
        error: 'Erro ao gerar token',
        details: 'Não foi possível gerar um token único. Tente novamente.'
      });
    }

    // Criar o link
    const linkData = {
      church_id: church.id,
      token,
      expires_at: req.body.expires_at,
      max_uses: req.body.max_uses || null,
      current_uses: 0,
      is_active: true,
      created_by: req.user.id,
      notes: req.body.notes || null
    };

    const { data: link, error: linkError } = await supabase
      .from('public_integration_links')
      .insert([linkData])
      .select()
      .single();

    if (linkError) {
      console.error('Erro ao criar link:', linkError);
      return res.status(400).json({
        error: 'Erro ao criar link de integração',
        details: linkError.message
      });
    }

    // Construir URL completa
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const linkWithUrl = {
      ...link,
      url: `${frontendUrl}/public/integration/${link.token}`
    };

    await logAudit(req, {
      entity: 'public_integration_link',
      entityId: link.id,
      action: 'create',
      changesAfter: linkWithUrl
    });

    res.status(201).json(linkWithUrl);

  } catch (error) {
    console.error('Erro ao criar link de integração:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Atualiza um link de integração existente
 */
export const updateIntegrationLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    // Buscar a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Buscar o link existente
    const { data: existingLink, error: fetchError } = await supabase
      .from('public_integration_links')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (fetchError || !existingLink) {
      return res.status(404).json({
        error: 'Link não encontrado',
        details: 'O link de integração solicitado não foi encontrado'
      });
    }

    // Validar data de expiração se fornecida
    if (req.body.expires_at) {
      const expiresAt = new Date(req.body.expires_at);
      if (isNaN(expiresAt.getTime())) {
        return res.status(400).json({
          error: 'Data inválida',
          details: 'A data de expiração fornecida é inválida'
        });
      }
    }

    // Validar max_uses se fornecido
    if (req.body.max_uses !== null && req.body.max_uses !== undefined) {
      if (req.body.max_uses < 1) {
        return res.status(400).json({
          error: 'Número de usos inválido',
          details: 'O número máximo de usos deve ser maior que zero'
        });
      }
    }

    // Preparar dados de atualização
    const updateData: Partial<PublicIntegrationLink> = {};
    if (req.body.expires_at) updateData.expires_at = new Date(req.body.expires_at) as any;
    if (req.body.max_uses !== undefined) updateData.max_uses = req.body.max_uses;
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes || null;

    // Atualizar o link
    const { data: updatedLink, error: updateError } = await supabase
      .from('public_integration_links')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', church.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar link:', updateError);
      return res.status(400).json({
        error: 'Erro ao atualizar link de integração',
        details: updateError.message
      });
    }

    // Construir URL completa
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const linkWithUrl = {
      ...updatedLink,
      url: `${frontendUrl}/public/integration/${updatedLink.token}`
    };

    await logAudit(req, {
      entity: 'public_integration_link',
      entityId: existingLink.id,
      action: 'update',
      changesBefore: existingLink,
      changesAfter: linkWithUrl
    });

    res.json(linkWithUrl);

  } catch (error) {
    console.error('Erro ao atualizar link de integração:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Desativa um link de integração (soft delete)
 */
export const deleteIntegrationLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    // Buscar a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Buscar o link existente
    const { data: existingLink, error: fetchError } = await supabase
      .from('public_integration_links')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (fetchError || !existingLink) {
      return res.status(404).json({
        error: 'Link não encontrado',
        details: 'O link de integração solicitado não foi encontrado'
      });
    }

    // Desativar o link (soft delete)
    const { data: updatedLink, error: updateError } = await supabase
      .from('public_integration_links')
      .update({ is_active: false })
      .eq('id', id)
      .eq('church_id', church.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao desativar link:', updateError);
      return res.status(400).json({
        error: 'Erro ao desativar link de integração',
        details: updateError.message
      });
    }

    await logAudit(req, {
      entity: 'public_integration_link',
      entityId: existingLink.id,
      action: 'delete',
      changesBefore: existingLink,
      changesAfter: updatedLink
    });

    res.json({
      message: 'Link de integração desativado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao desativar link de integração:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

