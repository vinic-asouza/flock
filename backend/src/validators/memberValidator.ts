import Joi from 'joi';
import { Member } from '../types';

const memberSchema = Joi.object<Partial<Member>>({
  name: Joi.string()
    .required()
    .messages({
      'string.empty': 'Nome é obrigatório',
      'any.required': 'Nome é obrigatório'
    }),

  birth: Joi.date()
    .required()
    .messages({
      'date.base': 'Data de nascimento inválida',
      'any.required': 'Data de nascimento é obrigatória'
    }),

  gender: Joi.string()
    .valid('Masculino', 'Feminino')
    .required()
    .messages({
      'any.only': 'Gênero deve ser Masculino ou Feminino',
      'any.required': 'Gênero é obrigatório'
    }),

  marital_status: Joi.string()
    .valid('Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro')
    .required()
    .messages({
      'any.only': 'Estado civil deve ser Solteiro, Casado, Divorciado, Viúvo ou Outro',
      'any.required': 'Estado civil é obrigatório'
    }),

  nationality: Joi.string()
    .required()
    .messages({
      'string.empty': 'Nacionalidade é obrigatória',
      'any.required': 'Nacionalidade é obrigatória'
    }),

  document: Joi.string()
    .required()
    .messages({
      'string.empty': 'Documento é obrigatório',
      'any.required': 'Documento é obrigatório'
    }),

  spouse: Joi.string()
    .optional()
    .allow(null, ''),

  address: Joi.string()
    .required()
    .messages({
      'string.empty': 'Endereço é obrigatório',
      'any.required': 'Endereço é obrigatório'
    }),

  complement: Joi.string()
    .optional()
    .allow(null, ''),

  cep: Joi.string()
    .length(8)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.empty': 'CEP é obrigatório',
      'any.required': 'CEP é obrigatório',
      'string.length': 'CEP deve ter 8 dígitos',
      'string.pattern.base': 'CEP deve conter apenas números'
    }),

  neighborhood: Joi.string()
    .required()
    .messages({
      'string.empty': 'Bairro é obrigatório',
      'any.required': 'Bairro é obrigatório'
    }),

  city: Joi.string()
    .required()
    .messages({
      'string.empty': 'Cidade é obrigatória',
      'any.required': 'Cidade é obrigatória'
    }),

  state: Joi.string()
    .length(2)
    .required()
    .messages({
      'string.empty': 'Estado é obrigatório',
      'any.required': 'Estado é obrigatório',
      'string.length': 'Estado deve ter 2 caracteres'
    }),

  phone: Joi.string()
    .required()
    .messages({
      'string.empty': 'Telefone é obrigatório',
      'any.required': 'Telefone é obrigatório'
    }),

  whatsapp: Joi.string()
    .optional()
    .allow(null, ''),

  email: Joi.string()
    .email()
    .optional()
    .allow(null, '')
    .messages({
      'string.email': 'Email inválido'
    }),

  baptism_date: Joi.date()
    .optional()
    .allow(null),

  role_id: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'ID do cargo inválido'
    }),

  occupation: Joi.string()
    .optional()
    .allow(null, ''),

  admission: Joi.string()
    .required()
    .messages({
      'string.empty': 'Tipo de admissão é obrigatório',
      'any.required': 'Tipo de admissão é obrigatório'
    }),

  admission_date: Joi.date()
    .required()
    .messages({
      'date.base': 'Data de admissão inválida',
      'any.required': 'Data de admissão é obrigatória'
    }),

  congregation_id: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'ID da congregação inválido'
    }),

  active: Joi.boolean()
    .default(true)
});

export const validateMember = (data: Partial<Member>) => {
  return memberSchema.validate(data, { abortEarly: false });
}; 