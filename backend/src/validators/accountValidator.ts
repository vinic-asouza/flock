import Joi from 'joi';

// Schema para alteração de email
const emailChangeSchema = Joi.object({
  newEmail: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email inválido',
      'any.required': 'Novo email é obrigatório'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Senha é obrigatória para alterar email'
    })
});

// Schema para alteração de senha
const passwordChangeSchema = Joi.object({
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

// Schema para exclusão de conta
const accountDeletionSchema = Joi.object({
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Senha é obrigatória para excluir a conta'
    }),
  
  confirmation: Joi.string()
    .valid('EXCLUIR CONTA')
    .required()
    .messages({
      'any.only': 'Confirmação deve ser exatamente "EXCLUIR CONTA"',
      'any.required': 'Confirmação é obrigatória para excluir a conta'
    })
});

export const validateEmailChange = (data: { newEmail: string; password: string }) => {
  return emailChangeSchema.validate(data, { abortEarly: false });
};

export const validatePasswordChange = (data: { currentPassword: string; newPassword: string }) => {
  return passwordChangeSchema.validate(data, { abortEarly: false });
};

export const validateAccountDeletion = (data: { password: string; confirmation: string }) => {
  return accountDeletionSchema.validate(data, { abortEarly: false });
};
