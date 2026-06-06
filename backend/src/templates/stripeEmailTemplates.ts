/**
 * Templates de email para eventos do Stripe
 */
import { renderTemplate } from './templateLoader';
import { getPlanName, getPlanPrice, getPlanConfig } from '../config/plans';

/**
 * Template de confirmação de pagamento bem-sucedido (nova assinatura)
 */
export const getPaymentSuccessTemplate = (data: {
  churchName: string;
  planName: string;
  amount: string;
  nextBillingDate?: string;
}): string => {
  return renderTemplate('payment-success', data);
};

/**
 * Template de pagamento falhado
 */
export const getPaymentFailedTemplate = (data: {
  churchName: string;
  planName: string;
  amount: string;
  retryDate?: string;
}): string => {
  return renderTemplate('payment-failed', data);
};

/**
 * Template de assinatura cancelada
 */
export const getSubscriptionCanceledTemplate = (data: {
  churchName: string;
  planName: string;
  endDate: string;
}): string => {
  return renderTemplate('subscription-canceled', data);
};

/**
 * Template de renovação bem-sucedida
 */
export const getRenewalSuccessTemplate = (data: {
  churchName: string;
  planName: string;
  amount: string;
  nextBillingDate: string;
}): string => {
  return renderTemplate('renewal-success', data);
};

/**
 * Template de confirmação de troca de plano
 */
export const getPlanChangedTemplate = (data: {
  userName: string;
  oldPlanName: string;
  newPlanName: string;
  newPlanPrice: string;
  nextBillingDate?: string;
  isUpgrade?: boolean;
  isDowngrade?: boolean;
}): string => {
  return renderTemplate('plan-changed', data);
};

/**
 * Template de aviso de expiração de assinatura
 */
export const getSubscriptionExpiringWarningTemplate = (data: {
  userName: string;
  planName: string;
  expirationDate: string;
  daysRemaining: string;
  warningTitle: string;
  warningColor: string;
  borderColor: string;
  isUrgent: boolean;
}): string => {
  return renderTemplate('subscription-expiring-warning', data);
};

/**
 * Template de assinatura reativada após cancelamento
 */
export const getSubscriptionReactivatedTemplate = (data: {
  churchName: string;
  planName: string;
  amount: string;
  nextBillingDate: string;
}): string => {
  return renderTemplate('subscription-reactivated', data);
};

/**
 * Template de cancelamento agendado (cancel_at_period_end=true)
 * SL02: diferencia "agendou cancelamento" de "assinatura encerrada"
 */
export const getSubscriptionScheduledCancellationTemplate = (data: {
  churchName: string;
  planName: string;
  endDate: string;
}): string => {
  const { churchName, planName, endDate } = data;
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Cancelamento Agendado</title></head>
<body style="font-family:sans-serif;background:#f9fafb;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e7eb">
    <h2 style="color:#f59e0b;margin-top:0">Cancelamento agendado — ${churchName}</h2>
    <p>Você solicitou o cancelamento da assinatura <strong>${planName}</strong>.</p>
    <p>Seu acesso permanece ativo até <strong>${endDate}</strong>. Após essa data a conta será convertida para o plano gratuito automaticamente.</p>
    <p>Se mudar de ideia, você pode reativar sua assinatura a qualquer momento pelo portal de gerenciamento.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="font-size:12px;color:#6b7280">Equipe Flock</p>
  </div>
</body>
</html>`;
};
