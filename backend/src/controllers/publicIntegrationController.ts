import { Response } from 'express';
import supabase from '../services/supabase';
import { PublicIntegrationRequest, IntegrationMember } from '../types';
import { validateIntegrationMember } from '../validators/integrationMemberValidator';

/**
 * Valida um link de integração pública (sem criar integrante)
 * Usado para verificar se o link é válido antes de exibir o formulário
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

    res.json({
      valid: true,
      church_name: church.name,
      expires_at: integrationLink.expires_at,
      max_uses: integrationLink.max_uses,
      current_uses: integrationLink.current_uses,
      remaining_uses: integrationLink.max_uses 
        ? integrationLink.max_uses - integrationLink.current_uses 
        : null
    });

  } catch (error) {
    console.error('Erro ao validar link de integração:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Cria um novo integrante através de link público de integração
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

    // Preparar dados do integrante
    const integrationMemberData: Partial<IntegrationMember> = {
      ...req.body,
      church_id: churchId,
      status: 'em_progresso',
      // Campos não permitidos no formulário público devem ser null
      expected_admission_type: null,
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
      console.error('Erro ao criar integrante via link público:', memberError);
      return res.status(400).json({
        error: 'Erro ao criar integrante',
        details: memberError.message
      });
    }

    // Incrementar contador de usos do link
    const { error: updateError } = await supabase
      .from('public_integration_links')
      .update({ 
        current_uses: integrationLink.current_uses + 1 
      })
      .eq('id', integrationLink.id);

    if (updateError) {
      console.error('Erro ao atualizar contador de usos:', updateError);
      // Não falhar a requisição se apenas o contador falhar
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
    console.error('Erro ao criar integrante via link público:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

