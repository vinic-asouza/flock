import Joi from 'joi';

// Regex para validar telefone brasileiro (aceita com ou sem formatação)
// Aceita: (11) 99999-9999, (11) 9999-9999, 11999999999, 1199999999
const phoneRegex = /^[\d\s\(\)\-]{10,15}$/;
const isPhoneDigitCountValid = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
};

export const createCongregationSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'O nome da congregação é obrigatório',
      'any.required': 'O nome da congregação é obrigatório',
      'string.min': 'O nome da congregação deve ter pelo menos 2 caracteres',
      'string.max': 'O nome da congregação não pode ter mais de 100 caracteres'
    }),
  address: Joi.string()
    .required()
    .min(5)
    .max(255)
    .messages({
      'string.empty': 'O endereço é obrigatório',
      'any.required': 'O endereço é obrigatório',
      'string.min': 'O endereço deve ter pelo menos 5 caracteres',
      'string.max': 'O endereço não pode ter mais de 255 caracteres'
    }),
  city: Joi.string()
    .required()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'A cidade é obrigatória',
      'any.required': 'A cidade é obrigatória',
      'string.min': 'A cidade deve ter pelo menos 2 caracteres',
      'string.max': 'A cidade não pode ter mais de 100 caracteres'
    }),
  state: Joi.string()
    .required()
    .length(2)
    .messages({
      'string.empty': 'O estado é obrigatório',
      'any.required': 'O estado é obrigatório',
      'string.length': 'O estado deve ser uma sigla de 2 caracteres (ex: SP, RJ)'
    }),
  leader: Joi.string()
    .allow('')
    .optional()
    .max(100)
    .messages({
      'string.empty': 'O líder não pode estar vazio',
      'string.max': 'O nome do líder não pode ter mais de 100 caracteres'
    }),
  abbreviation: Joi.string()
    .allow('', null)
    .optional()
    .max(20)
    .messages({
      'string.max': 'A abreviação não pode ter mais de 20 caracteres'
    }),
  phone: Joi.string()
    .allow('')
    .optional()
    .pattern(phoneRegex)
    .custom((value, helpers) => {
      if (!value || value.trim() === '') return value;
      if (!isPhoneDigitCountValid(value)) {
        return helpers.error('phone.digits');
      }
      return value;
    })
    .max(20)
    .messages({
      'string.empty': 'O telefone não pode estar vazio',
      'string.pattern.base': 'O telefone deve conter apenas números e caracteres de formatação (parênteses, hífens e espaços)',
      'string.max': 'O telefone não pode ter mais de 20 caracteres',
      'phone.digits': 'Telefone inválido. Deve conter 10 ou 11 dígitos'
    })
});

export const updateCongregationSchema = Joi.object({
  name: Joi.string()
    .optional()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'O nome da congregação não pode estar vazio',
      'string.min': 'O nome da congregação deve ter pelo menos 2 caracteres',
      'string.max': 'O nome da congregação não pode ter mais de 100 caracteres'
    }),
  abbreviation: Joi.string()
    .allow('', null)
    .optional()
    .max(20)
    .messages({
      'string.max': 'A abreviação não pode ter mais de 20 caracteres'
    }),
  address: Joi.string()
    .optional()
    .min(5)
    .max(255)
    .messages({
      'string.empty': 'O endereço não pode estar vazio',
      'string.min': 'O endereço deve ter pelo menos 5 caracteres',
      'string.max': 'O endereço não pode ter mais de 255 caracteres'
    }),
  city: Joi.string()
    .optional()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'A cidade não pode estar vazia',
      'string.min': 'A cidade deve ter pelo menos 2 caracteres',
      'string.max': 'A cidade não pode ter mais de 100 caracteres'
    }),
  state: Joi.string()
    .optional()
    .length(2)
    .messages({
      'string.empty': 'O estado não pode estar vazio',
      'string.length': 'O estado deve ser uma sigla de 2 caracteres (ex: SP, RJ)'
    }),
  leader: Joi.string()
    .allow('')
    .optional()
    .max(100)
    .messages({
      'string.empty': 'O líder não pode estar vazio',
      'string.max': 'O nome do líder não pode ter mais de 100 caracteres'
    }),
  phone: Joi.string()
    .allow('')
    .optional()
    .pattern(phoneRegex)
    .custom((value, helpers) => {
      if (!value || value.trim() === '') return value;
      if (!isPhoneDigitCountValid(value)) {
        return helpers.error('phone.digits');
      }
      return value;
    })
    .max(20)
    .messages({
      'string.empty': 'O telefone não pode estar vazio',
      'string.pattern.base': 'O telefone deve conter apenas números e caracteres de formatação (parênteses, hífens e espaços)',
      'string.max': 'O telefone não pode ter mais de 20 caracteres',
      'phone.digits': 'Telefone inválido. Deve conter 10 ou 11 dígitos'
    })
}); 