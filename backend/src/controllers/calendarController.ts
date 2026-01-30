import { Response } from 'express';
import supabase from '../services/supabase';
import { AuthRequest, CalendarItem, Group } from '../types';
import { 
  createCalendarItemSchema, 
  updateCalendarItemSchema,
  listCalendarItemsSchema 
} from '../validators/calendarValidator';
import { logAudit } from '../utils/auditLogger';
import { expandRecurringItem } from '../utils/recurrenceExpander';
import { startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { 
  validateCongregation, 
  validateGroup, 
  validateResponsibleMember, 
  validateParticipants 
} from '../utils/calendarValidations';
import { logError } from '../utils/logger';

/**
 * Lista todos os itens do calendário da igreja com filtros
 * 
 * @param req - Request contendo query params: type, congregation_id, group_id, start_date, end_date, page, limit
 * @param res - Response com array de itens do calendário e informações de paginação
 * 
 * @remarks
 * - Expande itens recorrentes para o intervalo de datas especificado
 * - Filtra apenas itens ativos (status = 'active')
 * - Suporta filtros por tipo, congregação, grupo e intervalo de datas
 * - Aplica paginação após a expansão dos itens recorrentes
 */
export const listCalendarItems = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Validar query params
    const { error: validationError } = listCalendarItemsSchema.validate(req.query);
    if (validationError) {
      return res.status(400).json({
        error: 'Parâmetros inválidos',
        details: validationError.details[0].message
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

    const {
      type,
      congregation_id,
      group_id,
      start_date,
      end_date,
      page = 1,
      limit = 50
    } = req.query;

    // Normalizar type para array (Express pode retornar string ou array)
    const typeArray = Array.isArray(type) ? type : (type ? [type] : []);

    // Determinar intervalo de datas para expansão
    // Se não fornecido, usar o ano atual como padrão
    let expansionStartDate: Date;
    let expansionEndDate: Date;

    if (start_date && end_date) {
      expansionStartDate = new Date(start_date as string);
      expansionEndDate = new Date(end_date as string);
    } else if (start_date) {
      expansionStartDate = new Date(start_date as string);
      expansionEndDate = endOfMonth(expansionStartDate);
    } else {
      // Padrão: ano atual
      const now = new Date();
      expansionStartDate = startOfYear(now);
      expansionEndDate = endOfYear(now);
    }

    // Construir query base - buscar TODOS os itens (sem paginação inicial)
    // porque precisamos expandir os recorrentes antes de paginar
    let query = supabase
      .from('calendar_items')
      .select(`
        *,
        congregations (
          id,
          name
        ),
        groups (
          id,
          name,
          type
        ),
        members!calendar_items_responsible_member_id_fkey (
          id,
          name
        )
      `)
      .eq('church_id', church.id);

    // Aplicar filtros (mas não filtrar por data ainda, pois precisamos dos recorrentes)
    if (typeArray.length > 0) {
      if (typeArray.length === 1) {
        query = query.eq('type', typeArray[0]);
      } else {
        query = query.in('type', typeArray);
      }
    }

    // Filtrar por congregação
    // "sede" é uma string especial que representa itens sem congregação (congregation_id = null)
    if (congregation_id) {
      if (congregation_id === 'sede') {
        // Filtrar itens onde congregation_id é null (Sede)
        query = query.is('congregation_id', null);
      } else {
        // Filtrar por UUID da congregação específica
        query = query.eq('congregation_id', congregation_id);
      }
    }

    if (group_id) {
      query = query.eq('group_id', group_id);
    }

    // Sempre filtrar apenas itens ativos (status não é mais um filtro)
    query = query.eq('status', 'active');

    // Buscar itens recorrentes que podem se expandir para o intervalo
    // e itens não recorrentes que estão no intervalo
    const { data: allItems, error } = await query;

    if (error) {
      return res.status(400).json({
        error: 'Erro ao buscar itens do calendário',
        details: error.message
      });
    }

    if (!allItems || allItems.length === 0) {
      return res.json({
        data: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0
        }
      });
    }

    // Separar itens recorrentes e não recorrentes
    const recurringItems: CalendarItem[] = [];
    const nonRecurringItems: CalendarItem[] = [];

    allItems.forEach((item: any) => {
      // Normalizar relacionamentos (Supabase retorna com nome da tabela no plural)
      // e pode retornar como array ou objeto único dependendo da relação
      let normalizedCongregation = null;
      if (item.congregations) {
        if (Array.isArray(item.congregations)) {
          normalizedCongregation = item.congregations.length > 0 ? item.congregations[0] : null;
        } else {
          normalizedCongregation = item.congregations;
        }
      }
      
      let normalizedGroup = null;
      if (item.groups) {
        if (Array.isArray(item.groups)) {
          normalizedGroup = item.groups.length > 0 ? item.groups[0] : null;
        } else {
          normalizedGroup = item.groups;
        }
      }
      
      let normalizedMember = null;
      if (item.members) {
        if (Array.isArray(item.members)) {
          normalizedMember = item.members.length > 0 ? item.members[0] : null;
        } else {
          normalizedMember = item.members;
        }
      }

      // Criar objeto sem os campos no plural
      const { congregations, groups, members, ...itemWithoutPlurals } = item;
      
      const calendarItem: CalendarItem = {
        ...itemWithoutPlurals,
        congregation: normalizedCongregation,
        group: normalizedGroup,
        responsible_member: normalizedMember,
        start_date: new Date(item.start_date),
        end_date: item.end_date ? new Date(item.end_date) : null,
        recurrence_end_date: item.recurrence_end_date ? new Date(item.recurrence_end_date) : null,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at)
      };

      if (calendarItem.is_recurring && calendarItem.recurrence_pattern) {
        recurringItems.push(calendarItem);
      } else {
        // Filtrar itens não recorrentes que estão no intervalo
        const itemStart = new Date(calendarItem.start_date);
        if (itemStart >= expansionStartDate && itemStart <= expansionEndDate) {
          nonRecurringItems.push(calendarItem);
        }
      }
    });

    // Expandir itens recorrentes
    const expandedItems: CalendarItem[] = [];
    recurringItems.forEach(item => {
      const occurrences = expandRecurringItem(item, expansionStartDate, expansionEndDate);
      expandedItems.push(...occurrences);
    });

    // Combinar todos os itens e ordenar por data
    const allExpandedItems = [...nonRecurringItems, ...expandedItems].sort((a, b) => {
      return a.start_date.getTime() - b.start_date.getTime();
    });

    // Aplicar paginação no resultado expandido
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit);
    const paginatedItems = allExpandedItems.slice(from, to);

    res.json({
      data: paginatedItems,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: allExpandedItems.length,
        totalPages: Math.ceil(allExpandedItems.length / Number(limit))
      }
    });
  } catch (error) {
    logError('Erro ao buscar itens do calendário:', error);
    return res.status(500).json({
      error: 'Erro ao buscar itens do calendário',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Busca um item específico do calendário por ID
 * 
 * @param req - Request contendo o ID do item nos params
 * @param res - Response com os dados completos do item, incluindo relacionamentos e participantes
 * 
 * @remarks
 * - Retorna dados completos incluindo congregação, grupo, responsável e participantes
 * - Valida que o item pertence à igreja do usuário autenticado
 */
export const getCalendarItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

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

    // Buscar item específico com informações relacionadas
    const { data: item, error: itemError } = await supabase
      .from('calendar_items')
      .select(`
        *,
        congregations (
          id,
          name,
          address,
          city,
          state
        ),
        groups (
          id,
          name,
          type,
          description
        ),
        members!calendar_items_responsible_member_id_fkey (
          id,
          name,
          email,
          phone,
          whatsapp
        ),
        calendar_participants (
          id,
          member_id,
          guest_name,
          guest_email,
          guest_phone,
          guest_whatsapp,
          created_at,
          members (
            id,
            name,
            email,
            phone,
            whatsapp
          )
        )
      `)
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (itemError || !item) {
      return res.status(404).json({
        error: 'Item do calendário não encontrado',
        details: 'Não foi possível encontrar o item solicitado'
      });
    }

    // Normalizar relacionamentos (Supabase retorna com nome da tabela no plural)
    let normalizedCongregation = null;
    if (item.congregations) {
      if (Array.isArray(item.congregations)) {
        normalizedCongregation = item.congregations.length > 0 ? item.congregations[0] : null;
      } else {
        normalizedCongregation = item.congregations;
      }
    }
    
    let normalizedGroup = null;
    if (item.groups) {
      if (Array.isArray(item.groups)) {
        normalizedGroup = item.groups.length > 0 ? item.groups[0] : null;
      } else {
        normalizedGroup = item.groups;
      }
    }
    
    let normalizedMember = null;
    if (item.members) {
      if (Array.isArray(item.members)) {
        normalizedMember = item.members.length > 0 ? item.members[0] : null;
      } else {
        normalizedMember = item.members;
      }
    }

    // Normalizar participantes
    let normalizedParticipants: any[] = [];
    if (item.calendar_participants) {
      normalizedParticipants = Array.isArray(item.calendar_participants) 
        ? item.calendar_participants.map((p: any) => {
            // Normalizar membro dentro de cada participante
            let participantMember = null;
            if (p.members) {
              participantMember = Array.isArray(p.members) 
                ? (p.members.length > 0 ? p.members[0] : null)
                : p.members;
            }
            
            const { members: _, ...participantWithoutMembers } = p;
            return {
              ...participantWithoutMembers,
              member: participantMember
            };
          })
        : [item.calendar_participants];
    }

    // Criar objeto sem os campos no plural
    const { congregations, groups, members, calendar_participants, ...itemWithoutPlurals } = item;
    
    const normalizedItem = {
      ...itemWithoutPlurals,
      congregation: normalizedCongregation,
      group: normalizedGroup,
      responsible_member: normalizedMember,
      participants: normalizedParticipants
    };

    res.json(normalizedItem);
  } catch (error) {
    logError('Erro ao buscar item do calendário:', error);
    return res.status(500).json({
      error: 'Erro ao buscar item do calendário',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Cria um novo item do calendário
 * 
 * @param req - Request contendo os dados do item no body
 * @param res - Response com o item criado e seus relacionamentos
 * 
 * @remarks
 * - Valida pertencimento de congregação, grupo e responsável à igreja
 * - Suporta criação de participantes junto com o item
 * - Para eventos recorrentes, start_date é apenas data (YYYY-MM-DD)
 * - Para eventos não recorrentes, start_date é datetime completo
 * - Se a criação de participantes falhar, o item é removido para manter consistência
 */
export const createCalendarItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { error: validationError } = createCalendarItemSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message
      });
    }

    const {
      title,
      type,
      description,
      start_date,
      end_date,
      is_recurring,
      recurrence_pattern,
      recurrence_end_date,
      recurrence_time,
      recurrence_duration_minutes,
      recurrence_day_of_week,
      recurrence_day_of_month,
      recurrence_week_of_month,
      location,
      congregation_id,
      group_id,
      responsible_member_id,
      participants
    } = req.body;

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

    // Validar congregação
    const congregationValidation = await validateCongregation(congregation_id, church.id);
    if (!congregationValidation.isValid) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: congregationValidation.errorMessage
      });
    }

    // Validar grupo
    const groupValidation = await validateGroup(group_id, congregation_id, church.id);
    if (!groupValidation.isValid) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: groupValidation.errorMessage
      });
    }

    // Validar responsável
    const responsibleValidation = await validateResponsibleMember(responsible_member_id, congregation_id, church.id);
    if (!responsibleValidation.isValid) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: responsibleValidation.errorMessage
      });
    }

    // Para eventos recorrentes, start_date é apenas data (YYYY-MM-DD)
    // Para não recorrentes, start_date é datetime completo
    // NOTA: O PostgreSQL armazena TIMESTAMP WITH TIME ZONE em UTC
    // O Supabase/PostgreSQL faz a conversão automática de timezone
    let startDateValue: Date;
    if (is_recurring) {
      // Se for recorrente, start_date deve ser apenas data, vamos adicionar meia-noite
      // Usar UTC para evitar problemas de timezone
      const dateOnly = start_date.includes('T') ? start_date.split('T')[0] : start_date;
      startDateValue = new Date(`${dateOnly}T00:00:00Z`);
    } else {
      // Para não recorrentes, manter o datetime como recebido
      // O PostgreSQL converterá automaticamente para UTC
      startDateValue = new Date(start_date);
    }

    // Criar novo item do calendário
    const itemData: Partial<CalendarItem> = {
      church_id: church.id,
      title,
      type,
      description: description || null,
      start_date: startDateValue,
      end_date: is_recurring ? null : (end_date ? new Date(end_date) : null),
      is_recurring: is_recurring || false,
      recurrence_pattern: is_recurring ? (recurrence_pattern || null) : null,
      recurrence_end_date: is_recurring && recurrence_end_date ? new Date(recurrence_end_date) : null,
      recurrence_time: is_recurring && recurrence_time ? recurrence_time : null,
      recurrence_duration_minutes: is_recurring && recurrence_duration_minutes ? recurrence_duration_minutes : null,
      recurrence_day_of_week: is_recurring && recurrence_day_of_week !== null && recurrence_day_of_week !== undefined ? recurrence_day_of_week : null,
      recurrence_day_of_month: is_recurring && recurrence_day_of_month !== null && recurrence_day_of_month !== undefined ? recurrence_day_of_month : null,
      recurrence_week_of_month: is_recurring && recurrence_week_of_month !== null && recurrence_week_of_month !== undefined ? recurrence_week_of_month : null,
      location: location || null,
      congregation_id: congregation_id || null,
      status: 'active', // Sempre ativo, sem possibilidade de alteração
      group_id: group_id || null,
      responsible_member_id: responsible_member_id || null,
      created_by: req.user.id
    };

    const { data: item, error: createError } = await supabase
      .from('calendar_items')
      .insert([itemData])
      .select(`
        *,
        congregations (
          id,
          name
        ),
        groups (
          id,
          name,
          type
        ),
        members!calendar_items_responsible_member_id_fkey (
          id,
          name
        )
      `)
      .single();

    if (createError) {
      return res.status(400).json({
        error: 'Erro ao criar item do calendário',
        details: createError.message
      });
    }

    // Adicionar participantes se fornecidos
    if (participants && Array.isArray(participants) && participants.length > 0) {
      // Validar membros (se fornecidos) pertencem à igreja e à congregação
      const memberIds = participants
        .filter((p: any) => p.member_id)
        .map((p: any) => p.member_id);

      if (memberIds.length > 0) {
        const participantsValidation = await validateParticipants(memberIds, congregation_id, church.id);
        if (!participantsValidation.isValid) {
          // Se algum membro não for válido, remover o item criado
          await supabase.from('calendar_items').delete().eq('id', item.id);
          
          return res.status(400).json({
            error: 'Membros inválidos',
            details: participantsValidation.errorMessage
          });
        }
      }

      // Preparar dados dos participantes
      const participantsData = participants.map((p: any) => ({
        calendar_item_id: item.id,
        member_id: p.member_id || null,
        guest_name: p.guest_name || null,
        guest_email: p.guest_email || null,
        guest_phone: p.guest_phone || null,
        guest_whatsapp: p.guest_whatsapp || null
      }));

      // Inserir participantes
      const { error: participantsError } = await supabase
        .from('calendar_participants')
        .insert(participantsData);

      if (participantsError) {
        logError('Erro ao adicionar participantes:', participantsError);
        // Se a inserção de participantes falhar, remover o item criado para manter consistência
        await supabase.from('calendar_items').delete().eq('id', item.id);
        
        return res.status(500).json({
          error: 'Erro ao adicionar participantes',
          details: 'O item do calendário foi criado, mas não foi possível adicionar os participantes. O item foi removido para manter a consistência dos dados.'
        });
      }
    }

    // Log da operação de criação
    await logAudit(req, {
      entity: 'calendar_item' as any,
      entityId: item.id,
      action: 'create',
      changesAfter: item
    });

    res.status(201).json(item);
  } catch (error) {
    logError('Erro ao criar item do calendário:', error);
    return res.status(500).json({
      error: 'Erro ao criar item do calendário',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Atualiza um item do calendário existente
 * 
 * @param req - Request contendo o ID do item nos params e dados para atualização no body
 * @param res - Response com o item atualizado e seus relacionamentos
 * 
 * @remarks
 * - Valida pertencimento de congregação, grupo e responsável à igreja
 * - Permite atualização parcial (apenas campos fornecidos são atualizados)
 * - Se mudar de recorrente para não recorrente, limpa campos de recorrência
 * - Status sempre permanece 'active', não pode ser alterado
 */
export const updateCalendarItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

    const { error: validationError } = updateCalendarItemSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message
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

    // Verificar se o item existe e pertence à igreja
    const { data: existingItem, error: fetchError } = await supabase
      .from('calendar_items')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (fetchError || !existingItem) {
      return res.status(404).json({
        error: 'Item do calendário não encontrado',
        details: 'Não foi possível encontrar o item solicitado'
      });
    }

    // Determinar valores finais para validação (usar valores do body se fornecidos, senão usar valores existentes)
    const finalCongregationId = req.body.congregation_id !== undefined ? req.body.congregation_id : existingItem.congregation_id;
    const finalGroupId = req.body.group_id !== undefined ? req.body.group_id : existingItem.group_id;
    const finalResponsibleId = req.body.responsible_member_id !== undefined ? req.body.responsible_member_id : existingItem.responsible_member_id;

    // Validar congregação (se estiver sendo atualizada)
    if (req.body.congregation_id !== undefined) {
      const congregationValidation = await validateCongregation(finalCongregationId, church.id);
      if (!congregationValidation.isValid) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: congregationValidation.errorMessage
        });
      }
    }

    // Validar grupo (se estiver sendo atualizado)
    if (req.body.group_id !== undefined) {
      const groupValidation = await validateGroup(finalGroupId, finalCongregationId, church.id);
      if (!groupValidation.isValid) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: groupValidation.errorMessage
        });
      }
    }

    // Validar responsável (se estiver sendo atualizado)
    if (req.body.responsible_member_id !== undefined) {
      const responsibleValidation = await validateResponsibleMember(finalResponsibleId, finalCongregationId, church.id);
      if (!responsibleValidation.isValid) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: responsibleValidation.errorMessage
        });
      }
    }

    // Preparar dados para atualização
    const updateData: Partial<CalendarItem> = {};

    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    
    // Tratar start_date baseado em is_recurring
    // NOTA: O PostgreSQL armazena TIMESTAMP WITH TIME ZONE em UTC
    // O Supabase/PostgreSQL faz a conversão automática de timezone
    if (req.body.start_date !== undefined) {
      if (req.body.is_recurring !== undefined ? req.body.is_recurring : existingItem.is_recurring) {
        // Se for recorrente, start_date é apenas data, usar UTC para evitar problemas de timezone
        const dateOnly = req.body.start_date.includes('T') ? req.body.start_date.split('T')[0] : req.body.start_date;
        updateData.start_date = new Date(`${dateOnly}T00:00:00Z`);
      } else {
        // Para não recorrentes, manter o datetime como recebido
        // O PostgreSQL converterá automaticamente para UTC
        updateData.start_date = new Date(req.body.start_date);
      }
    }
    
    if (req.body.end_date !== undefined) {
      // Para eventos recorrentes, end_date deve ser null
      if (req.body.is_recurring !== undefined ? req.body.is_recurring : existingItem.is_recurring) {
        updateData.end_date = null;
      } else {
        updateData.end_date = req.body.end_date ? new Date(req.body.end_date) : null;
      }
    }
    
    if (req.body.is_recurring !== undefined) {
      updateData.is_recurring = req.body.is_recurring;
      // Se mudou de recorrente para não recorrente, limpar campos de recorrência
      if (!req.body.is_recurring) {
        updateData.recurrence_pattern = null;
        updateData.recurrence_end_date = null;
        updateData.recurrence_time = null;
        updateData.recurrence_duration_minutes = null;
        updateData.recurrence_day_of_week = null;
        updateData.recurrence_day_of_month = null;
        updateData.recurrence_week_of_month = null;
      }
    }
    
    if (req.body.recurrence_pattern !== undefined) {
      updateData.recurrence_pattern = req.body.recurrence_pattern;
    }
    if (req.body.recurrence_end_date !== undefined) {
      updateData.recurrence_end_date = req.body.recurrence_end_date 
        ? new Date(req.body.recurrence_end_date) 
        : null;
    }
    if (req.body.recurrence_time !== undefined) {
      updateData.recurrence_time = req.body.recurrence_time || null;
    }
    if (req.body.recurrence_duration_minutes !== undefined) {
      updateData.recurrence_duration_minutes = req.body.recurrence_duration_minutes || null;
    }
    if (req.body.recurrence_day_of_week !== undefined) {
      updateData.recurrence_day_of_week = req.body.recurrence_day_of_week !== null && req.body.recurrence_day_of_week !== undefined ? req.body.recurrence_day_of_week : null;
    }
    if (req.body.recurrence_day_of_month !== undefined) {
      updateData.recurrence_day_of_month = req.body.recurrence_day_of_month !== null && req.body.recurrence_day_of_month !== undefined ? req.body.recurrence_day_of_month : null;
    }
    if (req.body.recurrence_week_of_month !== undefined) {
      updateData.recurrence_week_of_month = req.body.recurrence_week_of_month !== null && req.body.recurrence_week_of_month !== undefined ? req.body.recurrence_week_of_month : null;
    }
    
    if (req.body.location !== undefined) updateData.location = req.body.location;
    if (req.body.congregation_id !== undefined) {
      updateData.congregation_id = req.body.congregation_id || null;
    }
    // Status sempre permanece 'active', não pode ser alterado
    if (req.body.group_id !== undefined) updateData.group_id = req.body.group_id || null;
    if (req.body.responsible_member_id !== undefined) {
      updateData.responsible_member_id = req.body.responsible_member_id || null;
    }

    // Atualizar item
    const { data: updatedItem, error: updateError } = await supabase
      .from('calendar_items')
      .update(updateData)
      .eq('id', id)
      .eq('church_id', church.id)
      .select(`
        *,
        congregations (
          id,
          name
        ),
        groups (
          id,
          name,
          type
        ),
        members!calendar_items_responsible_member_id_fkey (
          id,
          name
        )
      `)
      .single();

    if (updateError) {
      return res.status(400).json({
        error: 'Erro ao atualizar item do calendário',
        details: updateError.message
      });
    }

    // Log da operação de atualização
    await logAudit(req, {
      entity: 'calendar_item' as any,
      entityId: id,
      action: 'update',
      changesBefore: existingItem,
      changesAfter: updatedItem
    });

    res.json(updatedItem);
  } catch (error) {
    logError('Erro ao atualizar item do calendário:', error);
    return res.status(500).json({
      error: 'Erro ao atualizar item do calendário',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Deleta um item do calendário
 * 
 * @param req - Request contendo o ID do item nos params
 * @param res - Response 204 (No Content) em caso de sucesso
 * 
 * @remarks
 * - Valida que o item pertence à igreja do usuário autenticado
 * - Participantes são removidos automaticamente via ON DELETE CASCADE
 * - Registra a operação no audit log
 */
export const deleteCalendarItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { id } = req.params;

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

    // Verificar se o item existe e pertence à igreja
    const { data: existingItem, error: fetchError } = await supabase
      .from('calendar_items')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)
      .single();

    if (fetchError || !existingItem) {
      return res.status(404).json({
        error: 'Item do calendário não encontrado',
        details: 'Não foi possível encontrar o item solicitado'
      });
    }

    // Deletar item
    const { error: deleteError } = await supabase
      .from('calendar_items')
      .delete()
      .eq('id', id)
      .eq('church_id', church.id);

    if (deleteError) {
      return res.status(400).json({
        error: 'Erro ao deletar item do calendário',
        details: deleteError.message
      });
    }

    // Log da operação de deleção
    await logAudit(req, {
      entity: 'calendar_item' as any,
      entityId: id,
      action: 'delete',
      changesBefore: existingItem
    });

    res.status(204).send();
  } catch (error) {
    logError('Erro ao deletar item do calendário:', error);
    return res.status(500).json({
      error: 'Erro ao deletar item do calendário',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Exporta calendário mensal em PDF
 * 
 * @param req - Request contendo query params: month, year, congregation_id, group_id
 * @param res - Response com dados do calendário (PDF ainda não implementado)
 * 
 * @remarks
 * - Por enquanto retorna JSON com os dados
 * - A implementação do PDF será feita posteriormente usando pdfkit ou puppeteer
 * - Filtra apenas itens ativos do mês/ano especificado
 */
export const exportCalendarPDF = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    const { month, year, congregation_id, group_id } = req.query;

    // Buscar church_id do usuário autenticado
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Determinar período (mês/ano atual se não especificado)
    const targetMonth = month ? Number(month) : new Date().getMonth() + 1;
    const targetYear = year ? Number(year) : new Date().getFullYear();
    
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Construir query
    let query = supabase
      .from('calendar_items')
      .select(`
        *,
        congregations (
          id,
          name
        ),
        groups (
          id,
          name,
          type
        ),
        members!calendar_items_responsible_member_id_fkey (
          id,
          name
        )
      `)
      .eq('church_id', church.id)
      .eq('status', 'active')
      .gte('start_date', startDate.toISOString())
      .lte('start_date', endDate.toISOString())
      .order('start_date', { ascending: true });

    if (congregation_id && congregation_id !== 'sede') {
      query = query.eq('congregation_id', congregation_id);
    } else if (congregation_id === 'sede') {
      query = query.is('congregation_id', null);
    }

    if (group_id) {
      query = query.eq('group_id', group_id);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError) {
      return res.status(400).json({
        error: 'Erro ao buscar itens do calendário',
        details: itemsError.message
      });
    }

    // TODO: Implementar geração de PDF
    // Por enquanto, retornar JSON com os dados
    // A implementação do PDF será feita posteriormente usando pdfkit ou puppeteer
    
    res.json({
      message: 'Exportação PDF ainda não implementada',
      data: {
        church: church.name,
        month: targetMonth,
        year: targetYear,
        items: items || []
      }
    });
  } catch (error) {
    logError('Erro ao exportar calendário PDF:', error);
    return res.status(500).json({
      error: 'Erro ao exportar calendário PDF',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};

/**
 * Lista grupos que têm itens de calendário vinculados
 * 
 * @param req - Request do usuário autenticado
 * @param res - Response com array de grupos que possuem itens de calendário ativos
 * 
 * @remarks
 * - Retorna apenas grupos que têm pelo menos um item de calendário ativo vinculado
 * - Útil para filtros e seleção de grupos no frontend
 * - Ordena por tipo e nome
 */
export const listGroupsWithCalendarItems = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
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

    // Buscar grupos distintos que têm itens de calendário vinculados
    // Buscar todos os itens de calendário ativos e extrair group_ids únicos
    const { data: calendarItems, error: itemsError } = await supabase
      .from('calendar_items')
      .select('group_id')
      .eq('church_id', church.id)
      .eq('status', 'active');

    if (itemsError) {
      return res.status(400).json({
        error: 'Erro ao buscar grupos',
        details: itemsError.message
      });
    }

    // Extrair group_ids únicos (filtrar nulls)
    const groupIds = [...new Set(
      (calendarItems || [])
        .map(item => item.group_id)
        .filter((id): id is string => id !== null && id !== undefined)
    )];

    if (groupIds.length === 0) {
      return res.json([]);
    }

    // Buscar informações completas dos grupos
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select(`
        *,
        congregations (
          id,
          name
        )
      `)
      .in('id', groupIds)
      .eq('church_id', church.id)
      .order('type')
      .order('name');

    if (groupsError) {
      return res.status(400).json({
        error: 'Erro ao buscar grupos',
        details: groupsError.message
      });
    }

    res.json(groups || []);
  } catch (error) {
    logError('Erro ao buscar grupos com itens de calendário:', error);
    return res.status(500).json({
      error: 'Erro ao buscar grupos com itens de calendário',
      details: error instanceof Error ? error.message : 'Erro desconhecido ao processar a solicitação'
    });
  }
};
