import Joi from 'joi';
import { ChurchRegistrationData } from '../types';

const churchSchema = Joi.object<ChurchRegistrationData>({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email inválido',
      'any.required': 'Email é obrigatório'
    }),
  
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'A senha deve ter no mínimo 8 caracteres',
      'any.required': 'Senha é obrigatória'
    }),

  phone: Joi.string()
    .required()
    .pattern(/^[0-9]+$/)
    .min(10)
    .max(11)
    .messages({
      'any.required': 'Telefone é obrigatório',
      'string.pattern.base': 'Telefone deve conter apenas números',
      'string.min': 'Telefone deve ter pelo menos 10 dígitos',
      'string.max': 'Telefone deve ter no máximo 11 dígitos'
    }),

  name: Joi.string()
    .required()
    .messages({
      'any.required': 'Nome da igreja é obrigatório'
    }),

  denomination: Joi.string()
    .required()
    .messages({
      'any.required': 'Denominação é obrigatória'
    }),

  address: Joi.string()
    .required()
    .messages({
      'any.required': 'Endereço é obrigatório'
    }),

  city: Joi.string()
    .required()
    .messages({
      'any.required': 'Cidade é obrigatória'
    }),

  state: Joi.string()
    .required()
    .length(2)
    .messages({
      'any.required': 'Estado é obrigatório',
      'string.length': 'Estado deve ter 2 caracteres'
    }),

  cnpj: Joi.string()
    .length(14)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'CNPJ deve ter 14 dígitos',
      'string.pattern.base': 'CNPJ deve conter apenas números',
      'any.required': 'CNPJ é obrigatório'
    }),

  email_church: Joi.string()
    .email()
    .optional()
    .allow('')
    .messages({
      'string.email': 'Email da igreja inválido'
    }),

  phone_church: Joi.string()
    .optional()
    .allow('')
    .pattern(/^[0-9]+$/)
    .min(10)
    .max(11)
    .messages({
      'string.pattern.base': 'Telefone da igreja deve conter apenas números',
      'string.min': 'Telefone da igreja deve ter pelo menos 10 dígitos',
      'string.max': 'Telefone da igreja deve ter no máximo 11 dígitos'
    })
});

export const validateChurch = (data: ChurchRegistrationData) => {
  return churchSchema.validate(data, { abortEarly: false });
}; 