import Joi from 'joi';

export const createRoleSchema = Joi.object({
  name: Joi.string().required().messages({
    'string.empty': 'O nome do cargo é obrigatório',
    'any.required': 'O nome do cargo é obrigatório'
  }),
  description: Joi.string().allow('').optional().messages({
    'string.empty': 'A descrição não pode estar vazia'
  })
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().optional().messages({
    'string.empty': 'O nome do cargo não pode estar vazio'
  }),
  description: Joi.string().allow('').optional().messages({
    'string.empty': 'A descrição não pode estar vazia'
  })
}); 