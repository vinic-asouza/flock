import Joi from 'joi';

export const eventStatuses = ['draft', 'open', 'in_progress', 'closed', 'archived'] as const;

export type EventStatusValue = (typeof eventStatuses)[number];

function assertEventPeriod(
  value: { starts_at?: string | null; ends_at?: string | null },
  helpers: Joi.CustomHelpers
) {
  if (value.starts_at && value.ends_at) {
    const start = new Date(value.starts_at).getTime();
    const end = new Date(value.ends_at).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      return helpers.error('any.custom');
    }
  }
  return value;
}

const periodMessage = {
  'any.custom': 'A data de término deve ser igual ou posterior à data de início',
};

const nameField = Joi.string().trim().min(2).max(100).messages({
  'string.empty': 'O nome do evento é obrigatório',
  'any.required': 'O nome do evento é obrigatório',
  'string.min': 'O nome do evento deve ter pelo menos 2 caracteres',
  'string.max': 'O nome do evento não pode ter mais de 100 caracteres',
});

const descriptionField = Joi.string().allow('', null).max(5000).messages({
  'string.max': 'A descrição não pode ter mais de 5000 caracteres',
});

const locationField = Joi.string().allow('', null).max(255).messages({
  'string.max': 'O local não pode ter mais de 255 caracteres',
});

const congregationField = Joi.string().uuid().allow(null).messages({
  'string.guid': 'O ID da congregação deve ser um UUID válido',
});

const capacityField = Joi.number().integer().min(1).allow(null).messages({
  'number.base': 'A capacidade deve ser um número inteiro',
  'number.integer': 'A capacidade deve ser um número inteiro',
  'number.min': 'A capacidade deve ser maior que zero',
});

const groupField = Joi.string().uuid().allow(null).messages({
  'string.guid': 'O ID do ministério deve ser um UUID válido',
});

const statusField = Joi.string()
  .valid(...eventStatuses)
  .messages({
    'any.only': `O status deve ser um dos seguintes: ${eventStatuses.join(', ')}`,
  });

const organizerIdsField = Joi.array()
  .items(Joi.string().uuid().messages({ 'string.guid': 'Cada organizador deve ser um UUID válido' }))
  .messages({ 'array.base': 'organizer_ids deve ser um array' });

export const createEventSchema = Joi.object({
  name: nameField.required(),
  description: descriptionField.optional(),
  starts_at: Joi.string().isoDate().required().messages({
    'string.isoDate': 'A data de início deve estar no formato ISO',
    'any.required': 'A data de início é obrigatória',
    'string.empty': 'A data de início é obrigatória',
  }),
  ends_at: Joi.string().isoDate().allow('', null).optional().messages({
    'string.isoDate': 'A data de término deve estar no formato ISO',
  }),
  location: locationField.optional(),
  congregation_id: congregationField.optional().default(null),
  status: statusField.optional().default('draft'),
  capacity: capacityField.optional().default(null),
  responsible_id: Joi.string().uuid().required().messages({
    'string.guid': 'O ID do responsável deve ser um UUID válido',
    'any.required': 'O responsável é obrigatório',
  }),
  group_id: groupField.optional().default(null),
  organizer_ids: organizerIdsField.optional().default([]),
})
  .custom(assertEventPeriod)
  .messages(periodMessage);

export const updateEventSchema = Joi.object({
  name: nameField.optional(),
  description: descriptionField.optional(),
  starts_at: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'A data de início deve estar no formato ISO',
  }),
  ends_at: Joi.string().isoDate().allow('', null).optional().messages({
    'string.isoDate': 'A data de término deve estar no formato ISO',
  }),
  location: locationField.optional(),
  congregation_id: congregationField.optional(),
  status: statusField.optional(),
  capacity: capacityField.optional(),
  responsible_id: Joi.string().uuid().optional().messages({
    'string.guid': 'O ID do responsável deve ser um UUID válido',
  }),
  group_id: groupField.optional(),
  organizer_ids: organizerIdsField.optional(),
})
  .min(1)
  .custom(assertEventPeriod)
  .messages(periodMessage);

export const replaceEventOrganizersSchema = Joi.object({
  organizer_ids: organizerIdsField.required().messages({
    'any.required': 'A lista de organizadores é obrigatória',
  }),
});

const registrationWhatsapp = Joi.string().trim().min(8).max(30).required().messages({
  'string.empty': 'O WhatsApp é obrigatório',
  'any.required': 'O WhatsApp é obrigatório',
});

const registrationBirthDate = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .required()
  .messages({
    'string.pattern.base': 'A data de nascimento deve estar no formato YYYY-MM-DD',
    'any.required': 'A data de nascimento é obrigatória',
  });

const registrationFullName = Joi.string().trim().min(2).max(200).required().messages({
  'string.empty': 'O nome completo é obrigatório',
  'any.required': 'O nome completo é obrigatório',
  'string.min': 'O nome completo deve ter pelo menos 2 caracteres',
});

const registrationEmail = Joi.string().email().allow('', null).optional().messages({
  'string.email': 'E-mail inválido',
});

export const registerEventMemberSchema = Joi.object({
  type: Joi.string().valid('member').required(),
  member_id: Joi.string().uuid().required().messages({
    'string.guid': 'O ID do membro deve ser um UUID válido',
    'any.required': 'O membro é obrigatório',
  }),
});

export const registerEventGuestSchema = Joi.object({
  type: Joi.string().valid('guest').required(),
  full_name: registrationFullName,
  whatsapp: registrationWhatsapp,
  birth_date: registrationBirthDate,
  email: registrationEmail,
});

/** Inscrição manual: membro XOR convidado. */
export const createEventRegistrationSchema = Joi.alternatives().try(
  registerEventMemberSchema,
  registerEventGuestSchema
);

export const resolveEventRegistrationSchema = Joi.object({
  action: Joi.string().valid('link_member', 'keep_guest').required().messages({
    'any.only': 'A ação deve ser link_member ou keep_guest',
    'any.required': 'A ação é obrigatória',
  }),
  member_id: Joi.when('action', {
    is: 'link_member',
    then: Joi.string().uuid().required().messages({
      'string.guid': 'O ID do membro deve ser um UUID válido',
      'any.required': 'O membro é obrigatório para vincular',
    }),
    otherwise: Joi.forbidden(),
  }),
});

export const publicEventEnrollSchema = Joi.object({
  full_name: registrationFullName,
  whatsapp: registrationWhatsapp,
  birth_date: registrationBirthDate,
  email: registrationEmail,
});

export const createEventPublicLinkSchema = Joi.object({
  expires_at: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Data de expiração deve estar no formato ISO',
  }),
  max_uses: Joi.number().integer().min(1).max(10000).allow(null).optional().messages({
    'number.min': 'Número máximo de usos deve ser pelo menos 1',
    'number.max': 'Número máximo de usos não pode ser maior que 10000',
  }),
});

export const patchEventPublicLinkSchema = Joi.object({
  is_active: Joi.boolean().required().messages({
    'any.required': 'is_active é obrigatório',
    'boolean.base': 'is_active deve ser um booleano',
  }),
});
