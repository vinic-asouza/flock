import { Response } from 'express';
import { randomBytes } from 'crypto';
import supabase from '../services/supabase';
import { AuthRequest, CreateRegistrationLinkData, PublicRegistrationLink } from '../types';
import { validateRegistrationLink } from '../validators/registrationLinkValidator';
import { logAudit } from '../utils/auditLogger';

/**
 * Gera um token único e seguro para o link de registro
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
 * Lista todos os links de registro da igreja do usuário
 */
export const listRegistrationLinks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const churchId = req.church!.churchId;

    // Buscar todos os links da igreja
    const { data: links, error: linksError } = await supabase
      .from('public_registration_links')
      .select('*')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('Erro ao buscar links:', linksError);
      return res.status(500).json({
        error: 'Erro ao buscar links de registro',
        details: linksError.message
      });
    }

    // Construir URLs completas para cada link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const linksWithUrls = links.map(link => ({
      ...link,
      url: `${frontendUrl}/public/register/${link.token}`,
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
    console.error('Erro ao listar links de registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Busca um link de registro específico
 */
export const getRegistrationLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const churchId = req.church!.churchId;

    // Buscar o link específico
    const { data: link, error: linkError } = await supabase
      .from('public_registration_links')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (linkError || !link) {
      return res.status(404).json({
        error: 'Link não encontrado',
        details: 'O link de registro solicitado não foi encontrado'
      });
    }

    // Construir URL completa
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const linkWithUrl = {
      ...link,
      url: `${frontendUrl}/public/register/${link.token}`,
      is_expired: new Date(link.expires_at) <= new Date(),
      remaining_uses: link.max_uses 
        ? link.max_uses - link.current_uses 
        : null,
      is_limit_reached: link.max_uses 
        ? link.current_uses >= link.max_uses 
        : false
    };

    res.json(linkWithUrl);

  } catch (error) {
    console.error('Erro ao buscar link de registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Cria um novo link de registro público
 */
export const createRegistrationLink = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Validar dados
    const { error: validationError } = validateRegistrationLink(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    const churchId = req.church!.churchId;

    // Validar se as referências (congregação e função) pertencem à igreja
    if (req.body.default_congregation_id) {
      const { data: congregation, error: congError } = await supabase
        .from('congregations')
        .select('id')
        .eq('id', req.body.default_congregation_id)
        .eq('church_id', churchId)
        .single();

      if (congError || !congregation) {
        return res.status(400).json({
          error: 'Congregação inválida',
          details: 'A congregação especificada não pertence à sua igreja'
        });
      }
    }

    // Gerar token único
    let token = generateSecureToken();
    let attempts = 0;
    const maxAttempts = 10;

    // Garantir que o token seja único (verificar colisões)
    while (attempts < maxAttempts) {
      const { data: existingLink } = await supabase
        .from('public_registration_links')
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
      church_id: churchId,
      token,
      expires_at: req.body.expires_at,
      max_uses: req.body.max_uses || null,
      current_uses: 0,
      is_active: true,
      created_by: req.user.id,
      default_congregation_id: req.body.default_congregation_id || null,
      notes: req.body.notes || null
    };

    const { data: link, error: linkError } = await supabase
      .from('public_registration_links')
      .insert([linkData])
      .select()
      .single();

    if (linkError) {
      console.error('Erro ao criar link:', linkError);
      return res.status(400).json({
        error: 'Erro ao criar link de registro',
        details: linkError.message
      });
    }

    // Construir URL completa
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const linkWithUrl = {
      ...link,
      url: `${frontendUrl}/public/register/${link.token}`
    };

    res.status(201).json(linkWithUrl);

  } catch (error) {
    console.error('Erro ao criar link de registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Atualiza um link de registro existente
 */
export const updateRegistrationLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const churchId = req.church!.churchId;

    // Verificar se o link existe e pertence à igreja
    const { data: existingLink, error: checkError } = await supabase
      .from('public_registration_links')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (checkError || !existingLink) {
      return res.status(404).json({
        error: 'Link não encontrado',
        details: 'O link de registro solicitado não foi encontrado'
      });
    }

    // Validar dados se fornecidos
    if (req.body.expires_at || req.body.max_uses !== undefined) {
      // Converter expires_at para string ISO se necessário
      const expiresAtString = req.body.expires_at 
        ? req.body.expires_at 
        : (existingLink.expires_at instanceof Date 
          ? existingLink.expires_at.toISOString() 
          : typeof existingLink.expires_at === 'string'
          ? existingLink.expires_at
          : new Date(existingLink.expires_at).toISOString());

      const updateData: CreateRegistrationLinkData = {
        expires_at: expiresAtString,
        max_uses: req.body.max_uses !== undefined ? req.body.max_uses : existingLink.max_uses,
        default_congregation_id: req.body.default_congregation_id ?? existingLink.default_congregation_id ?? null,
        notes: req.body.notes ?? existingLink.notes ?? null
      };

      const { error: validationError } = validateRegistrationLink(updateData);
      if (validationError) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: validationError.details.map(detail => detail.message)
        });
      }
    }

    // Validar referências se fornecidas
    if (req.body.default_congregation_id !== undefined) {
      if (req.body.default_congregation_id) {
        const { data: congregation, error: congError } = await supabase
          .from('congregations')
          .select('id')
          .eq('id', req.body.default_congregation_id)
          .eq('church_id', churchId)
          .single();

        if (congError || !congregation) {
          return res.status(400).json({
            error: 'Congregação inválida',
            details: 'A congregação especificada não pertence à sua igreja'
          });
        }
      }
    }

    // Preparar dados de atualização
    const updateData: Partial<PublicRegistrationLink> = {
      ...(req.body.expires_at && { expires_at: new Date(req.body.expires_at) }),
      ...(req.body.max_uses !== undefined && { max_uses: req.body.max_uses }),
      ...(req.body.is_active !== undefined && { is_active: req.body.is_active }),
      ...(req.body.default_congregation_id !== undefined && { 
        default_congregation_id: req.body.default_congregation_id || null 
      }),
      ...(req.body.notes !== undefined && { notes: req.body.notes || null })
    };

    // Atualizar o link
    const { data: link, error: linkError } = await supabase
      .from('public_registration_links')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', churchId)
      .select()
      .single();

    if (linkError) {
      console.error('Erro ao atualizar link:', linkError);
      return res.status(400).json({
        error: 'Erro ao atualizar link de registro',
        details: linkError.message
      });
    }

    // Construir URL completa
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const linkWithUrl = {
      ...link,
      url: `${frontendUrl}/public/register/${link.token}`
    };

    res.json(linkWithUrl);

  } catch (error) {
    console.error('Erro ao atualizar link de registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Desativa um link de registro (soft delete)
 */
export const deactivateRegistrationLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const churchId = req.church!.churchId;

    // Verificar se o link existe e pertence à igreja
    const { data: existingLink, error: checkError } = await supabase
      .from('public_registration_links')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (checkError || !existingLink) {
      return res.status(404).json({
        error: 'Link não encontrado',
        details: 'O link de registro solicitado não foi encontrado'
      });
    }

    // Desativar o link (soft delete)
    const { data: updatedLink, error: updateError } = await supabase
      .from('public_registration_links')
      .update({ is_active: false })
      .eq('id', id)
      .eq('church_id', churchId)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao desativar link:', updateError);
      return res.status(400).json({
        error: 'Erro ao desativar link de registro',
        details: updateError.message
      });
    }

    await logAudit(req, {
      entity: 'public_registration_link',
      entityId: existingLink.id,
      action: 'deactivate',
      changesBefore: existingLink,
      changesAfter: updatedLink
    });

    res.json({
      message: 'Link de registro desativado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao desativar link de registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Remove permanentemente um link de registro
 */
export const deleteRegistrationLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const churchId = req.church!.churchId;

    // Verificar se o link existe e pertence à igreja
    const { data: existingLink, error: checkError } = await supabase
      .from('public_registration_links')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (checkError || !existingLink) {
      return res.status(404).json({
        error: 'Link não encontrado',
        details: 'O link de registro solicitado não foi encontrado'
      });
    }

    // Remover permanentemente o link
    const { error: deleteError } = await supabase
      .from('public_registration_links')
      .delete()
      .eq('id', id)
      .eq('church_id', churchId);

    if (deleteError) {
      console.error('Erro ao excluir link:', deleteError);
      return res.status(400).json({
        error: 'Erro ao excluir link de registro',
        details: deleteError.message
      });
    }

    await logAudit(req, {
      entity: 'public_registration_link',
      entityId: existingLink.id,
      action: 'delete',
      changesBefore: existingLink,
      changesAfter: null
    });

    res.json({
      message: 'Link de registro excluído permanentemente com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir link de registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

