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
  name: Joi.string().required().messages({
    'string.empty': 'O nome do grupo é obrigatório',
    'any.required': 'O nome do grupo é obrigatório'
  }),
  type: Joi.string().valid(...groupTypes).required().messages({
    'any.only': `O tipo deve ser um dos seguintes: ${groupTypes.join(', ')}`,
    'any.required': 'O tipo do grupo é obrigatório'
  }),
  description: Joi.string().allow('').optional().messages({
    'string.empty': 'A descrição não pode estar vazia'
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
  name: Joi.string().optional().messages({
    'string.empty': 'O nome do grupo não pode estar vazio'
  }),
  type: Joi.string().valid(...groupTypes).optional().messages({
    'any.only': `O tipo deve ser um dos seguintes: ${groupTypes.join(', ')}`
  }),
  description: Joi.string().allow('').optional().messages({
    'string.empty': 'A descrição não pode estar vazia'
  }),
  congregation_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID da congregação deve ser um UUID válido'
  }),
  responsible_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'O ID do responsável deve ser um UUID válido'
  }),
  status: Joi.boolean().optional()
});
