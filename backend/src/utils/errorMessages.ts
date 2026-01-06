/**
 * Mensagens de erro amigáveis para o usuário
 * Mapeia erros técnicos do Stripe para mensagens compreensíveis
 */
export const USER_FRIENDLY_ERRORS: Record<string, string> = {
  // Erros de cartão
  'card_declined': 'Seu cartão foi recusado. Verifique os dados ou use outro método de pagamento.',
  'expired_card': 'Cartão expirado. Use um cartão válido.',
  'incorrect_cvc': 'Código de segurança (CVC) incorreto. Verifique e tente novamente.',
  'insufficient_funds': 'Saldo insuficiente no cartão. Verifique sua conta bancária.',
  'invalid_cvc': 'Código de segurança (CVC) inválido. Verifique e tente novamente.',
  'invalid_expiry_month': 'Mês de expiração inválido. Verifique a data do cartão.',
  'invalid_expiry_year': 'Ano de expiração inválido. Verifique a data do cartão.',
  'invalid_number': 'Número do cartão inválido. Verifique os dados do cartão.',
  
  // Erros de processamento
  'processing_error': 'Erro ao processar pagamento. Tente novamente em alguns instantes.',
  'rate_limit': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
  'authentication_required': 'Pagamento requer autenticação. Complete a verificação no seu banco.',
  
  // Erros de assinatura
  'subscription_not_found': 'Assinatura não encontrada. Entre em contato com o suporte.',
  'subscription_already_canceled': 'Esta assinatura já foi cancelada.',
  'subscription_cannot_be_canceled': 'Não foi possível cancelar a assinatura. Entre em contato com o suporte.',
  
  // Erros gerais
  'api_error': 'Erro temporário no processamento. Tente novamente em alguns instantes.',
  'invalid_request_error': 'Dados inválidos. Verifique as informações e tente novamente.',
  'idempotency_key_in_use': 'Esta operação já está sendo processada. Aguarde alguns instantes.',
  
  // Erros customizados do sistema
  'STRIPE_CARD_DECLINED': 'Seu cartão foi recusado. Verifique os dados ou use outro método de pagamento.',
  'STRIPE_INSUFFICIENT_FUNDS': 'Saldo insuficiente no cartão. Verifique sua conta bancária.',
  'STRIPE_EXPIRED_CARD': 'Cartão expirado. Use um cartão válido.',
  'STRIPE_PROCESSING_ERROR': 'Erro ao processar pagamento. Tente novamente em alguns instantes.',
  'SUBSCRIPTION_NOT_FOUND': 'Assinatura não encontrada. Entre em contato com o suporte.',
  'PLAN_LIMIT_EXCEEDED': 'Limite de membros do plano atingido. Faça upgrade para adicionar mais membros.',
  'DOWNGRADE_NOT_ALLOWED': 'Não é possível fazer downgrade. Remova membros antes de alterar o plano.',
};

/**
 * Obtém mensagem amigável para um erro do Stripe
 */
export function getFriendlyErrorMessage(error: any): string {
  // Se já é uma mensagem amigável, retornar direto
  if (typeof error === 'string' && USER_FRIENDLY_ERRORS[error]) {
    return USER_FRIENDLY_ERRORS[error];
  }

  // Verificar código de erro do Stripe
  if (error?.code && USER_FRIENDLY_ERRORS[error.code]) {
    return USER_FRIENDLY_ERRORS[error.code];
  }

  // Verificar tipo de erro do Stripe
  if (error?.type) {
    const typeKey = `STRIPE_${error.type.toUpperCase().replace(/-/g, '_')}`;
    if (USER_FRIENDLY_ERRORS[typeKey]) {
      return USER_FRIENDLY_ERRORS[typeKey];
    }
  }

  // Verificar mensagem de erro
  if (error?.message) {
    const message = error.message.toLowerCase();
    
    // Buscar palavras-chave na mensagem
    if (message.includes('card') && message.includes('declined')) {
      return USER_FRIENDLY_ERRORS['card_declined'];
    }
    if (message.includes('expired')) {
      return USER_FRIENDLY_ERRORS['expired_card'];
    }
    if (message.includes('insufficient') || message.includes('funds')) {
      return USER_FRIENDLY_ERRORS['insufficient_funds'];
    }
    if (message.includes('processing')) {
      return USER_FRIENDLY_ERRORS['processing_error'];
    }
  }

  // Mensagem padrão
  return 'Ocorreu um erro ao processar sua solicitação. Tente novamente ou entre em contato com o suporte.';
}

/**
 * Formata erro para resposta da API
 * Retorna mensagem amigável para o usuário e mantém detalhes técnicos apenas em desenvolvimento
 */
export function formatErrorResponse(error: any, defaultMessage?: string) {
  const friendlyMessage = getFriendlyErrorMessage(error);
  const technicalDetails = process.env.NODE_ENV === 'development' 
    ? {
        originalError: error?.message || error?.toString(),
        code: error?.code,
        type: error?.type,
        stack: error?.stack,
      }
    : undefined;

  return {
    error: defaultMessage || friendlyMessage,
    details: technicalDetails,
  };
}

