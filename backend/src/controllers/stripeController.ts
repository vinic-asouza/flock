import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe, STRIPE_PRICE_IDS, getOrCreateCustomer, createCheckoutSession, createCustomerPortalSession } from '../services/stripe';
import supabase from '../services/supabase';
import { AuthRequest } from '../types';

/**
 * Criar sessão de checkout
 * POST /api/stripe/create-checkout-session
 */
export const createCheckout = async (req: AuthRequest, res: Response) => {
  try {
    const { plan } = req.body;

    // Validar plano
    if (!plan || !['200', '500', '800', 'custom'].includes(plan)) {
      return res.status(400).json({
        error: 'Plano inválido',
        details: 'Plano deve ser: 200, 500, 800 ou custom',
      });
    }

    // Obter price_id do plano
    const priceId = STRIPE_PRICE_IDS[plan as keyof typeof STRIPE_PRICE_IDS];
    if (!priceId) {
      return res.status(500).json({
        error: 'Plano não configurado',
        details: `Price ID para o plano ${plan} não está configurado`,
      });
    }

    // Se usuário autenticado, buscar dados da igreja
    let customerId: string;
    let churchId: string | undefined;
    let customerEmail: string;
    let customerName: string;

    if (req.user) {
      // Buscar igreja do usuário
      const { data: church, error: churchError } = await supabase
        .from('churches')
        .select('id, name, email_church, user_id, stripe_customer_id')
        .eq('user_id', req.user.id)
        .single();

      if (churchError || !church) {
        return res.status(404).json({
          error: 'Igreja não encontrada',
          details: 'Usuário não possui igreja cadastrada',
        });
      }

      churchId = church.id;
      customerEmail = church.email_church || req.user.email;
      customerName = church.name;

      // Se já tem customer_id, usar ele
      if (church.stripe_customer_id) {
        customerId = church.stripe_customer_id;
      } else {
        // Criar ou buscar cliente no Stripe
        const customer = await getOrCreateCustomer(
          customerEmail,
          customerName,
          {
            church_id: church.id,
            user_id: req.user.id,
          }
        );
        customerId = customer.id;

        // Salvar customer_id na igreja
        await supabase
          .from('churches')
          .update({ stripe_customer_id: customerId })
          .eq('id', church.id);
      }
    } else {
      // Usuário não autenticado (checkout da landing page)
      const { email, name, church_id } = req.body;

      if (!email || !name) {
        return res.status(400).json({
          error: 'Email e nome são obrigatórios',
        });
      }

      customerEmail = email;
      customerName = name;
      churchId = church_id;

      // Criar cliente temporário no Stripe
      const customer = await getOrCreateCustomer(
        customerEmail,
        customerName,
        {
          church_id: church_id || 'pending',
        }
      );
      customerId = customer.id;
    }

    // URLs de redirecionamento
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/subscription/cancel`;

    // Criar sessão de checkout
    const session = await createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      {
        plan,
        church_id: churchId || 'pending',
        customer_email: customerEmail,
      }
    );

    res.json({
      session_id: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Erro ao criar checkout:', error);
    res.status(500).json({
      error: 'Erro ao criar sessão de checkout',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Criar sessão do portal do cliente
 * POST /api/stripe/create-portal-session
 */
export const createPortalSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autenticado',
        details: 'É necessário estar autenticado para acessar o portal',
      });
    }

    // Buscar igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('stripe_customer_id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
      });
    }

    if (!church.stripe_customer_id) {
      return res.status(400).json({
        error: 'Cliente não possui assinatura',
        details: 'É necessário ter uma assinatura ativa para acessar o portal',
      });
    }

    // Criar sessão do portal
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnUrl = `${frontendUrl}/settings/subscription`;

    const portalSession = await createCustomerPortalSession(
      church.stripe_customer_id,
      returnUrl
    );

    res.json({
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error('Erro ao criar portal session:', error);
    res.status(500).json({
      error: 'Erro ao criar sessão do portal',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Webhook do Stripe
 * POST /api/stripe/webhook
 */
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET não configurado');
    return res.status(500).json({ error: 'Webhook secret não configurado' });
  }

  let event: any;

  try {
    // Verificar assinatura do webhook
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error('Erro ao verificar webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Processar evento
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
};

/**
 * Handler para checkout completado
 */
async function handleCheckoutCompleted(session: any) {
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const plan = session.metadata?.plan;

  if (!customerId || !subscriptionId) {
    console.error('Dados incompletos no checkout:', session);
    return;
  }

  // Buscar assinatura para obter mais detalhes
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;

  // Determinar tipo de plano baseado no price_id
  const planType = Object.entries(STRIPE_PRICE_IDS).find(
    ([_, id]) => id === priceId
  )?.[0] || plan || 'custom';

  // Acessar propriedades com type assertion (Stripe SDK pode ter tipos incompletos)
  const sub = subscription as any;
  const currentPeriodStart = sub.current_period_start as number | null;
  const cancelAt = sub.cancel_at as number | null;

  // Buscar igreja pelo customer_id ou metadata
  const churchId = session.metadata?.church_id;
  const customerEmail = session.metadata?.customer_email || session.customer_email;

  if (churchId && churchId !== 'pending') {
    // Igreja existe, vincular diretamente
    await supabase
      .from('churches')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: subscription.status,
        plan_type: planType,
        subscription_start_date: currentPeriodStart
          ? new Date(currentPeriodStart * 1000).toISOString()
          : null,
        subscription_end_date: cancelAt
          ? new Date(cancelAt * 1000).toISOString()
          : null,
      })
      .eq('id', churchId);
  } else {
    // Tentar buscar igreja por customer_id (caso já exista)
    const { data: existingChurch } = await supabase
      .from('churches')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (existingChurch) {
      // Igreja encontrada por customer_id, vincular
      await supabase
        .from('churches')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: subscription.status,
          plan_type: planType,
          subscription_start_date: currentPeriodStart
            ? new Date(currentPeriodStart * 1000).toISOString()
            : null,
          subscription_end_date: cancelAt
            ? new Date(cancelAt * 1000).toISOString()
            : null,
        })
        .eq('id', existingChurch.id);
    } else if (customerEmail) {
      // Igreja não existe, salvar como assinatura pendente vinculada ao email
      await supabase
        .from('pending_subscriptions')
        .insert({
          email: customerEmail,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan_type: planType,
          subscription_status: subscription.status,
          subscription_start_date: currentPeriodStart
            ? new Date(currentPeriodStart * 1000).toISOString()
            : null,
        });
      
      console.log(`✅ Assinatura pendente salva para email: ${customerEmail}`);
    } else {
      console.error('❌ Não foi possível vincular assinatura: email não encontrado');
    }
  }
}

/**
 * Handler para assinatura atualizada
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0].price.id;

  // Determinar tipo de plano
  const planType = Object.entries(STRIPE_PRICE_IDS).find(
    ([_, id]) => id === priceId
  )?.[0] || 'custom';

  // Acessar propriedades com type assertion para evitar erros de tipo
  const currentPeriodStart = (subscription as any).current_period_start as number;
  const cancelAt = (subscription as any).cancel_at as number | null;
  const canceledAt = (subscription as any).canceled_at as number | null;

  // Atualizar igreja
  await supabase
    .from('churches')
    .update({
      stripe_subscription_id: subscriptionId,
      subscription_status: subscription.status,
      plan_type: planType,
      subscription_start_date: currentPeriodStart
        ? new Date(currentPeriodStart * 1000).toISOString()
        : null,
      subscription_end_date: cancelAt
        ? new Date(cancelAt * 1000).toISOString()
        : canceledAt
        ? new Date(canceledAt * 1000).toISOString()
        : null,
    })
    .eq('stripe_customer_id', customerId);
}

/**
 * Handler para assinatura cancelada
 */
async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer;

  // Atualizar status da assinatura
  await supabase
    .from('churches')
    .update({
      subscription_status: 'canceled',
      subscription_end_date: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);
}

/**
 * Handler para pagamento bem-sucedido
 */
async function handlePaymentSucceeded(invoice: any) {
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  if (subscriptionId) {
    // Atualizar data de renovação
    await supabase
      .from('churches')
      .update({
        subscription_status: 'active',
      })
      .eq('stripe_customer_id', customerId);
  }
}

/**
 * Handler para pagamento falhado
 */
async function handlePaymentFailed(invoice: any) {
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  if (subscriptionId) {
    // Atualizar status para past_due
    await supabase
      .from('churches')
      .update({
        subscription_status: 'past_due',
      })
      .eq('stripe_customer_id', customerId);
  }
}

