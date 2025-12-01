import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não está configurada nas variáveis de ambiente');
}

// Inicializar cliente Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
});

// Mapeamento de planos para price_ids
export const STRIPE_PRICE_IDS = {
  '200': process.env.STRIPE_PRICE_ID_200 || '',
  '500': process.env.STRIPE_PRICE_ID_500 || '',
  '800': process.env.STRIPE_PRICE_ID_800 || '',
  'custom': process.env.STRIPE_PRICE_ID_CUSTOM || '',
};

// Verificar se todos os price_ids estão configurados
Object.entries(STRIPE_PRICE_IDS).forEach(([plan, priceId]) => {
  if (!priceId) {
    console.warn(`⚠️ STRIPE_PRICE_ID_${plan} não está configurado`);
  }
});

/**
 * Criar ou recuperar cliente no Stripe
 */
export async function getOrCreateCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  // Buscar cliente existente por email
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (customers.data.length > 0) {
    return customers.data[0];
  }

  // Criar novo cliente
  return await stripe.customers.create({
    email,
    name,
    metadata: metadata || {},
  });
}

/**
 * Criar sessão de checkout
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: metadata || {},
    subscription_data: {
      metadata: metadata || {},
    },
    allow_promotion_codes: true,
  });
}

/**
 * Obter assinatura por ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancelar assinatura
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

/**
 * Atualizar assinatura (mudar plano)
 */
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'always_invoice',
  });
}

/**
 * Obter portal do cliente (para gerenciar assinatura)
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

