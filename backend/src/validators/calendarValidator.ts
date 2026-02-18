import Joi from 'joi';

const calendarItemTypes = ['Programação', 'Evento', 'Encontro', 'Reunião'];
const statusTypes = ['active', 'cancelled', 'postponed'];
const recurrencePatterns = ['weekly', 'monthly'];

export const createCalendarItemSchema = Joi.object({
  title: Joi.string().required().min(2).max(100).messages({
    'string.empty': 'O título é obrigatório',
    'any.required': 'O título é obrigatório',
    'string.min': 'O título deve ter pelo menos 2 caracteres',
    'string.max': 'O título não pode ter mais de 100 caracteres'
  }),
  type: Joi.string().valid(...calendarItemTypes).required().messages({
    'any.only': `O tipo deve ser um dos seguintes: ${calendarItemTypes.join(', ')}`,
    'any.required': 'O tipo é obrigatório'
  }),
  description: Joi.string().allow('').optional().max(5000).messages({
    'string.max': 'A descrição não pode ter mais de 5000 caracteres'
  }),
  start_date: Joi.alternatives().conditional('is_recurring', {
    is: true,
    then: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
      'string.pattern.base': 'Para eventos recorrentes, a data de início deve estar no formato YYYY-MM-DD',
      'any.required': 'A data de início da recorrência é obrigatória'
    }),
    otherwise: Joi.date().iso().required().messages({
      'date.base': 'A data de início deve ser uma data válida',
      'any.required': 'A data de início é obrigatória'
    })
  }),
  end_date: Joi.date().iso().when('is_recurring', {
    is: false,
    then: Joi.date().iso().greater(Joi.ref('start_date')).optional().allow(null).messages({
      'date.base': 'A data de fim deve ser uma data válida',
      'date.greater': 'A data de fim deve ser posterior à data de início'
    }),
    otherwise: Joi.date().iso().optional().allow(null)
  }),
  is_recurring: Joi.boolean().optional().default(false),
  recurrence_pattern: Joi.string().valid(...recurrencePatterns).when('is_recurring', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional().allow(null)
  }),
  recurrence_end_date: Joi.date().iso().when('is_recurring', {
    is: true,
    then: Joi.date().iso().greater(Joi.ref('start_date')).optional().allow(null).messages({
      'date.greater': 'A data de término da recorrência deve ser posterior à data de início'
    }),
    otherwise: Joi.date().iso().optional().allow(null)
  }),
  recurrence_time: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).when('is_recurring', {
    is: true,
    then: Joi.required().messages({
      'string.pattern.base': 'O horário deve estar no formato HH:mm',
      'any.required': 'O horário é obrigatório para eventos recorrentes'
    }),
    otherwise: Joi.optional().allow(null)
  }),
  recurrence_duration_minutes: Joi.number().integer().min(1).when('is_recurring', {
    is: true,
    then: Joi.optional().allow(null),
    otherwise: Joi.optional().allow(null)
  }),
  recurrence_day_of_week: Joi.number().integer().min(0).max(6).when('is_recurring', {
    is: true,
    then: Joi.when('recurrence_pattern', {
      is: 'weekly',
      then: Joi.required().messages({
        'any.required': 'O dia da semana é obrigatório para recorrência semanal'
      }),
      otherwise: Joi.optional().allow(null)
    }),
    otherwise: Joi.optional().allow(null)
  }),
  recurrence_day_of_month: Joi.number().integer().min(1).max(31).when('is_recurring', {
    is: true,
    then: Joi.when('recurrence_pattern', {
      is: 'monthly',
      then: Joi.optional().allow(null), // Opcional porque pode usar week_of_month + day_of_week
      otherwise: Joi.optional().allow(null)
    }),
    otherwise: Joi.optional().allow(null)
  }),
  recurrence_week_of_month: Joi.number().integer().min(-1).max(4).when('is_recurring', {
    is: true,
    then: Joi.when('recurrence_pattern', {
      is: 'monthly',
      then: Joi.optional().allow(null), // Opcional porque pode usar day_of_month
      otherwise: Joi.optional().allow(null)
    }),
    otherwise: Joi.optional().allow(null)
  }),
  location: Joi.string().allow('').optional().max(255).messages({
    'string.max': 'O local não pode ter mais de 255 caracteres'
  }),
  congregation_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID da congregação deve ser um UUID válido'
  }),
  // Status não é mais aceito no body, sempre será 'active' no backend
  group_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID do grupo deve ser um UUID válido'
  }),
  responsible_member_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID do membro responsável deve ser um UUID válido'
  }),
  // Array de participantes (opcional)
  participants: Joi.array().items(
    Joi.object({
      member_id: Joi.string().uuid().optional().allow(null, '').messages({
        'string.guid': 'O ID do membro participante deve ser um UUID válido'
      }),
      guest_name: Joi.string().optional().allow(null, ''),
      guest_email: Joi.string().email().optional().allow(null, '').messages({
        'string.email': 'O email do convidado deve ser um email válido'
      }),
      guest_phone: Joi.string().optional().allow(null, ''),
      guest_whatsapp: Joi.string().optional().allow(null, '')
    }).custom((participant, helpers) => {
      const hasMember = participant.member_id && participant.member_id.trim() !== '';
      const hasGuest = participant.guest_name && participant.guest_name.trim() !== '';
      
      if (!hasMember && !hasGuest) {
        return helpers.error('any.custom', {
          message: 'Um participante deve ter member_id ou guest_name'
        });
      }
      
      if (hasMember && hasGuest) {
        return helpers.error('any.custom', {
          message: 'Um participante não pode ser membro e convidado simultaneamente'
        });
      }
      
      return participant;
    })
  ).optional()
}).unknown(true).custom((value, helpers) => {
  // Validação customizada para recorrência mensal
  if (value.is_recurring && value.recurrence_pattern === 'monthly') {
    const hasDayOfMonth = value.recurrence_day_of_month !== null && value.recurrence_day_of_month !== undefined;
    const hasWeekOfMonth = value.recurrence_week_of_month !== null && value.recurrence_week_of_month !== undefined;
    const hasDayOfWeek = value.recurrence_day_of_week !== null && value.recurrence_day_of_week !== undefined;
    
    // Deve ter OU day_of_month OU (week_of_month + day_of_week)
    if (!hasDayOfMonth && !(hasWeekOfMonth && hasDayOfWeek)) {
      return helpers.error('any.custom', {
        message: 'Para recorrência mensal, é necessário informar: (1) o dia do mês (1-31) OU (2) a semana do mês + dia da semana'
      });
    }
    
    // Não pode ter ambos
    if (hasDayOfMonth && (hasWeekOfMonth || hasDayOfWeek)) {
      return helpers.error('any.custom', {
        message: 'Para recorrência mensal, escolha apenas uma opção: dia do mês OU (semana do mês + dia da semana). Não é possível usar ambas as opções simultaneamente.'
      });
    }
  }
  
  return value;
});

