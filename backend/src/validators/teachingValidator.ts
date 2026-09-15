import Joi from 'joi';

export const teachingClassStatuses = [
  'draft',
  'open',
  'in_progress',
  'closed',
  'archived',
] as const;

export type TeachingClassStatusValue = (typeof teachingClassStatuses)[number];

const isoDateOnly = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    'string.pattern.base': 'A data deve estar no formato YYYY-MM-DD',
  });

function assertClassPeriod(
  value: { start_date?: string | null; end_date?: string | null },
  helpers: Joi.CustomHelpers
) {
  const start = value.start_date || '';
  const end = value.end_date || '';
  if (start && end && end < start) {
    return helpers.error('any.custom');
  }
  return value;
}

export const createTeachingProgramSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'O nome do programa é obrigatório',
    'any.required': 'O nome do programa é obrigatório',
    'string.min': 'O nome do programa deve ter pelo menos 2 caracteres',
    'string.max': 'O nome do programa não pode ter mais de 100 caracteres',
  }),
  description: Joi.string().allow('', null).optional().max(5000).messages({
    'string.max': 'A descrição não pode ter mais de 5000 caracteres',
  }),
  congregation_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID da congregação deve ser um UUID válido',
  }),
});

export const updateTeachingProgramSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.empty': 'O nome do programa não pode estar vazio',
    'string.min': 'O nome do programa deve ter pelo menos 2 caracteres',
    'string.max': 'O nome do programa não pode ter mais de 100 caracteres',
  }),
  description: Joi.string().allow('', null).optional().max(5000).messages({
    'string.max': 'A descrição não pode ter mais de 5000 caracteres',
  }),
  congregation_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID da congregação deve ser um UUID válido',
  }),
}).min(1);

export const createTeachingClassSchema = Joi.object({
  program_id: Joi.string().uuid().required().messages({
    'string.guid': 'O ID do programa deve ser um UUID válido',
    'any.required': 'O programa é obrigatório',
  }),
  congregation_id: Joi.string().uuid().required().messages({
    'string.guid': 'O ID da congregação deve ser um UUID válido',
    'any.required': 'A congregação é obrigatória',
  }),
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'O nome da turma é obrigatório',
    'any.required': 'O nome da turma é obrigatório',
    'string.min': 'O nome da turma deve ter pelo menos 2 caracteres',
    'string.max': 'O nome da turma não pode ter mais de 100 caracteres',
  }),
  location: Joi.string().allow('', null).optional().max(255),
  schedule: Joi.string().allow('', null).optional().max(500),
  start_date: isoDateOnly.required().messages({
    'any.required': 'A data de início é obrigatória',
    'string.empty': 'A data de início é obrigatória',
  }),
  end_date: isoDateOnly.allow('', null).optional(),
  status: Joi.string()
    .valid(...teachingClassStatuses)
    .optional()
    .default('draft')
    .messages({
      'any.only': `O status deve ser um dos seguintes: ${teachingClassStatuses.join(', ')}`,
    }),
  responsible_id: Joi.string().uuid().required().messages({
    'string.guid': 'O ID do responsável deve ser um UUID válido',
    'any.required': 'O responsável é obrigatório',
  }),
  teacher_ids: Joi.array()
    .items(Joi.string().uuid().messages({ 'string.guid': 'Cada professor deve ser um UUID válido' }))
    .optional()
    .default([]),
})
  .custom(assertClassPeriod)
  .messages({
    'any.custom': 'A data de término deve ser igual ou posterior à data de início',
  });

export const updateTeachingClassSchema = Joi.object({
  program_id: Joi.string().uuid().optional().messages({
    'string.guid': 'O ID do programa deve ser um UUID válido',
  }),
  congregation_id: Joi.string().uuid().optional().messages({
    'string.guid': 'O ID da congregação deve ser um UUID válido',
  }),
  name: Joi.string().trim().min(2).max(100).optional().messages({
    'string.empty': 'O nome da turma não pode estar vazio',
    'string.min': 'O nome da turma deve ter pelo menos 2 caracteres',
    'string.max': 'O nome da turma não pode ter mais de 100 caracteres',
  }),
  location: Joi.string().allow('', null).optional().max(255),
  schedule: Joi.string().allow('', null).optional().max(500),
  start_date: isoDateOnly.optional(),
  end_date: isoDateOnly.allow('', null).optional(),
  status: Joi.string()
    .valid(...teachingClassStatuses)
    .optional()
    .messages({
      'any.only': `O status deve ser um dos seguintes: ${teachingClassStatuses.join(', ')}`,
    }),
  responsible_id: Joi.string().uuid().optional().messages({
    'string.guid': 'O ID do responsável deve ser um UUID válido',
  }),
  teacher_ids: Joi.array()
    .items(Joi.string().uuid().messages({ 'string.guid': 'Cada professor deve ser um UUID válido' }))
    .optional(),
})
  .min(1)
  .custom(assertClassPeriod)
  .messages({
    'any.custom': 'A data de término deve ser igual ou posterior à data de início',
  });

