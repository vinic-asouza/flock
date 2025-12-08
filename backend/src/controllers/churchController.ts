import { Request, Response } from 'express';
import supabase from '../services/supabase';
import { validateChurchUpdate } from '../validators/churchValidator';
import { AuthRequest } from '../types';
import { checkMemberLimit } from '../utils/planLimits';

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
      .eq('user_id', req.user.id)
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

    res.json({
      message: 'Dados da igreja recuperados com sucesso',
      church: churchData
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

    const { cnpj, ...updateData } = req.body;

    // Se o CNPJ foi fornecido, verificar se já existe para outra igreja
    if (cnpj) {
      const { data: existingChurch, error: cnpjCheckError } = await supabase
        .from('churches')
        .select('id, user_id')
        .eq('cnpj', cnpj)
        .neq('user_id', req.user.id) // Excluir a própria igreja
        .single();

      if (cnpjCheckError && cnpjCheckError.code !== 'PGRST116') {
        return res.status(500).json({
          error: 'Erro ao verificar CNPJ',
          details: cnpjCheckError.message
        });
      }

      if (existingChurch) {
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
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: 'Erro ao atualizar igreja',
        details: updateError.message
      });
    }

    res.json({
      message: 'Igreja atualizada com sucesso',
      church: updatedChurch
    });

  } catch (error) {
    console.error('Erro ao atualizar igreja:', error);
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

    // Buscar igreja do usuário
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

    // Verificar limite de membros
    const limitCheck = await checkMemberLimit(church.id, 0);

    res.json({
      currentCount: limitCheck.currentCount,
      limit: limitCheck.limit,
      remaining: limitCheck.remaining,
      planType: limitCheck.planType,
      subscriptionStatus: limitCheck.subscriptionStatus,
      hasActiveSubscription: limitCheck.hasActiveSubscription,
      canAdd: limitCheck.canAdd,
      percentage: limitCheck.limit === Infinity ? 0 : (limitCheck.currentCount / limitCheck.limit) * 100,
    });

  } catch (error) {
    console.error('Erro ao obter limite de membros:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};
