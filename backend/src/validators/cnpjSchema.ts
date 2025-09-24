import Joi from 'joi';
import { isValidCNPJ } from './cnpjValidator';

/**
 * Schema Joi para validação de CNPJ
 */
export const cnpjSchema = Joi.string()
  .length(14)
  .pattern(/^[0-9]+$/)
  .custom((value, helpers) => {
    if (!isValidCNPJ(value)) {
      return helpers.error('cnpj.invalid');
    }
    return value;
  })
  .required()
  .messages({
    'string.length': 'CNPJ deve ter 14 dígitos',
    'string.pattern.base': 'CNPJ deve conter apenas números',
    'cnpj.invalid': 'CNPJ inválido - dígitos verificadores incorretos',
    'any.required': 'CNPJ é obrigatório'
  });

/**
 * Schema Joi para validação de CNPJ opcional
 */
export const cnpjOptionalSchema = Joi.string()
  .length(14)
  .pattern(/^[0-9]+$/)
  .custom((value, helpers) => {
    if (value && !isValidCNPJ(value)) {
      return helpers.error('cnpj.invalid');
    }
    return value;
  })
  .optional()
  .allow('')
  .messages({
    'string.length': 'CNPJ deve ter 14 dígitos',
    'string.pattern.base': 'CNPJ deve conter apenas números',
    'cnpj.invalid': 'CNPJ inválido - dígitos verificadores incorretos'
  });
