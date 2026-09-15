import Joi from 'joi';

/** Filtros do POST /api/export/groups/list — sem types (módulo só ministérios). */
export const exportGroupsListFiltersSchema = Joi.object({
  congregation_id: Joi.string().uuid().optional().allow(null, ''),
  status: Joi.string().valid('active', 'inactive', 'all').optional(),
  search: Joi.string().optional().allow('', null),
}).unknown(false);

export const createGroupSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'O nome do ministério é obrigatório',
      'any.required': 'O nome do ministério é obrigatório',
      'string.min': 'O nome do ministério deve ter pelo menos 2 caracteres',
      'string.max': 'O nome do ministério não pode ter mais de 100 caracteres'
    }),
  description: Joi.string()
    .allow('')
    .optional()
    .max(5000)
    .messages({
      'string.empty': 'A descrição não pode estar vazia',
      'string.max': 'A descrição não pode ter mais de 5000 caracteres'
    }),
  congregation_id: Joi.string().uuid().required().messages({
    'string.guid': 'O ID da congregação deve ser um UUID válido',
    'any.required': 'A congregação é obrigatória',
    'string.empty': 'A congregação é obrigatória'
  }),
  responsible_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID do responsável deve ser um UUID válido'
  }),
  status: Joi.boolean().optional().default(true)
}).unknown(false);

export const updateGroupSchema = Joi.object({
  name: Joi.string()
    .optional()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'O nome do ministério não pode estar vazio',
      'string.min': 'O nome do ministério deve ter pelo menos 2 caracteres',
      'string.max': 'O nome do ministério não pode ter mais de 100 caracteres'
    }),
  description: Joi.string()
    .allow('')
    .optional()
    .max(5000)
    .messages({
      'string.empty': 'A descrição não pode estar vazia',
      'string.max': 'A descrição não pode ter mais de 5000 caracteres'
    }),
  congregation_id: Joi.string().uuid().optional().messages({
    'string.guid': 'O ID da congregação deve ser um UUID válido'
  }),
  responsible_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID do responsável deve ser um UUID válido'
  }),
  status: Joi.boolean().optional()
}).unknown(false);
