import Joi from 'joi';
import { validateCPFOrCNPJ, validatePhone, validateCEP } from '../utils/validations';
import { Member } from '../types';

const memberSchema = Joi.object({
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
    .required()
    .custom((value, helpers) => {
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
      'any.required': 'Data de nascimento é obrigatória',
      'any.custom': 'Data de nascimento não pode ser no futuro'
    }),

  gender: Joi.string()
    .valid('Masculino', 'Feminino')
    .required()
    .messages({
      'any.only': 'Gênero deve ser Masculino ou Feminino',
      'any.required': 'Gênero é obrigatório'
    }),

  marital_status: Joi.string()
    .valid('Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro')
    .required()
    .messages({
      'any.only': 'Estado civil deve ser Solteiro, Casado, Divorciado, Viúvo ou Outro',
      'any.required': 'Estado civil é obrigatório'
    }),

  nationality: Joi.string()
    .optional()
    .allow(null, ''),

  document: Joi.string()
    .optional()
    .allow(null, '')
    .custom((value, helpers) => {
      if (!value || value.trim() === '') {
        return value; // Campo opcional, pode estar vazio
      }
      
      if (!validateCPFOrCNPJ(value)) {
        return helpers.error('any.custom', {
          message: 'CPF ou CNPJ inválido'
        });
      }
      
      return value;
    }),

  spouse: Joi.string()
    .optional()
    .allow(null, ''),

  address: Joi.string()
    .required()
    .messages({
      'string.empty': 'Endereço é obrigatório',
      'any.required': 'Endereço é obrigatório'
    }),

  complement: Joi.string()
    .optional()
    .allow(null, ''),

  cep: Joi.string()
    .optional()
    .allow(null, '')
    .custom((value, helpers) => {
      if (!value || value.trim() === '') {
        return value; // Campo opcional, pode estar vazio
      }
      
      if (!validateCEP(value)) {
        return helpers.error('any.custom', {
          message: 'CEP inválido. Deve conter 8 dígitos'
        });
      }
      
      return value;
    }),

  neighborhood: Joi.string()
    .optional()
    .allow(null, ''),

  city: Joi.string()
    .required()
    .messages({
      'string.empty': 'Cidade é obrigatória',
      'any.required': 'Cidade é obrigatória'
    }),

  state: Joi.string()
    .length(2)
    .required()
    .messages({
      'string.empty': 'Estado é obrigatório',
      'any.required': 'Estado é obrigatório',
      'string.length': 'Estado deve ter 2 caracteres'
    }),

  phone: Joi.string()
    .optional()
    .allow(null, '')
    .custom((value, helpers) => {
      if (!value || value.trim() === '') {
        return value; // Campo opcional, pode estar vazio
      }
      
      if (!validatePhone(value)) {
        return helpers.error('any.custom', {
          message: 'Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) 9XXXX-XXXX'
        });
      }
      
      return value;
    }),

  whatsapp: Joi.string()
    .optional()
    .allow(null, '')
    .custom((value, helpers) => {
      if (!value || value.trim() === '') {
        return value; // Campo opcional, pode estar vazio
      }
      
      if (!validatePhone(value)) {
        return helpers.error('any.custom', {
          message: 'WhatsApp inválido. Use o formato (XX) 9XXXX-XXXX'
        });
      }
      
      return value;
    }),

  email: Joi.string()
    .email()
    .optional()
    .allow(null, '')
    .messages({
      'string.email': 'Email inválido'
    }),

  baptism_date: Joi.alternatives()
    .try(
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null).messages({
        'string.pattern.base': 'Data de batismo deve estar no formato YYYY-MM-DD'
      }),
      Joi.date().allow(null)
    )
    .optional()
    .allow(null),

  occupation: Joi.string()
    .optional()
    .allow(null, ''),

  // ACHADO 04: enum de valores aceitos para admission — alinhado com o frontend <Select>
  admission: Joi.string()
    .valid(
      'Batismo',
      'Batismo Infantil',
      'Transferencia',
      'Reconciliação',
      'Profissão de fé',
      'Apresentação (sem batismo)',
      'Apresentação (Criança)',
      'Batismo não professo (Criança)',
      'Outro'
    )
    .required()
    .messages({
      'any.only': 'Tipo de recebimento inválido. Valores aceitos: Batismo, Batismo Infantil, Transferencia, Reconciliação, Profissão de fé, Apresentação (sem batismo), Apresentação (Criança), Batismo não professo (Criança), Outro',
      'string.empty': 'Tipo de recebimento é obrigatório',
      'any.required': 'Tipo de recebimento é obrigatório'
    }),

  father_name: Joi.string()
    .optional()
    .allow(null, ''),

  mother_name: Joi.string()
    .optional()
    .allow(null, ''),

  admission_date: Joi.alternatives()
    .try(
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
        'string.pattern.base': 'Data de recebimento deve estar no formato YYYY-MM-DD'
      }),
      Joi.date()
    )
    .required()
    .messages({
      'date.base': 'Data de recebimento inválida',
      'any.required': 'Data de recebimento é obrigatória'
    }),

  congregation_id: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'ID da congregação inválido'
    }),

  children: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        birth: Joi.string().optional().allow(null, ''),
        dependent: Joi.boolean().optional()
      })
    )
    .optional()
    .allow(null),

  active: Joi.boolean()
    .default(true),

  // Campo auxiliar para grupos (processado separadamente - não faz parte do tipo Member)
  groups: Joi.array()
    .items(Joi.string().uuid())
    .optional()
    .allow(null)
});

export const validateMember = (data: Partial<Member> & { groups?: string[] }) => {
  return memberSchema.validate(data, { abortEarly: false, allowUnknown: false });
}; 