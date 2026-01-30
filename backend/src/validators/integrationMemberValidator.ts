import Joi from 'joi';
import { IntegrationMember } from '../types';
import { validatePhone } from '../utils/validations';

const integrationMemberSchema = Joi.object<Partial<IntegrationMember>>({
  name: Joi.string()
    .required()
    .messages({
      'string.empty': 'Nome é obrigatório',
      'any.required': 'Nome é obrigatório'
    }),

  birth: Joi.alternatives()
    .try(
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
        'string.pattern.base': 'Data de nascimento deve estar no formato YYYY-MM-DD'
      }),
      Joi.date()
    )
    .optional()
    .allow(null)
    .custom((value, helpers) => {
      if (!value) return value; // Permitir null/undefined
      
      let date: Date;
      
      if (typeof value === 'string') {
        date = new Date(value);
      } else {
        date = value as Date;
      }
      
      if (isNaN(date.getTime())) {
        return helpers.error('date.base', {
          message: 'Data de nascimento inválida'
        });
      }
      
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Fim do dia de hoje
      
      if (date > today) {
        return helpers.error('any.custom', {
          message: 'Data de nascimento não pode ser no futuro'
        });
      }
      
      return value;
    })
    .messages({
      'date.base': 'Data de nascimento inválida',
      'any.custom': 'Data de nascimento não pode ser no futuro'
    }),

  gender: Joi.string()
    .valid('masculino', 'feminino')
    .optional()
    .allow(null, '')
    .messages({
      'any.only': 'Gênero deve ser masculino ou feminino'
    }),

  marital_status: Joi.string()
    .valid('solteiro', 'casado', 'divorciado', 'viuvo', 'outro')
    .optional()
    .allow(null, '')
    .messages({
      'any.only': 'Estado civil deve ser solteiro, casado, divorciado, viuvo ou outro'
    }),

  phone: Joi.string()
    .optional()
    .allow(null, '')
    .custom((value, helpers) => {
      if (!value || value.trim() === '') return value;
      if (!validatePhone(value)) {
        return helpers.error('any.custom', { message: 'Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) 9XXXX-XXXX' });
      }
      return value;
    })
    .messages({
      'string.base': 'Telefone deve ser um texto',
      'any.custom': 'Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) 9XXXX-XXXX'
    }),

  whatsapp: Joi.string()
    .optional()
    .allow(null, '')
    .custom((value, helpers) => {
      if (!value || value.trim() === '') return value;
      if (!validatePhone(value)) {
        return helpers.error('any.custom', { message: 'WhatsApp inválido. Use o formato (XX) 9XXXX-XXXX' });
      }
      return value;
    })
    .messages({
      'string.base': 'Whatsapp deve ser um texto',
      'any.custom': 'WhatsApp inválido. Use o formato (XX) 9XXXX-XXXX'
    }),

  expected_admission_type: Joi.string()
    .valid('batismo', 'transferencia', 'profissao de fe', 'outro')
    .optional()
    .allow(null, '')
    .messages({
      'any.only': 'Tipo de admissão deve ser batismo, transferencia, profissao de fe ou outro'
    }),

  expected_congregation_id: Joi.string()
    .uuid()
    .optional()
    .allow(null, '')
    .messages({
      'string.guid': 'ID da congregação previsto inválido'
    }),

  mentor_id: Joi.string()
    .uuid()
    .optional()
    .allow(null, '')
    .messages({
      'string.guid': 'ID do responsável/discipulador inválido'
    }),

  notes: Joi.string()
    .optional()
    .allow(null, '')
    .max(5000)
    .messages({
      'string.max': 'Observações não podem ter mais de 5000 caracteres'
    }),

  status: Joi.string()
    .valid('em_progresso', 'integrado', 'descartado')
    .optional()
    .messages({
      'any.only': 'Status inválido'
    })
});

export const validateIntegrationMember = (data: Partial<IntegrationMember>) => {
  return integrationMemberSchema.validate(data, { abortEarly: false });
};

