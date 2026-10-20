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

    if (!registrationLink.default_congregation_id) {
      return res.status(400).json({
        valid: false,
        error: 'Link mal configurado',
        details: 'Este link de registro não tem congregação definida. Solicite um novo link à secretaria da igreja.',
        church_name: church.name,
        blocked_reason: 'missing_congregation',
      });
    }

    // Nota: congregations não tem coluna `active` (só members/groups usam flags)
    const { data: congregation } = await supabase
      .from('congregations')
      .select('id, name, abbreviation')
      .eq('id', registrationLink.default_congregation_id)
      .eq('church_id', churchId)
      .single();

    if (!congregation) {
      return res.status(400).json({
        valid: false,
        error: 'Link mal configurado',
        details: 'A congregação associada a este link não está disponível. Solicite um novo link à secretaria da igreja.',
        church_name: church.name,
        blocked_reason: 'invalid_congregation',
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
        : null,
      default_congregation_id: congregation.id,
      default_congregation: congregation,
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
    const registrationLink = req.registrationLink!;
    const congregation_id = registrationLink.default_congregation_id;

    if (!congregation_id) {
      return res.status(400).json({
        error: 'Link mal configurado',
        details: 'Este link de registro não tem congregação definida.',
      });
    }

    const congregationCheck = await validateCongregationBelongsToChurch(congregation_id, churchId);
    if (!congregationCheck.valid) {
      return res.status(400).json({
        error: 'Congregação inválida',
        details: congregationCheck.message,
      });
    }

    const { data: groups, error } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        congregations (
          id,
          name,
          abbreviation
        )
      `)
      .eq('church_id', churchId)
      .eq('status', true)
      .eq('congregation_id', congregation_id)
      .order('name');

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

    // Congregação vem exclusivamente do link (não aceitar override do body)
    const congregationId = registrationLink.default_congregation_id;

    if (!congregationId) {
      return res.status(400).json({
        error: 'Link mal configurado',
        details: 'Este link de registro não tem congregação definida. Solicite um novo link à secretaria da igreja.'
      });
    }

    const payload = {
      ...req.body,
      congregation_id: congregationId,
    };

    const { error: validationError } = validateMember(payload);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    const normalizedData = normalizeMemberDates(payload);

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

    const congregationCheck = await validateCongregationBelongsToChurch(congregationId, churchId);
    if (!congregationCheck.valid) {
      return res.status(400).json({
        error: 'Congregação inválida',
        details: congregationCheck.message,
      });
    }

    const memberData: Partial<Member> = {
      ...normalizedData,
      church_id: churchId,
      active: true,
      congregation_id: congregationId,
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

    const actorId = registrationLink.created_by
      ?? (
        await supabase
          .from('churches')
          .select('user_id')
          .eq('id', churchId)
          .maybeSingle()
      ).data?.user_id
      ?? null;

    if (actorId && member.id) {
      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: actorId,
        church_id: churchId,
        entity: 'member',
        entity_id: member.id,
        action: 'create',
        changes_before: null,
        changes_after: {
          name: member.name,
          event: 'public_registration',
        },
        ip: null,
        user_agent: 'public-registration-link',
      });
      if (auditError) {
        console.error('Falha ao registrar audit do cadastro público:', auditError);
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
