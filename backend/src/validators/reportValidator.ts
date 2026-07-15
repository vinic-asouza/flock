import Joi from 'joi';

/**
 * Schema de validação para filtros de relatórios de membros
 */
export const reportFiltersSchema = Joi.object({
  // Filtros básicos
  congregation_id: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.base': 'ID da congregação deve ser uma string'
    }),

  // Filtros demográficos
  gender: Joi.string()
    .valid('Masculino', 'Feminino', 'Outro', 'Não informado')
    .optional()
    .messages({
      'any.only': 'Gênero deve ser: Masculino, Feminino, Outro ou Não informado'
    }),

  marital_status: Joi.string()
    .valid('Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável', 'Não informado')
    .optional()
    .messages({
      'any.only': 'Estado civil inválido'
    }),

  nationality: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Nacionalidade não pode ter mais de 100 caracteres'
    }),

  occupation: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Ocupação não pode ter mais de 100 caracteres'
    }),

  city: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Cidade não pode ter mais de 100 caracteres'
    }),

  state: Joi.string()
    .length(2)
    .optional()
    .messages({
      'string.length': 'Estado deve ser uma sigla de 2 caracteres (ex: SP, RJ)'
    }),

  // Filtros temporais - datas
  birth_date_from: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Data de nascimento (de) deve estar no formato YYYY-MM-DD'
    }),

  birth_date_to: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Data de nascimento (até) deve estar no formato YYYY-MM-DD'
    }),

  baptism_date_from: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Data de batismo (de) deve estar no formato YYYY-MM-DD'
    }),

  baptism_date_to: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Data de batismo (até) deve estar no formato YYYY-MM-DD'
    }),

  admission_date_from: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Data de recebimento (de) deve estar no formato YYYY-MM-DD'
    }),

  admission_date_to: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Data de recebimento (até) deve estar no formato YYYY-MM-DD'
    }),

  // Filtros por faixa etária
  age_from: Joi.number()
    .integer()
    .min(0)
    .max(150)
    .optional()
    .messages({
      'number.base': 'Idade mínima deve ser um número',
      'number.integer': 'Idade mínima deve ser um número inteiro',
      'number.min': 'Idade mínima deve ser maior ou igual a 0',
      'number.max': 'Idade mínima deve ser menor ou igual a 150'
    }),

  age_to: Joi.number()
    .integer()
    .min(0)
    .max(150)
    .optional()
    .messages({
      'number.base': 'Idade máxima deve ser um número',
      'number.integer': 'Idade máxima deve ser um número inteiro',
      'number.min': 'Idade máxima deve ser maior ou igual a 0',
      'number.max': 'Idade máxima deve ser menor ou igual a 150'
    }),

  // Busca geral
  search: Joi.string()
    .max(255)
    .optional()
    .messages({
      'string.max': 'Busca não pode ter mais de 255 caracteres'
    })
}).custom((value, helpers) => {
  // Validação cruzada: data_from deve ser anterior a data_to
  const validateDateRange = (from: string | undefined, to: string | undefined, fieldName: string) => {
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return helpers.error('any.custom', {
          message: `${fieldName}: datas inválidas`
        });
      }
      
      if (fromDate > toDate) {
        return helpers.error('any.custom', {
          message: `${fieldName}: data inicial deve ser anterior à data final`
        });
      }
    }
    return value;
  };

  // Validar ranges de datas
  validateDateRange(value.birth_date_from, value.birth_date_to, 'Data de nascimento');
  validateDateRange(value.baptism_date_from, value.baptism_date_to, 'Data de batismo');
  validateDateRange(value.admission_date_from, value.admission_date_to, 'Data de recebimento');

  // Validação: age_from deve ser menor que age_to
  if (value.age_from !== undefined && value.age_to !== undefined) {
    if (value.age_from > value.age_to) {
      return helpers.error('any.custom', {
        message: 'Idade mínima deve ser menor ou igual à idade máxima'
      });
    }
  }

  return value;
}).messages({
  'any.custom': 'Erro de validação nos filtros'
});
