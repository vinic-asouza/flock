import { Response } from 'express';
import { AuthRequest, CreateParticipantData } from '../types';
import { supabaseAdmin as supabase } from '../services/supabase';
import { addParticipantSchema } from '../validators/calendarParticipantValidator';
import { logError } from '../utils/logger';
import { logAudit } from '../utils/auditLogger';

/**
 * Adiciona um participante (membro ou convidado) a um item do calendário
 * 
 * @param req - Request contendo calendarItemId nos params e dados do participante no body
 * @param res - Response com o participante criado
 * 
 * @remarks
 * - Valida que o item pertence à igreja do usuário
 * - Se for membro, valida pertencimento à igreja e verifica duplicatas
 * - Se for convidado, apenas valida que tem nome
 * - Registra a operação no audit log
 */
export const addParticipant = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Validar dados do participante
    const { error: validationError } = addParticipantSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message
      });
    }

    const { calendarItemId } = req.params;
    const participantData: CreateParticipantData = req.body;

    const churchId = req.church!.churchId;

    // Verificar se o item do calendário pertence à igreja
    const { data: calendarItem, error: itemError } = await supabase
      .from('calendar_items')
      .select('id, church_id')
      .eq('id', calendarItemId)
      .eq('church_id', churchId)
      .single();

    if (itemError || !calendarItem) {
      return res.status(404).json({
        error: 'Item do calendário não encontrado',
        details: 'O item do calendário não existe ou não pertence à sua igreja'
      });
    }

    const hasMemberId = participantData.member_id && participantData.member_id.trim() !== '';
    const hasGuestName = participantData.guest_name && participantData.guest_name.trim() !== '';

    // Se for membro, verificar se ele existe e pertence à igreja
    if (hasMemberId) {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, church_id')
        .eq('id', participantData.member_id!)
        .eq('church_id', churchId)
        .single();

      if (memberError || !member) {
        return res.status(404).json({
          error: 'Membro não encontrado',
          details: 'O membro não existe ou não pertence à sua igreja'
        });
      }

      // Verificar se o membro já é participante
      const { data: existingParticipant } = await supabase
        .from('calendar_participants')
        .select('id')
        .eq('calendar_item_id', calendarItemId)
        .eq('member_id', participantData.member_id!)
        .single();

      if (existingParticipant) {
        return res.status(400).json({
          error: 'Participante duplicado',
          details: 'Este membro já é participante deste item'
        });
      }
    }

    // Criar participante
    const { data: participant, error: createError } = await supabase
      .from('calendar_participants')
      .insert({
        calendar_item_id: calendarItemId,
        member_id: hasMemberId ? participantData.member_id : null,
        guest_name: hasGuestName ? participantData.guest_name : null,
        guest_email: participantData.guest_email || null,
        guest_phone: participantData.guest_phone || null,
        guest_whatsapp: participantData.guest_whatsapp || null,
      })
      .select(`
        *,
        member:members(id, name, email, phone, whatsapp)
      `)
      .single();

    if (createError) {
      logError('Erro ao criar participante:', createError);
      return res.status(500).json({
        error: 'Erro ao adicionar participante',
        details: 'Não foi possível adicionar o participante ao item do calendário'
      });
    }

    // Log da operação de criação
    await logAudit(req, {
      entity: 'calendar_item' as any,
      entityId: calendarItemId,
      action: 'update',
      changesAfter: {
        participant_added: {
          id: participant.id,
          member_id: participant.member_id,
          guest_name: participant.guest_name
        }
      }
    });

    res.status(201).json(participant);
  } catch (err) {
    logError('Erro ao adicionar participante:', err);
    res.status(500).json({
      error: 'Erro ao adicionar participante',
      details: err instanceof Error ? err.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Lista todos os participantes de um item do calendário
 * 
 * @param req - Request contendo calendarItemId nos params
 * @param res - Response com array de participantes (membros e convidados)
 * 
 * @remarks
 * - Valida que o item pertence à igreja do usuário
 * - Retorna participantes ordenados por data de criação (mais antigos primeiro)
 * - Inclui dados completos do membro se for participante membro
 */
export const listParticipants = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { calendarItemId } = req.params;

    const churchId = req.church!.churchId;

    // Verificar se o item do calendário pertence à igreja
    const { data: calendarItem, error: itemError } = await supabase
      .from('calendar_items')
      .select('id, church_id')
      .eq('id', calendarItemId)
      .eq('church_id', churchId)
      .single();

    if (itemError || !calendarItem) {
      return res.status(404).json({
        error: 'Item do calendário não encontrado',
        details: 'O item do calendário não existe ou não pertence à sua igreja'
      });
    }

    // Buscar participantes
    // Ordenação: por data de criação (mais antigos primeiro) para manter ordem cronológica
    const { data: participants, error: listError } = await supabase
      .from('calendar_participants')
      .select(`
        *,
        member:members(id, name, email, phone, whatsapp)
      `)
      .eq('calendar_item_id', calendarItemId)
      .order('created_at', { ascending: true });

    if (listError) {
      logError('Erro ao buscar participantes:', listError);
      return res.status(500).json({
        error: 'Erro ao buscar participantes',
        details: 'Não foi possível buscar a lista de participantes'
      });
    }

    res.json(participants || []);
  } catch (err) {
    logError('Erro ao listar participantes:', err);
    res.status(500).json({
      error: 'Erro ao listar participantes',
      details: err instanceof Error ? err.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Remove um participante de um item do calendário
 * 
 * @param req - Request contendo calendarItemId e participantId nos params
 * @param res - Response com mensagem de sucesso
 * 
 * @remarks
 * - Valida que o item e o participante pertencem à igreja do usuário
 * - Registra a operação no audit log
 */
export const removeParticipant = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { calendarItemId, participantId } = req.params;

    const churchId = req.church!.churchId;

    // Verificar se o item do calendário pertence à igreja
    const { data: calendarItem, error: itemError } = await supabase
      .from('calendar_items')
      .select('id, church_id')
      .eq('id', calendarItemId)
      .eq('church_id', churchId)
      .single();

    if (itemError || !calendarItem) {
      return res.status(404).json({
        error: 'Item do calendário não encontrado',
        details: 'O item do calendário não existe ou não pertence à sua igreja'
      });
    }

    // Verificar se o participante existe e pertence ao item
    const { data: participant, error: participantError } = await supabase
      .from('calendar_participants')
      .select('id, calendar_item_id')
      .eq('id', participantId)
      .eq('calendar_item_id', calendarItemId)
      .single();

    if (participantError || !participant) {
      return res.status(404).json({
        error: 'Participante não encontrado',
        details: 'O participante não existe ou não pertence a este item do calendário'
      });
    }

    // Remover participante
    const { error: deleteError } = await supabase
      .from('calendar_participants')
      .delete()
      .eq('id', participantId);

    if (deleteError) {
      logError('Erro ao remover participante:', deleteError);
      return res.status(500).json({
        error: 'Erro ao remover participante',
        details: 'Não foi possível remover o participante do item do calendário'
      });
    }

    // Log da operação de remoção
    await logAudit(req, {
      entity: 'calendar_item' as any,
      entityId: calendarItemId,
      action: 'update',
      changesBefore: {
        participant_removed: {
          id: participantId
        }
      }
    });

    res.json({ message: 'Participante removido com sucesso' });
  } catch (err) {
    logError('Erro ao remover participante:', err);
    res.status(500).json({
      error: 'Erro ao remover participante',
      details: err instanceof Error ? err.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Adiciona múltiplos participantes de uma vez (bulk)
 * 
 * @param req - Request contendo calendarItemId nos params e array de participantes no body
 * @param res - Response com resumo da operação (adicionados, duplicatas, erros)
 * 
 * @remarks
 * - Processa cada participante individualmente
 * - Retorna resumo com sucessos, duplicatas e erros
 * - Valida cada participante antes de adicionar
 * - Registra a operação no audit log se houver sucessos
 */
export const addParticipantsBulk = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { calendarItemId } = req.params;
    const { participants }: { participants: CreateParticipantData[] } = req.body;

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: 'É necessário fornecer um array de participantes'
      });
    }

    const churchId = req.church!.churchId;

    // Verificar se o item do calendário pertence à igreja
    const { data: calendarItem, error: itemError } = await supabase
      .from('calendar_items')
      .select('id, church_id')
      .eq('id', calendarItemId)
      .eq('church_id', churchId)
      .single();

    if (itemError || !calendarItem) {
      return res.status(404).json({
        error: 'Item do calendário não encontrado',
        details: 'O item do calendário não existe ou não pertence à sua igreja'
      });
    }

    const results = {
      success: [] as any[],
      errors: [] as any[],
      duplicates: [] as any[]
    };

    // Processar cada participante
    for (const participantData of participants) {
      try {
        // Validar cada participante
        const { error: validationError } = addParticipantSchema.validate(participantData);
        if (validationError) {
          results.errors.push({
            participant: participantData,
            error: validationError.details[0].message
          });
          continue;
        }

        const hasMemberId = participantData.member_id && participantData.member_id.trim() !== '';

        // Se for membro, verificar se ele existe e pertence à igreja
        if (hasMemberId) {
          const { data: member, error: memberError } = await supabase
            .from('members')
            .select('id, church_id, name')
            .eq('id', participantData.member_id!)
            .eq('church_id', churchId)
            .single();

          if (memberError || !member) {
            results.errors.push({
              participant: participantData,
              error: 'Membro não encontrado ou não pertence à sua igreja'
            });
            continue;
          }

          // Verificar se o membro já é participante (duplicata)
          const { data: existingParticipant } = await supabase
            .from('calendar_participants')
            .select('id')
            .eq('calendar_item_id', calendarItemId)
            .eq('member_id', participantData.member_id!)
            .single();

          if (existingParticipant) {
            results.duplicates.push({
              participant: participantData,
              name: member.name
            });
            continue;
          }
        }

        // Adicionar participante
        const { data: newParticipant, error: insertError } = await supabase
          .from('calendar_participants')
          .insert({
            calendar_item_id: calendarItemId,
            member_id: participantData.member_id || null,
            guest_name: participantData.guest_name || null,
            guest_email: participantData.guest_email || null,
            guest_phone: participantData.guest_phone || null,
            guest_whatsapp: participantData.guest_whatsapp || null
          })
          .select(`
            *,
            member:members (
              id,
              name,
              email,
              phone,
              whatsapp
            )
          `)
          .single();

        if (insertError || !newParticipant) {
          results.errors.push({
            participant: participantData,
            error: insertError?.message || 'Erro ao adicionar participante'
          });
          continue;
        }

        // Normalizar dados do membro (mesmo tratamento que em addParticipant)
        const normalizedParticipant = {
          ...newParticipant,
          member: Array.isArray((newParticipant as any).member) && (newParticipant as any).member.length > 0
            ? (newParticipant as any).member[0]
            : ((newParticipant as any).member || null)
        };

        results.success.push(normalizedParticipant);
      } catch (error) {
        results.errors.push({
          participant: participantData,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    // Log da operação de adição em lote
    if (results.success.length > 0) {
      await logAudit(req, {
        entity: 'calendar_item' as any,
        entityId: calendarItemId,
        action: 'update',
        changesAfter: {
          participants_added_bulk: {
            count: results.success.length,
            participants: results.success.map((p: any) => ({
              id: p.id,
              member_id: p.member_id,
              guest_name: p.guest_name
            }))
          }
        }
      });
    }

    // Retornar resultados
    res.json({
      message: `Processados ${participants.length} participantes`,
      summary: {
        total: participants.length,
        added: results.success.length,
        duplicates: results.duplicates.length,
        errors: results.errors.length
      },
      results: {
        success: results.success,
        duplicates: results.duplicates,
        errors: results.errors
      }
    });
  } catch (err) {
    logError('Erro ao adicionar participantes em lote:', err);
    res.status(500).json({
      error: 'Erro ao adicionar participantes em lote',
      details: err instanceof Error ? err.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};
