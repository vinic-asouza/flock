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
