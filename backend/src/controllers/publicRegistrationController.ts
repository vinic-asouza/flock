import { Response } from 'express';
import supabase from '../services/supabase';
import { PublicRegistrationRequest, Member } from '../types';
import { validateMember } from '../validators/memberValidator';
import { normalizeMemberDates } from '../utils/dateNormalizer';
import { checkMemberLimit } from '../utils/planLimits';

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

    // Verificar limite de membros
    const limitCheck = await checkMemberLimit(churchId, 1);
    if (!limitCheck.canAdd) {
      // Desativar o link se o limite foi atingido
      await supabase
        .from('public_registration_links')
        .update({ is_active: false })
        .eq('id', registrationLink.id);

      return res.status(403).json({
        valid: false,
        error: 'Limite de membros atingido',
        details: 'O limite de membros da igreja foi atingido. Entre em contato com a administração.',
        church_name: church.name,
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

    // Verificar limite de membros ANTES de validar os dados
    const limitCheck = await checkMemberLimit(churchId, 1);
    if (!limitCheck.canAdd) {
      // Desativar o link se o limite foi atingido
      await supabase
        .from('public_registration_links')
        .update({ is_active: false })
        .eq('id', registrationLink.id);

      return res.status(403).json({
        error: 'Limite de membros atingido',
        details: 'O limite de membros da igreja foi atingido. Entre em contato com a administração para mais informações.',
      });
    }

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

    // ACHADO 06: substituído loop O(n) por ilike query — mesma abordagem do memberController autenticado
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

    // Preparar dados do membro
    // Converter null para undefined para compatibilidade com o tipo Member
    const congregationId = (normalizedData.congregation_id as string | null | undefined) || registrationLink.default_congregation_id;

    const memberData: Partial<Member> = {
      ...normalizedData,
      church_id: churchId,
      active: true,
      // Usar congregação padrão do link se não foi especificada
      congregation_id: congregationId ?? undefined,
      // Garantir que children seja um array JSON válido
      children: normalizedData.children && Array.isArray(normalizedData.children) 
        ? normalizedData.children 
        : []
    };

    // Separar grupos dos dados do membro
    const { groups, ...memberDataWithoutGroups } = memberData as any;
    const finalMemberData = memberDataWithoutGroups;

    // Criar o membro
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

    // Vincular grupos após criar membro
    if (groups && Array.isArray(groups) && groups.length > 0 && member.id) {
      for (const groupId of groups) {
        try {
          // Verificar se o grupo existe e pertence à igreja
          const { data: group } = await supabase
            .from('groups')
            .select('id')
            .eq('id', groupId)
            .eq('church_id', churchId)
            .single();

          if (group) {
            // Verificar se já está vinculado
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
          // Não falhar o processo se houver erro ao vincular grupos
        }
      }
    }

    // ACHADO 02: incremento atômico com optimistic locking (move para APÓS member criado,
    // mas com condição eq(current_uses) que garante atomicidade:
    // se outro request já incrementou, esta atualização afeta 0 linhas e retornamos erro).
    // O incremento ocorre APÓS o insert para garantir que só contabilizamos cadastros reais.
    if (registrationLink.max_uses !== null) {
      const { data: claimed, error: claimError } = await supabase
        .from('public_registration_links')
        .update({ current_uses: registrationLink.current_uses + 1 })
        .eq('id', registrationLink.id)
        .eq('current_uses', registrationLink.current_uses) // lock otimístico
        .lt('current_uses', registrationLink.max_uses)     // guarda extra: não ultrapassar
        .select('current_uses')
        .single();

      if (claimError || !claimed) {
        // Outro request chegou primeiro — desfazer o membro criado (rollback)
        await supabase.from('members').delete().eq('id', member.id);
        return res.status(400).json({
          error: 'Limite de usos atingido',
          details: 'O limite máximo de cadastros deste link foi atingido. Tente novamente ou contate a igreja.'
        });
      }
    } else {
      // Sem limite de usos — incremento simples (sem condição)
      const { error: updateError } = await supabase
        .from('public_registration_links')
        .update({ current_uses: registrationLink.current_uses + 1 })
        .eq('id', registrationLink.id);

      if (updateError) {
        console.error('Erro ao atualizar contador de usos (sem limite):', updateError);
      }
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