export const replaceTeachingTeachersSchema = Joi.object({
  teacher_ids: Joi.array()
    .items(Joi.string().uuid().messages({ 'string.guid': 'Cada professor deve ser um UUID válido' }))
    .required()
    .messages({
      'any.required': 'A lista de professores é obrigatória',
      'array.base': 'teacher_ids deve ser um array',
    }),
});

export const enrollMemberSchema = Joi.object({
  type: Joi.string().valid('member').required(),
  member_id: Joi.string().uuid().required().messages({
    'string.guid': 'O ID do membro deve ser um UUID válido',
    'any.required': 'O membro é obrigatório',
  }),
});

export const enrollGuestSchema = Joi.object({
  type: Joi.string().valid('guest').required(),
  full_name: Joi.string().trim().min(2).max(200).required().messages({
    'string.empty': 'O nome completo é obrigatório',
    'any.required': 'O nome completo é obrigatório',
    'string.min': 'O nome completo deve ter pelo menos 2 caracteres',
  }),
  whatsapp: Joi.string().trim().min(8).max(30).required().messages({
    'string.empty': 'O WhatsApp é obrigatório',
    'any.required': 'O WhatsApp é obrigatório',
  }),
  birth_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'A data de nascimento deve estar no formato YYYY-MM-DD',
      'any.required': 'A data de nascimento é obrigatória',
    }),
  email: Joi.string().email().allow('', null).optional().messages({
    'string.email': 'E-mail inválido',
  }),
});

export const createEnrollmentSchema = Joi.alternatives().try(
  enrollMemberSchema,
  enrollGuestSchema
);

export const resolveEnrollmentSchema = Joi.object({
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

export const publicTeachingEnrollSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(200).required().messages({
    'string.empty': 'O nome completo é obrigatório',
    'any.required': 'O nome completo é obrigatório',
  }),
  whatsapp: Joi.string().trim().min(8).max(30).required().messages({
    'string.empty': 'O WhatsApp é obrigatório',
    'any.required': 'O WhatsApp é obrigatório',
  }),
  birth_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'A data de nascimento deve estar no formato YYYY-MM-DD',
      'any.required': 'A data de nascimento é obrigatória',
    }),
  email: Joi.string().email().allow('', null).optional().messages({
    'string.email': 'E-mail inválido',
  }),
});

export const createTeachingPublicLinkSchema = Joi.object({
  expires_at: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Data de expiração deve estar no formato ISO',
  }),
  max_uses: Joi.number().integer().min(1).max(10000).allow(null).optional().messages({
    'number.min': 'Número máximo de usos deve ser pelo menos 1',
    'number.max': 'Número máximo de usos não pode ser maior que 10000',
  }),
});

export const patchTeachingPublicLinkSchema = Joi.object({
  is_active: Joi.boolean().required().messages({
    'any.required': 'is_active é obrigatório',
    'boolean.base': 'is_active deve ser um booleano',
  }),
});

export const teachingMaterialTypes = ['link', 'note'] as const;
export type TeachingMaterialTypeValue = (typeof teachingMaterialTypes)[number];

function assertHttpUrl(value: string, helpers: Joi.CustomHelpers) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return helpers.error('any.custom');
    }
    return value;
  } catch {
    return helpers.error('any.custom');
  }
}

const materialTitle = Joi.string().trim().min(2).max(120).messages({
  'string.empty': 'O título é obrigatório',
  'any.required': 'O título é obrigatório',
  'string.min': 'O título deve ter pelo menos 2 caracteres',
  'string.max': 'O título não pode ter mais de 120 caracteres',
});

const materialUrl = Joi.string()
  .trim()
  .max(2048)
  .custom(assertHttpUrl)
  .messages({
    'string.empty': 'A URL é obrigatória',
    'any.required': 'A URL é obrigatória',
    'string.max': 'A URL não pode ter mais de 2048 caracteres',
    'any.custom': 'A URL deve usar http:// ou https://',
  });

const materialContent = Joi.string().trim().min(1).max(5000).messages({
  'string.empty': 'O conteúdo é obrigatório',
  'any.required': 'O conteúdo é obrigatório',
  'string.min': 'O conteúdo é obrigatório',
  'string.max': 'O conteúdo não pode ter mais de 5000 caracteres',
});

export const createTeachingMaterialSchema = Joi.object({
  type: Joi.string()
    .valid(...teachingMaterialTypes)
    .required()
    .messages({
      'any.only': 'O tipo deve ser link ou note',
      'any.required': 'O tipo é obrigatório',
    }),
  title: materialTitle.required(),
  url: Joi.when('type', {
    is: 'link',
    then: materialUrl.required(),
    otherwise: Joi.string().allow('', null).optional().strip(),
  }),
  content: Joi.when('type', {
    is: 'note',
    then: materialContent.required(),
    otherwise: Joi.string().allow('', null).optional().strip(),
  }),
});

export const updateTeachingMaterialSchema = Joi.object({
  title: materialTitle.optional(),
  url: materialUrl.optional(),
  content: materialContent.optional(),
  type: Joi.forbidden().messages({
    'any.unknown': 'Não é permitido alterar o tipo do material',
  }),
}).min(1);
