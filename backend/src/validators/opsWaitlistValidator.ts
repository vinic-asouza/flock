import Joi from 'joi';

export const OPS_WAITLIST_PLANS = ['200', '500', '800', 'personalizado'] as const;

export const OPS_WAITLIST_SORT_FIELDS = ['created_at'] as const;

export const opsWaitlistListQuerySchema = Joi.object({
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
  plan: Joi.string()
    .valid(...OPS_WAITLIST_PLANS)
    .optional()
    .messages({
      'any.only': `O plano deve ser um dos seguintes: ${OPS_WAITLIST_PLANS.join(', ')}`,
    }),
  sort_by: Joi.string()
    .valid(...OPS_WAITLIST_SORT_FIELDS)
    .default('created_at')
    .messages({
      'any.only': `A ordenação deve ser uma de: ${OPS_WAITLIST_SORT_FIELDS.join(', ')}`,
    }),
  sort_order: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'A direção da ordenação deve ser asc ou desc',
  }),
});

export type OpsWaitlistListQuery = {
  page: number;
  limit: number;
  q?: string;
  plan?: (typeof OPS_WAITLIST_PLANS)[number];
  sort_by: (typeof OPS_WAITLIST_SORT_FIELDS)[number];
  sort_order: 'asc' | 'desc';
};

export function validateOpsWaitlistListQuery(data: unknown) {
  return opsWaitlistListQuerySchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
}
