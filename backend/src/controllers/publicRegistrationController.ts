import { Response } from 'express';
import supabase from '../services/supabase';
import { PublicRegistrationRequest, Member } from '../types';
import { validateMember } from '../validators/memberValidator';
import { normalizeMemberDates } from '../utils/dateNormalizer';

/**
 * Valida um link de registro público (sem criar membro)
 * Usado para verificar se o link é válido antes de exibir o formulário
 */
export const validateRegistrationLink = async (
  req: PublicRegistrationRequest,
  res: Response
) => {
  try {
    // O middleware já validou o link e adicionou ao request
    const registrationLink = req.registrationLink!;
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
      expires_at: registrationLink.expires_at,
      max_uses: registrationLink.max_uses,
      current_uses: registrationLink.current_uses,
      remaining_uses: registrationLink.max_uses 
        ? registrationLink.max_uses - registrationLink.current_uses 
        : null
    });

  } catch (error) {
    console.error('Erro ao validar link de registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Cria um novo membro através de link público de registro
 */
export const createMemberViaPublicLink = async (
  req: PublicRegistrationRequest,
  res: Response
) => {
  try {
    // O middleware já validou o link e adicionou ao request
    const registrationLink = req.registrationLink!;
    const churchId = req.churchId!;

    // Validar dados do membro
    const { error: validationError } = validateMember(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    // Normalizar datas antes de criar o membro (evita problemas de timezone)
    const normalizedData = normalizeMemberDates(req.body);

    // Preparar dados do membro
    // Converter null para undefined para compatibilidade com o tipo Member
    const congregationId = (normalizedData.congregation_id as string | null | undefined) || registrationLink.default_congregation_id;
    const roleId = (normalizedData.role_id as string | null | undefined) || registrationLink.default_role_id;

    const memberData: Partial<Member> = {
      ...normalizedData,
      church_id: churchId,
      active: true,
      // Usar congregação padrão do link se não foi especificada
      congregation_id: congregationId ?? undefined,
      // Usar função padrão do link se não foi especificada
      role_id: roleId ?? undefined,
      // Garantir que children seja um array JSON válido
      children: normalizedData.children && Array.isArray(normalizedData.children) 
        ? normalizedData.children 
        : []
    };

    // Criar o membro
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert([memberData])
      .select()
      .single();

    if (memberError) {
      console.error('Erro ao criar membro via link público:', memberError);
      return res.status(400).json({
        error: 'Erro ao criar membro',
        details: memberError.message
      });
    }

    // Incrementar contador de usos do link
    const { error: updateError } = await supabase
      .from('public_registration_links')
      .update({ 
        current_uses: registrationLink.current_uses + 1 
      })
      .eq('id', registrationLink.id);

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
      message: 'Membro cadastrado com sucesso',
      member,
      church_name: church?.name || 'Igreja'
    });

  } catch (error) {
    console.error('Erro ao criar membro via link público:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

