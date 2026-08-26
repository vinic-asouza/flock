import Joi from 'joi';

export const opsLoginSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  password: Joi.string().min(1).required().messages({
    'string.min': 'Senha é obrigatória',
    'any.required': 'Senha é obrigatória',
  }),
});

export const validateOpsLogin = (data: unknown) => {
  return opsLoginSchema.validate(data, { abortEarly: false, stripUnknown: true });
};
