import Joi from 'joi';

export const createCongregationSchema = Joi.object({
  name: Joi.string().required().messages({
    'string.empty': 'O nome da congregação é obrigatório',
    'any.required': 'O nome da congregação é obrigatório'
  }),
  address: Joi.string().required().messages({
    'string.empty': 'O endereço é obrigatório',
    'any.required': 'O endereço é obrigatório'
  }),
  city: Joi.string().required().messages({
    'string.empty': 'A cidade é obrigatória',
    'any.required': 'A cidade é obrigatória'
  }),
  state: Joi.string().required().messages({
    'string.empty': 'O estado é obrigatório',
    'any.required': 'O estado é obrigatório'
  }),
  leader: Joi.string().allow('').optional().messages({
    'string.empty': 'O líder não pode estar vazio'
  }),
  phone: Joi.string().allow('').optional().messages({
    'string.empty': 'O telefone não pode estar vazio'
  })
});

export const updateCongregationSchema = Joi.object({
  name: Joi.string().optional().messages({
    'string.empty': 'O nome da congregação não pode estar vazio'
  }),
  address: Joi.string().optional().messages({
    'string.empty': 'O endereço não pode estar vazio'
  }),
  city: Joi.string().optional().messages({
    'string.empty': 'A cidade não pode estar vazia'
  }),
  state: Joi.string().optional().messages({
    'string.empty': 'O estado não pode estar vazio'
  }),
  leader: Joi.string().allow('').optional().messages({
    'string.empty': 'O líder não pode estar vazio'
  }),
  phone: Joi.string().allow('').optional().messages({
    'string.empty': 'O telefone não pode estar vazio'
  })
}); 