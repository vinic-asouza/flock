import Joi from 'joi';

export const addParticipantSchema = Joi.object({
  member_id: Joi.string().uuid().optional().allow('', null).messages({
    'string.guid': 'O ID do membro deve ser um UUID válido'
  }),
  guest_name: Joi.string().optional().allow('', null).max(255).messages({
    'string.empty': 'O nome do convidado não pode estar vazio',
    'string.max': 'O nome do convidado não pode ter mais de 255 caracteres'
  }),
  guest_email: Joi.string().email().optional().allow('', null).max(255).messages({
    'string.email': 'O email do convidado deve ser válido',
    'string.max': 'O email do convidado não pode ter mais de 255 caracteres'
  }),
  guest_phone: Joi.string().optional().allow('', null).max(20).messages({
    'string.max': 'O telefone do convidado não pode ter mais de 20 caracteres'
  }),
  guest_whatsapp: Joi.string().optional().allow('', null).max(20).messages({
    'string.max': 'O WhatsApp do convidado não pode ter mais de 20 caracteres'
  })
}).custom((value, helpers) => {
  // Validação customizada: deve ter OU member_id OU guest_name, não ambos
  const hasMemberId = value.member_id && value.member_id.trim() !== '';
  const hasGuestName = value.guest_name && value.guest_name.trim() !== '';

  if (!hasMemberId && !hasGuestName) {
    return helpers.error('any.custom', {
      message: 'É necessário informar um membro (member_id) ou dados do convidado (guest_name)'
    });
  }

  if (hasMemberId && hasGuestName) {
    return helpers.error('any.custom', {
      message: 'Informe apenas membro OU convidado, não ambos'
    });
  }

  return value;
});
