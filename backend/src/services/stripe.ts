import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Valida todas as variáveis de ambiente necessárias para o Stripe
 * Falha imediatamente no startup se alguma estiver ausente
 */
function validateStripeConfig() {
  const required = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID_M200: process.env.STRIPE_PRICE_ID_M200,
    STRIPE_PRICE_ID_M500: process.env.STRIPE_PRICE_ID_M500,
    STRIPE_PRICE_ID_M800: process.env.STRIPE_PRICE_ID_M800,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value || value.trim() === '')
    .map(([key]) => key);

  if (missing.length > 0) {
    const errorMessage = `❌ Variáveis de ambiente do Stripe faltando: ${missing.join(', ')}\n` +
      `Por favor, configure todas as variáveis necessárias antes de iniciar o servidor.\n` +
      `Consulte a documentação em docs/ENVIRONMENT-VARIABLES.md para mais informações.`;
    
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  console.log('✅ Todas as variáveis de ambiente do Stripe estão configuradas');
}

// Validar configuração antes de inicializar
validateStripeConfig();

// Inicializar cliente Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
});

// Mapeamento de planos para price_ids
export const STRIPE_PRICE_IDS = {
  '200': process.env.STRIPE_PRICE_ID_M200!,
  '500': process.env.STRIPE_PRICE_ID_M500!,
  '800': process.env.STRIPE_PRICE_ID_M800!,
  // 'custom': process.env.STRIPE_PRICE_ID_CUSTOM || '',
};

/**
 * Executa uma função com retry e exponential backoff
 * @param fn Função a ser executada
 * @param maxRetries Número máximo de tentativas (padrão: 3)
 * @param baseDelay Delay base em milissegundos (padrão: 1000ms)
 * @returns Resultado da função
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Não fazer retry para erros 4xx (erros do cliente)
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }
      
      // Não fazer retry para erros de tipo específicos do Stripe que não devem ser retentados
      if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
        throw error;
      }
      
      // Se não é última tentativa, aguardar antes de retry
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⚠️ Tentativa ${attempt + 1}/${maxRetries + 1} falhou, aguardando ${delay}ms antes de retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`❌ Todas as ${maxRetries + 1} tentativas falharam`);
  throw lastError!;
}

/**
 * Criar ou recuperar cliente no Stripe
 * Previne criação de múltiplos customers para o mesmo email
 */
export async function getOrCreateCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  return withRetry(async () => {
    // Buscar cliente existente por email (com limite maior para garantir que encontramos)
    const customers = await stripe.customers.list({
      email,
      limit: 10, // Aumentar limite para garantir que encontramos todos
    });

    if (customers.data.length > 0) {
      // Se múltiplos encontrados, usar o mais recente e logar aviso
      if (customers.data.length > 1) {
        console.warn(
          `⚠️ Múltiplos customers encontrados para email ${email}. Usando o mais recente.`
        );
        // Ordenar por data de criação (mais recente primeiro)
        customers.data.sort((a, b) => b.created - a.created);
      }
      return customers.data[0];
    }

    // Criar novo cliente
    try {
      return await stripe.customers.create({
        email,
        name,
        metadata: metadata || {},
      });
    } catch (error: any) {
      // Se erro for de duplicação (race condition), tentar buscar novamente
      if (error.code === 'resource_already_exists' || error.type === 'StripeInvalidRequestError') {
        console.log(`⚠️ Customer já existe para ${email}, buscando novamente...`);
        const retryCustomers = await stripe.customers.list({
          email,
          limit: 1,
        });
        if (retryCustomers.data.length > 0) {
          return retryCustomers.data[0];
        }
      }
      throw error;
    }
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
  return withRetry(async () => {
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
  });
}

/**
 * Obter assinatura por ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return withRetry(async () => {
    return await stripe.subscriptions.retrieve(subscriptionId);
  });
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
  return withRetry(async () => {
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
  });
}

/**
 * Obter portal do cliente (para gerenciar assinatura)
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return withRetry(async () => {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  });
}

