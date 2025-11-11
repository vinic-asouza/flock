import Joi from 'joi';
import { IntegrationMember } from '../types';

const integrationMemberSchema = Joi.object<Partial<IntegrationMember>>({
  name: Joi.string()
    .required()
    .messages({
      'string.empty': 'Nome é obrigatório',
      'any.required': 'Nome é obrigatório'
    }),

  birth: Joi.date()
    .optional()
    .allow(null)
    .messages({
      'date.base': 'Data de nascimento inválida'
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
    .messages({
      'string.base': 'Telefone deve ser um texto'
    }),

  whatsapp: Joi.string()
    .optional()
    .allow(null, '')
    .messages({
      'string.base': 'Whatsapp deve ser um texto'
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
    .allow(null, ''),

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

