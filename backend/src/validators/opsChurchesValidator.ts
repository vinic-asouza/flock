import Joi from 'joi';

export const OPS_CHURCH_PLAN_TYPES = ['100', '200', '500', '800', 'custom'] as const;

export const OPS_CHURCH_SUBSCRIPTION_STATUSES = [
  'active',
  'canceled',
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'paused',
] as const;

export const OPS_CHURCH_SORT_FIELDS = ['created_at', 'name', 'cnpj'] as const;

export const opsChurchListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'A página deve ser um número',
    'number.min': 'A página deve ser no mínimo 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'O limite deve ser um número',
    'number.min': 'O limite deve ser no mínimo 1',
    'number.max': 'O limite não pode ser maior que 100',
  }),
  q: Joi.string().trim().max(80).allow('').empty('').optional().messages({
    'string.max': 'A busca não pode ter mais de 80 caracteres',
  }),
  plan_type: Joi.string()
    .valid(...OPS_CHURCH_PLAN_TYPES)
    .optional()
    .messages({
      'any.only': `O plano deve ser um dos seguintes: ${OPS_CHURCH_PLAN_TYPES.join(', ')}`,
    }),
  subscription_status: Joi.string()
    .valid(...OPS_CHURCH_SUBSCRIPTION_STATUSES)
    .optional()
    .messages({
      'any.only': `O status deve ser um dos seguintes: ${OPS_CHURCH_SUBSCRIPTION_STATUSES.join(', ')}`,
    }),
  commercially_active: Joi.boolean().optional().messages({
    'boolean.base': 'commercially_active deve ser true ou false',
  }),
  sort_by: Joi.string()
    .valid(...OPS_CHURCH_SORT_FIELDS)
    .default('created_at')
    .messages({
      'any.only': `A ordenação deve ser uma de: ${OPS_CHURCH_SORT_FIELDS.join(', ')}`,
    }),
  sort_order: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'A direção da ordenação deve ser asc ou desc',
  }),
});

export const opsChurchIdParamsSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'O identificador da igreja é inválido',
    'any.required': 'O identificador da igreja é obrigatório',
  }),
});

export type OpsChurchListQuery = {
  page: number;
  limit: number;
  q?: string;
  plan_type?: (typeof OPS_CHURCH_PLAN_TYPES)[number];
  subscription_status?: (typeof OPS_CHURCH_SUBSCRIPTION_STATUSES)[number];
  commercially_active?: boolean;
  sort_by: (typeof OPS_CHURCH_SORT_FIELDS)[number];
  sort_order: 'asc' | 'desc';
};

export function validateOpsChurchListQuery(data: unknown) {
  return opsChurchListQuerySchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
}

export function validateOpsChurchIdParams(data: unknown) {
  return opsChurchIdParamsSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
}
