import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { PublicRegistrationRequest, Member } from '../types';
import { validateMember } from '../validators/memberValidator';
import { normalizeMemberDates } from '../utils/dateNormalizer';
import { checkMemberLimit } from '../utils/planLimits';
import { validateCongregationBelongsToChurch } from '../utils/congregationValidation';

/**
 * Valida um link de registro público (sem criar membro)
 * Usado para verificar se o link é válido antes de exibir o formulário
 */
export const validateRegistrationLink = async (
  req: PublicRegistrationRequest,
  res: Response
) => {
  try {
    const registrationLink = req.registrationLink!;
    const churchId = req.churchId!;

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

    const limitCheck = await checkMemberLimit(churchId, 1);
    if (!limitCheck.canAdd) {
      return res.status(403).json({
        valid: false,
        error: 'Limite de membros atingido',
        details: 'O limite de membros da igreja foi atingido. Entre em contato com a administração.',
        church_name: church.name,
        blocked_reason: 'plan_limit',
      });
    }

    const { data: congregations } = await supabase
      .from('congregations')
      .select('id, name')
      .eq('church_id', churchId)
      .eq('active', true)
      .order('name');

    res.json({
      valid: true,
      church_name: church.name,
      expires_at: registrationLink.expires_at,
      max_uses: registrationLink.max_uses,
      current_uses: registrationLink.current_uses,
      remaining_uses: registrationLink.max_uses
        ? registrationLink.max_uses - registrationLink.current_uses
        : null,
      congregations: congregations || [],
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
 * Lista grupos disponíveis para autocadastro público (filtrados por congregação)
 */
export const listPublicRegistrationGroups = async (
  req: PublicRegistrationRequest,
  res: Response
) => {
  try {
    const churchId = req.churchId!;
    const congregation_id = (req.query.congregation_id as string) || 'sede';

    let query = supabase
      .from('groups')
      .select(`
        id,
        name,
        type,
        congregations (
          id,
          name
        )
      `)
      .eq('church_id', churchId)
      .eq('status', true)
      .order('type')
      .order('name');

    if (congregation_id === 'sede') {
      query = query.is('congregation_id', null);
    } else {
      const congregationCheck = await validateCongregationBelongsToChurch(congregation_id, churchId);
      if (!congregationCheck.valid) {
        return res.status(400).json({
          error: 'Congregação inválida',
          details: congregationCheck.message,
        });
      }
      query = query.eq('congregation_id', congregation_id);
    }

    const { data: groups, error } = await query;

    if (error) {
      return res.status(400).json({
        error: 'Erro ao buscar grupos',
        details: error.message,
      });
    }

    res.json(groups || []);
  } catch (error) {
    console.error('Erro ao listar grupos públicos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
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
    const registrationLink = req.registrationLink!;
    const churchId = req.churchId!;

    const limitCheck = await checkMemberLimit(churchId, 1);
    if (!limitCheck.canAdd) {
      await supabase
        .from('public_registration_links')
        .update({ is_active: false })
        .eq('id', registrationLink.id);

      return res.status(403).json({
        error: 'Limite de membros atingido',
        details: 'O limite de membros da igreja foi atingido. Entre em contato com a administração para mais informações.',
      });
    }

    const { error: validationError } = validateMember(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    const normalizedData = normalizeMemberDates(req.body);

    if (normalizedData.name && typeof normalizedData.name === 'string' && normalizedData.name.trim()) {
      const { data: duplicate, error: checkError } = await supabase
        .from('members')
        .select('id, name')
        .eq('church_id', churchId)
        .ilike('name', normalizedData.name.trim())
        .limit(1);

      if (!checkError && duplicate && duplicate.length > 0) {
        return res.status(400).json({
          error: 'Membro já cadastrado',
          details: 'Já existe um membro cadastrado com este nome completo.'
        });
      }
    }

    const congregationId = (normalizedData.congregation_id as string | null | undefined)
      || registrationLink.default_congregation_id;

    if (congregationId) {
      const congregationCheck = await validateCongregationBelongsToChurch(congregationId, churchId);
      if (!congregationCheck.valid) {
        return res.status(400).json({
          error: 'Congregação inválida',
          details: congregationCheck.message,
        });
      }
    }

    const memberData: Partial<Member> = {
      ...normalizedData,
      church_id: churchId,
      active: true,
      congregation_id: congregationId ?? undefined,
      children: normalizedData.children && Array.isArray(normalizedData.children)
        ? normalizedData.children
        : []
    };

    const { groups, ...memberDataWithoutGroups } = memberData as Record<string, unknown> & { groups?: string[] };
    const finalMemberData = memberDataWithoutGroups;

    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert([finalMemberData])
      .select()
      .single();

    if (memberError) {
      console.error('Erro ao criar membro via link público:', memberError);
      return res.status(400).json({
        error: 'Erro ao criar membro',
        details: memberError.message
      });
    }

    if (groups && Array.isArray(groups) && groups.length > 0 && member.id) {
      for (const groupId of groups) {
        try {
          const { data: group } = await supabase
            .from('groups')
            .select('id')
            .eq('id', groupId)
            .eq('church_id', churchId)
            .single();

          if (group) {
            const { data: existingLink } = await supabase
              .from('member_groups')
              .select('id')
              .eq('member_id', member.id)
              .eq('group_id', groupId)
              .single();

            if (!existingLink) {
              await supabase
                .from('member_groups')
                .insert([{
                  member_id: member.id,
                  group_id: groupId
                }]);
            }
          }
        } catch (groupError) {
          console.error('Erro ao vincular grupo:', groupError);
        }
      }
    }

    if (registrationLink.max_uses !== null) {
      const { data: claimed, error: claimError } = await supabase
        .from('public_registration_links')
        .update({ current_uses: registrationLink.current_uses + 1 })
        .eq('id', registrationLink.id)
        .eq('current_uses', registrationLink.current_uses)
        .lt('current_uses', registrationLink.max_uses)
        .select('current_uses')
        .single();

      if (claimError || !claimed) {
        await supabase.from('members').delete().eq('id', member.id);
        return res.status(409).json({
          error: 'Limite de usos atingido',
          details: 'O limite máximo de cadastros deste link foi atingido. Tente novamente ou contate a igreja.'
        });
      }
    } else {
      const { error: updateError } = await supabase
        .from('public_registration_links')
        .update({ current_uses: registrationLink.current_uses + 1 })
        .eq('id', registrationLink.id);

      if (updateError) {
        console.error('Erro ao atualizar contador de usos (sem limite):', updateError);
      }
    }

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
