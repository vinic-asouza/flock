import { z } from 'zod';
import { validatePhone, validateCEP, validateCPFOrCNPJ, validateDateFormat } from '@/utils/validations';
import { formatDateToISO } from '@/utils';

export const memberSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.trim() === '' || validatePhone(val), {
      message: 'Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) 9XXXX-XXXX',
    }),
  whatsapp: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.trim() === '' || validatePhone(val), {
      message: 'WhatsApp inválido. Use o formato (XX) 9XXXX-XXXX',
    }),
  birth: z.string()
    .min(1, 'Data de nascimento é obrigatória')
    .refine((val) => {
      if (!val) return false;
      if (!validateDateFormat(val)) return false;
      const date = formatDateToISO(val);
      if (!date) return false;
      return new Date(date) <= new Date();
    }, { message: 'Data de nascimento deve estar no formato DD/MM/YYYY (ex: 05/01/2001)' }),
  gender: z.enum(['Masculino', 'Feminino']),
  marital_status: z.enum(['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro', 'União Estável']),
  hometown: z.string().optional().or(z.literal('')),
  // nationality mantido para não quebrar leitura legada, mas não exibido no form
  nationality: z.string().optional().or(z.literal('')),
  document: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.trim() === '' || validateCPFOrCNPJ(val), {
      message: 'CPF ou CNPJ inválido',
    }),
  occupation: z.string().optional().or(z.literal('')),
  occupation_other: z.string().optional().or(z.literal('')),
  wedding_date: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.trim() === '' || validateDateFormat(val), {
      message: 'Data deve estar no formato DD/MM/YYYY',
    }),
  spouse: z.string().optional().or(z.literal('')),
  spouse_is_member: z.boolean().optional(),
  father_name: z.string().optional().or(z.literal('')),
  father_is_member: z.enum(['sim', 'nao', 'falecido']).optional(),
  mother_name: z.string().optional().or(z.literal('')),
  mother_is_member: z.enum(['sim', 'nao', 'falecido']).optional(),
  children: z.array(z.object({
    name: z.string().min(1, 'Nome do filho é obrigatório'),
    birth: z.string()
      .optional()
      .or(z.literal(''))
      .refine((val) => !val || val.trim() === '' || validateDateFormat(val), {
        message: 'Data de nascimento do filho deve estar no formato DD/MM/YYYY',
      }),
    dependent: z.boolean().optional(),
  })).optional(),
  address: z.string().min(1, 'Endereço é obrigatório'),
  address_number: z.string().optional().or(z.literal('')),
  complement: z.string().optional().or(z.literal('')),
  neighborhood: z.string().optional().or(z.literal('')),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  cep: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.trim() === '' || validateCEP(val), {
      message: 'CEP inválido. Deve conter 8 dígitos',
    }),
  // Informações Eclesiásticas
  years_evangelical: z.string().optional().or(z.literal('')),
  evangelical_family: z.boolean().optional(),
  is_baptized: z.boolean().optional(),
  baptism_type: z.enum([
    'catolica', 'adulto_nesta_igreja', 'adulto_outra_igreja',
    'crianca_nesta_igreja', 'crianca_outra_igreja',
    'novo_convertido', 'sem_religiao',
  ]).optional(),
  baptism_other_church_name: z.string().optional().or(z.literal('')),
  previous_religion: z.string().optional().or(z.literal('')),
  previous_church_active: z.boolean().optional(),
  reason_joining: z.string().optional().or(z.literal('')),
  time_attending: z.string().optional().or(z.literal('')),
  sunday_attendance: z.enum(['todos_os_domingos', 'regularmente', 'as_vezes', 'nao']).optional(),
  weekly_activities: z.boolean().optional(),
  weekly_activities_which: z.string().optional().or(z.literal('')),
  // Informações de Recebimento
  baptism_date: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.trim() === '' || validateDateFormat(val), {
      message: 'Data de batismo deve estar no formato DD/MM/YYYY',
    }),
  admission: z.string().min(1, 'Tipo de recebimento é obrigatório'),
  admission_date: z.string()
    .min(1, 'Data de recebimento é obrigatória')
    .refine((val) => {
      if (!val) return false;
      if (!validateDateFormat(val)) return false;
      const date = formatDateToISO(val);
      if (!date) return false;
      return new Date(date) <= new Date();
    }, { message: 'Data de recebimento deve estar no formato DD/MM/YYYY e não pode ser no futuro' }),
  congregation_id: z.string().min(1, 'Congregação é obrigatória'),
  active: z.boolean(),
});

export type MemberFormData = z.infer<typeof memberSchema>;