export const updateCalendarItemSchema = Joi.object({
  title: Joi.string().optional().min(2).max(100).messages({
    'string.empty': 'O título não pode estar vazio',
    'string.min': 'O título deve ter pelo menos 2 caracteres',
    'string.max': 'O título não pode ter mais de 100 caracteres'
  }),
  type: Joi.string().valid(...calendarItemTypes).optional(),
  description: Joi.string().allow('').optional().max(5000).messages({
    'string.max': 'A descrição não pode ter mais de 5000 caracteres'
  }),
  start_date: Joi.alternatives().conditional('is_recurring', {
    is: true,
    then: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
      'string.pattern.base': 'Para eventos recorrentes, a data de início deve estar no formato YYYY-MM-DD'
    }),
    otherwise: Joi.date().iso().optional()
  }),
  end_date: Joi.date().iso().when('is_recurring', {
    is: false,
    then: Joi.date().iso().optional().allow(null),
    otherwise: Joi.optional().allow(null)
  }),
  is_recurring: Joi.boolean().optional(),
  recurrence_pattern: Joi.string().valid(...recurrencePatterns).optional().allow(null),
  recurrence_end_date: Joi.date().iso().optional().allow(null).when('start_date', {
    is: Joi.exist(),
    then: Joi.date().iso().greater(Joi.ref('start_date')).optional().allow(null).messages({
      'date.greater': 'A data de término da recorrência deve ser posterior à data de início'
    }),
    otherwise: Joi.date().iso().optional().allow(null)
  }),
  recurrence_time: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(null, '').messages({
    'string.pattern.base': 'O horário deve estar no formato HH:mm'
  }),
  recurrence_duration_minutes: Joi.number().integer().min(1).optional().allow(null),
  recurrence_day_of_week: Joi.number().integer().min(0).max(6).optional().allow(null),
  recurrence_day_of_month: Joi.number().integer().min(1).max(31).optional().allow(null),
  recurrence_week_of_month: Joi.number().integer().min(-1).max(4).optional().allow(null),
  location: Joi.string().allow('').optional().max(255).messages({
    'string.max': 'O local não pode ter mais de 255 caracteres'
  }),
  congregation_id: Joi.string().uuid().allow(null, '').optional(),
  // Status não é mais aceito no body, sempre será 'active' no backend
  group_id: Joi.string().uuid().allow(null, '').optional(),
  responsible_member_id: Joi.string().uuid().allow(null, '').optional()
}).unknown(true).custom((value, helpers) => {
  // Validação customizada para recorrência mensal (mesma lógica do create)
  if (value.is_recurring && value.recurrence_pattern === 'monthly') {
    const hasDayOfMonth = value.recurrence_day_of_month !== null && value.recurrence_day_of_month !== undefined;
    const hasWeekOfMonth = value.recurrence_week_of_month !== null && value.recurrence_week_of_month !== undefined;
    const hasDayOfWeek = value.recurrence_day_of_week !== null && value.recurrence_day_of_week !== undefined;
    
    if (!hasDayOfMonth && !(hasWeekOfMonth && hasDayOfWeek)) {
      return helpers.error('any.custom', {
        message: 'Para recorrência mensal, informe o dia do mês (1-31) OU a semana do mês + dia da semana'
      });
    }
    
    if (hasDayOfMonth && (hasWeekOfMonth || hasDayOfWeek)) {
      return helpers.error('any.custom', {
        message: 'Para recorrência mensal, use apenas dia do mês OU semana do mês + dia da semana, não ambos'
      });
    }
  }
  
  return value;
});

export const listCalendarItemsSchema = Joi.object({
  // Aceitar string única ou array de strings para type
  type: Joi.alternatives().try(
    Joi.string().valid(...calendarItemTypes),
    Joi.array().items(Joi.string().valid(...calendarItemTypes))
  ).optional(),
  // congregation_id pode ser UUID ou a string 'sede' (que representa null)
  congregation_id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.string().valid('sede')
  ).optional(),
  group_id: Joi.string().uuid().optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(2000).optional().default(50)
});
