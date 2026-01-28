import { Response } from 'express';
import { AuthRequest, CreateParticipantData } from '../types';
import supabase from '../services/supabase';
import { addParticipantSchema } from '../validators/calendarParticipantValidator';

// Adicionar participante a um item do calendário
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

    // Buscar church_id do usuário autenticado
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

    // Verificar se o item do calendário pertence à igreja
    const { data: calendarItem, error: itemError } = await supabase
      .from('calendar_items')
      .select('id, church_id')
      .eq('id', calendarItemId)
      .eq('church_id', church.id)
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
        .eq('church_id', church.id)
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
      console.error('Erro ao criar participante:', createError);
      return res.status(500).json({
        error: 'Erro ao adicionar participante',
        details: 'Não foi possível adicionar o participante ao item do calendário'
      });
    }

    res.status(201).json(participant);
  } catch (err) {
    console.error('Erro ao adicionar participante:', err);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido'
    });
  }
};

// Listar participantes de um item do calendário
export const listParticipants = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { calendarItemId } = req.params;

    // Buscar church_id do usuário autenticado
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

    // Verificar se o item do calendário pertence à igreja
    const { data: calendarItem, error: itemError } = await supabase
      .from('calendar_items')
      .select('id, church_id')
      .eq('id', calendarItemId)
      .eq('church_id', church.id)
      .single();

    if (itemError || !calendarItem) {
      return res.status(404).json({
        error: 'Item do calendário não encontrado',
        details: 'O item do calendário não existe ou não pertence à sua igreja'
      });
    }

    // Buscar participantes
    const { data: participants, error: listError } = await supabase
      .from('calendar_participants')
      .select(`
        *,
        member:members(id, name, email, phone, whatsapp)
      `)
      .eq('calendar_item_id', calendarItemId)
      .order('created_at', { ascending: true });

    if (listError) {
      console.error('Erro ao buscar participantes:', listError);
      return res.status(500).json({
        error: 'Erro ao buscar participantes',
        details: 'Não foi possível buscar a lista de participantes'
      });
    }

    res.json(participants || []);
  } catch (err) {
    console.error('Erro ao listar participantes:', err);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido'
    });
  }
};

// Remover participante de um item do calendário
export const removeParticipant = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { calendarItemId, participantId } = req.params;

    // Buscar church_id do usuário autenticado
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

    // Verificar se o item do calendário pertence à igreja
    const { data: calendarItem, error: itemError } = await supabase
      .from('calendar_items')
      .select('id, church_id')
      .eq('id', calendarItemId)
      .eq('church_id', church.id)
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
      console.error('Erro ao remover participante:', deleteError);
      return res.status(500).json({
        error: 'Erro ao remover participante',
        details: 'Não foi possível remover o participante do item do calendário'
      });
    }

    res.json({ message: 'Participante removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover participante:', err);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido'
    });
  }
};

// Adicionar múltiplos participantes de uma vez (bulk)
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

    // Buscar church_id do usuário autenticado
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

    // Verificar se o item do calendário pertence à igreja
    const { data: calendarItem, error: itemError } = await supabase
      .from('calendar_items')
      .select('id, church_id')
      .eq('id', calendarItemId)
      .eq('church_id', church.id)
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
            .eq('church_id', church.id)
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
    console.error('Erro ao adicionar participantes em lote:', err);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido'
    });
  }
};
