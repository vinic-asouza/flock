import Joi from 'joi';
import { CreateRegistrationLinkData } from '../types';

const registrationLinkSchema = Joi.object<CreateRegistrationLinkData>({
  expires_at: Joi.string()
    .required()
    .isoDate()
    .custom((value, helpers) => {
      const expiresAt = new Date(value);
      const now = new Date();
      
      if (expiresAt <= now) {
        return helpers.error('any.custom', {
          message: 'Data de expiração deve ser no futuro'
        });
      }
      
      // Limitar a 1 ano no futuro
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      if (expiresAt > oneYearFromNow) {
        return helpers.error('any.custom', {
          message: 'Data de expiração não pode ser mais de 1 ano no futuro'
        });
      }
      
      return value;
    })
    .messages({
      'string.empty': 'Data de expiração é obrigatória',
      'any.required': 'Data de expiração é obrigatória',
      'string.isoDate': 'Data de expiração deve estar no formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)',
      'any.custom': 'Data de expiração inválida'
    }),

  max_uses: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .optional()
    .allow(null)
    .messages({
      'number.base': 'Número máximo de usos deve ser um número',
      'number.integer': 'Número máximo de usos deve ser um número inteiro',
      'number.min': 'Número máximo de usos deve ser pelo menos 1',
      'number.max': 'Número máximo de usos não pode ser maior que 10000'
    }),

  default_congregation_id: Joi.string()
    .uuid()
    .optional()
    .allow(null, '')
    .messages({
      'string.guid': 'ID da congregação inválido'
    }),

  default_role_id: Joi.string()
    .uuid()
    .optional()
    .allow(null, '')
    .messages({
      'string.guid': 'ID da função inválido'
    }),

  notes: Joi.string()
    .max(500)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Notas não podem ter mais de 500 caracteres'
    })
});

export const validateRegistrationLink = (data: CreateRegistrationLinkData) => {
  return registrationLinkSchema.validate(data, { abortEarly: false });
};

