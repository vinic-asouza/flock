import { Request, Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { validateChurchUpdate } from '../validators/churchValidator';
import { AuthRequest } from '../types';
import { checkMemberLimit } from '../utils/planLimits';
import { logAudit } from '../utils/auditLogger';
import { logError } from '../utils/logger';
import {
  listChurchMembershipsForUser,
  resolveChurchContextForUser,
} from '../services/churchContext';
import { sanitizeChurchForRole } from '../utils/churchDto';
import { getActiveChurchIdFromRequest } from '../services/churchContext';
import { setActiveChurchId } from '../utils/cookieUtils';

/**
 * Buscar dados da igreja do usuário autenticado
 */
export const getChurch = async (req: AuthRequest, res: Response) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Buscar dados da igreja
    const { data: churchData, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('id', req.church!.churchId)
      .single();

    if (churchError) {
      if (churchError.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Igreja não encontrada',
          details: 'Nenhuma igreja foi encontrada para este usuário'
        });
      }
      
      return res.status(500).json({
        error: 'Erro ao buscar igreja',
        details: churchError.message
      });
    }

    const role = req.church!.role;
    res.json({
      message: 'Dados da igreja recuperados com sucesso',
      church: sanitizeChurchForRole(churchData, role),
    });

  } catch (error) {
    console.error('Erro ao buscar igreja:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Atualizar dados da igreja do usuário autenticado
 */
export const updateChurch = async (req: AuthRequest, res: Response) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Validar dados da requisição
    const { error: validationError } = validateChurchUpdate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    // Buscar igreja existente para auditoria (antes de atualizar)
    const { data: existingChurch, error: existingError } = await supabase
      .from('churches')
      .select('*')
      .eq('id', req.church!.churchId)
      .single();

    if (existingError || !existingChurch) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    const { cnpj, ...updateData } = req.body;

    // Se o CNPJ foi fornecido, verificar se já existe para outra igreja
    if (cnpj) {
      const { data: existingChurchWithCNPJ, error: cnpjCheckError } = await supabase
        .from('churches')
        .select('id, user_id')
        .eq('cnpj', cnpj)
        .neq('id', req.church!.churchId) // Excluir a própria igreja
        .single();

      if (cnpjCheckError && cnpjCheckError.code !== 'PGRST116') {
        return res.status(500).json({
          error: 'Erro ao verificar CNPJ',
          details: cnpjCheckError.message
        });
      }

      if (existingChurchWithCNPJ) {
        return res.status(400).json({
          error: 'CNPJ já cadastrado',
          details: 'Já existe uma igreja cadastrada com este CNPJ'
        });
      }
    }

    // Atualizar dados da igreja
    const { data: updatedChurch, error: updateError } = await supabase
      .from('churches')
      .update({
        ...updateData,
        ...(cnpj && { cnpj }) // Só atualizar CNPJ se fornecido
      })
      .eq('id', req.church!.churchId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: 'Erro ao atualizar igreja',
        details: updateError.message
      });
    }

    // Registrar auditoria
    await logAudit(req, {
      entity: 'church',
      entityId: updatedChurch.id,
      action: 'update',
      changesBefore: existingChurch,
      changesAfter: updatedChurch
    });

    res.json({
      message: 'Igreja atualizada com sucesso',
      church: updatedChurch
    });

  } catch (error) {
    logError('Erro ao atualizar igreja:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Obter informações do limite de membros
 */
export const getMemberLimit = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const churchId = req.church!.churchId;

    // Verificar limite de membros
    const limitCheck = await checkMemberLimit(churchId, 0);

    res.json({
      currentCount: limitCheck.currentCount,
      limit: limitCheck.limit,
      remaining: limitCheck.remaining,
      planType: limitCheck.planType,
      subscriptionStatus: limitCheck.subscriptionStatus,
      hasActiveSubscription: limitCheck.hasActiveSubscription,
      isPastDue: limitCheck.isPastDue ?? false,
      canAdd: limitCheck.canAdd,
      message: limitCheck.message,
      percentage: limitCheck.limit === Infinity ? 0 : (limitCheck.currentCount / limitCheck.limit) * 100,
    });

  } catch (error) {
    logError('Erro ao obter limite de membros:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

export const listMemberships = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    const memberships = await listChurchMembershipsForUser(req.user.id);
    const activeChurchId = getActiveChurchIdFromRequest(req);
    res.json({ memberships, activeChurchId: activeChurchId || null });
  } catch (err) {
    console.error('Erro ao listar memberships:', err);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const setActiveChurch = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const { churchId } = req.body as { churchId?: string };
    if (!churchId) {
      return res.status(400).json({
        error: 'churchId é obrigatório',
      });
    }

    const context = await resolveChurchContextForUser(req.user.id, churchId);
    if (!context) {
      return res.status(403).json({
        error: 'Sem acesso a esta igreja',
      });
    }

    setActiveChurchId(res, churchId);

    const { data: churchData, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('id', churchId)
      .single();

    if (churchError || !churchData) {
      return res.status(404).json({ error: 'Igreja não encontrada' });
    }

    res.json({
      message: 'Igreja ativa definida',
      church: sanitizeChurchForRole(churchData, context.role),
      role: context.role,
      activeChurchId: churchId,
    });
  } catch (err) {
    console.error('Erro ao definir igreja ativa:', err);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};
