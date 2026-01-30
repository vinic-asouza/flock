import Joi from 'joi';
import { GroupType } from '../types';

const groupTypes: GroupType[] = [
  'Ministério',
  'Departamento',
  'Grupo',
  'Equipe',
  'Time',
  'Comissão',
  'Célula',
  'Grupo de Crescimento',
  'Pequeno Grupo',
  'Discipulado',
  'Classe',
  'Núcleo',
  'Região'
];

export const createGroupSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'O nome do grupo é obrigatório',
      'any.required': 'O nome do grupo é obrigatório',
      'string.min': 'O nome do grupo deve ter pelo menos 2 caracteres',
      'string.max': 'O nome do grupo não pode ter mais de 100 caracteres'
    }),
  type: Joi.string().valid(...groupTypes).required().messages({
    'any.only': `O tipo deve ser um dos seguintes: ${groupTypes.join(', ')}`,
    'any.required': 'O tipo do grupo é obrigatório'
  }),
  description: Joi.string()
    .allow('')
    .optional()
    .max(5000)
    .messages({
      'string.empty': 'A descrição não pode estar vazia',
      'string.max': 'A descrição não pode ter mais de 5000 caracteres'
    }),
  congregation_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID da congregação deve ser um UUID válido'
  }),
  responsible_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID do responsável deve ser um UUID válido'
  }),
  status: Joi.boolean().optional().default(true)
});

export const updateGroupSchema = Joi.object({
  name: Joi.string()
    .optional()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'O nome do grupo não pode estar vazio',
      'string.min': 'O nome do grupo deve ter pelo menos 2 caracteres',
      'string.max': 'O nome do grupo não pode ter mais de 100 caracteres'
    }),
  type: Joi.string().valid(...groupTypes).optional().messages({
    'any.only': `O tipo deve ser um dos seguintes: ${groupTypes.join(', ')}`
  }),
  description: Joi.string()
    .allow('')
    .optional()
    .max(5000)
    .messages({
      'string.empty': 'A descrição não pode estar vazia',
      'string.max': 'A descrição não pode ter mais de 5000 caracteres'
    }),
  congregation_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID da congregação deve ser um UUID válido'
  }),
  responsible_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID do responsável deve ser um UUID válido'
  }),
  status: Joi.boolean().optional()
});
