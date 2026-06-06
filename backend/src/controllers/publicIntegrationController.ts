import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { PublicIntegrationRequest, IntegrationMember } from '../types';
import { validateIntegrationMember } from '../validators/integrationMemberValidator';
import { error as logError } from '../utils/logger';
import { normalizeMemberDates } from '../utils/dateNormalizer';
import { validateCongregationBelongsToChurch } from '../utils/congregationValidation';

/**
 * Valida um link de integração pública (sem criar integrante)
 * 
 * Usado para verificar se o link é válido antes de exibir o formulário público.
 * O middleware já validou o link e adicionou ao request.
 * 
 * @param req - Request com integrationLink e churchId já validados pelo middleware
 * @param res - Response com informações do link e igreja
 * @returns JSON com valid (true), church_name, expires_at, max_uses, current_uses, remaining_uses
 */
export const validateIntegrationLink = async (
  req: PublicIntegrationRequest,
  res: Response
) => {
  try {
    // O middleware já validou o link e adicionou ao request
    const integrationLink = req.integrationLink!;
    const churchId = req.churchId!;

    // Buscar informações da igreja
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'A igreja associada a este link não foi encontrada'
      });
    }

    // Buscar congregações da igreja para o formulário público (sem autenticação)
    const { data: congregations } = await supabase
      .from('congregations')
      .select('id, name')
      .eq('church_id', churchId)
      .eq('active', true)
      .order('name');

    res.json({
      valid: true,
      church_name: church.name,
      expires_at: integrationLink.expires_at,
      max_uses: integrationLink.max_uses,
      current_uses: integrationLink.current_uses,
      remaining_uses: integrationLink.max_uses 
        ? integrationLink.max_uses - integrationLink.current_uses 
        : null,
      congregations: congregations || []
    });

  } catch (error) {
    logError('Erro ao validar link de integração:', error);
    res.status(500).json({
      error: 'Erro ao validar link',
      details: error instanceof Error ? error.message : 'Não foi possível validar o link de integração. Verifique se o link está correto.'
    });
  }
};

/**
 * Cria um novo integrante através de link público de integração
 * 
 * Processo:
 * 1. Valida dados do integrante
 * 2. Valida limite de usos do link (ANTES de criar)
 * 3. Normaliza datas
 * 4. Cria integrante
 * 5. Incrementa contador de usos do link
 * 
 * @param req - Request com integrationLink e churchId já validados pelo middleware, e dados do integrante no body
 * @param res - Response com integrante criado
 * @returns JSON com mensagem de sucesso, integrationMember e church_name (status 201) ou erro
 */
export const createIntegrationMemberViaPublicLink = async (
  req: PublicIntegrationRequest,
  res: Response
) => {
  try {
    // O middleware já validou o link e adicionou ao request
    const integrationLink = req.integrationLink!;
    const churchId = req.churchId!;

    // Validar dados do integrante
    const { error: validationError } = validateIntegrationMember(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    // ✅ Validar limite de usos ANTES de criar o integrante
    if (integrationLink.max_uses !== null && integrationLink.max_uses !== undefined && integrationLink.max_uses > 0) {
      if (integrationLink.current_uses >= integrationLink.max_uses) {
        return res.status(403).json({
          error: 'Limite de usos atingido',
          details: 'Este link de integração atingiu o número máximo de usos permitidos'
        });
      }
    }

    // Normalizar datas antes de criar o integrante (evita problemas de timezone)
    const normalizedData = normalizeMemberDates(req.body as unknown as Record<string, unknown>);

    if (normalizedData.expected_congregation_id) {
      const congregationCheck = await validateCongregationBelongsToChurch(
        normalizedData.expected_congregation_id as string,
        churchId
      );
      if (!congregationCheck.valid) {
        return res.status(400).json({
          error: 'Congregação inválida',
          details: congregationCheck.message,
        });
      }
    }

    // Preparar dados do integrante
    const integrationMemberData: Partial<IntegrationMember> = {
      ...normalizedData,
      church_id: churchId,
      status: 'em_progresso',
      // Campos não permitidos no formulário público devem ser undefined
      expected_admission_type: undefined,
      mentor_id: null,
      notes: null
    };

    // Criar o integrante
    const { data: integrationMember, error: memberError } = await supabase
      .from('integration_members')
      .insert([integrationMemberData])
      .select()
      .single();

    if (memberError) {
      logError('Erro ao criar integrante via link público:', memberError);
      return res.status(400).json({
        error: 'Erro ao criar integrante',
        details: memberError.message
      });
    }

    if (integrationLink.max_uses !== null && integrationLink.max_uses !== undefined) {
      const { error: updateError, count: updatedCount } = await supabase
        .from('public_integration_links')
        .update({ current_uses: integrationLink.current_uses + 1 }, { count: 'exact' })
        .eq('id', integrationLink.id)
        .eq('current_uses', integrationLink.current_uses)
        .lt('current_uses', integrationLink.max_uses);

      if (updateError || updatedCount === 0) {
        await supabase.from('integration_members').delete().eq('id', integrationMember.id);
        return res.status(409).json({
          error: 'Limite de usos atingido',
          details: 'Este link atingiu o número máximo de usos. Seu cadastro não foi registrado.'
        });
      }
    } else {
      const { error: updateError } = await supabase
        .from('public_integration_links')
        .update({ current_uses: integrationLink.current_uses + 1 })
        .eq('id', integrationLink.id);

      if (updateError) {
        logError('Erro ao atualizar contador de usos (sem limite):', updateError);
      }
    }

    // Buscar informações da igreja para resposta
    const { data: church } = await supabase
      .from('churches')
      .select('name')
      .eq('id', churchId)
      .single();

    res.status(201).json({
      message: 'Integrante cadastrado com sucesso',
      integrationMember,
      church_name: church?.name || 'Igreja'
    });

  } catch (error) {
    logError('Erro ao criar integrante via link público:', error);
    res.status(500).json({
      error: 'Erro ao realizar cadastro',
      details: error instanceof Error ? error.message : 'Não foi possível completar seu cadastro. Verifique os dados e tente novamente.'
    });
  }
};

