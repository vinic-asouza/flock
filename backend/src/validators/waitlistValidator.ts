import Joi from 'joi';

export const waitlistSchema = Joi.object({
  name: Joi.string().min(2).max(255).required().messages({
    'string.min': 'Nome deve ter pelo menos 2 caracteres',
    'string.max': 'Nome deve ter no máximo 255 caracteres',
    'any.required': 'Nome é obrigatório',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  phone: Joi.string()
    .pattern(/^[0-9]{10,11}$/)
    .required()
    .messages({
      'string.pattern.base': 'Telefone deve conter apenas números (10 ou 11 dígitos)',
      'any.required': 'Telefone é obrigatório',
    }),
  churchName: Joi.string().min(2).max(255).required().messages({
    'string.min': 'Nome da igreja deve ter pelo menos 2 caracteres',
    'string.max': 'Nome da igreja deve ter no máximo 255 caracteres',
    'any.required': 'Nome da igreja é obrigatório',
  }),
  city: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Cidade deve ter pelo menos 2 caracteres',
    'string.max': 'Cidade deve ter no máximo 100 caracteres',
    'any.required': 'Cidade é obrigatória',
  }),
  state: Joi.string().length(2).uppercase().required().messages({
    'string.length': 'Estado deve ter exatamente 2 caracteres',
    'any.required': 'Estado é obrigatório',
  }),
});

export const validateWaitlist = (data: unknown) => {
  return waitlistSchema.validate(data, { abortEarly: false });
};

