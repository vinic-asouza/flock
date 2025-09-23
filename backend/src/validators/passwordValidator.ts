import Joi from 'joi';

// Validador para alteração de senha
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Senha atual é obrigatória'
    }),

  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'A nova senha deve ter no mínimo 8 caracteres',
      'string.pattern.base': 'A nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
      'any.required': 'Nova senha é obrigatória'
    })
});

// Validador para reset de senha
export const resetPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'A nova senha deve ter no mínimo 8 caracteres',
      'string.pattern.base': 'A nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
      'any.required': 'Nova senha é obrigatória'
    }),

  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Token de recuperação é obrigatório'
    })
});

// Função para validar alteração de senha
export const validateChangePassword = (data: { currentPassword: string; newPassword: string }) => {
  return changePasswordSchema.validate(data, { abortEarly: false });
};

// Função para validar reset de senha
export const validateResetPassword = (data: { newPassword: string; token: string }) => {
  return resetPasswordSchema.validate(data, { abortEarly: false });
};
