import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cron from 'node-cron';

import authRoutes from './routes/auth';
import passwordRoutes from './routes/password';
import memberRoutes from './routes/members';
import congregationRoutes from './routes/congregations';
import refreshRoutes from './routes/refresh';
import churchRoutes from './routes/church';
import accountRoutes from './routes/account';
import authCallbackRoutes from './routes/authCallback';
import exportRoutes from './routes/export';
import integrationRoutes from './routes/integration';
import waitlistRoutes from './routes/waitlist';
import stripeRoutes from './routes/stripe';
import publicRoutes from './routes/public';
import registrationLinksRoutes from './routes/registrationLinks';
import integrationLinksRoutes from './routes/integrationLinks';
import plansRoutes from './routes/plans';
import groupsRoutes from './routes/groups';
import calendarRoutes from './routes/calendar';
import calendarParticipantsRoutes from './routes/calendarParticipants';
import churchUsersRoutes from './routes/churchUsers';
import { requestIdMiddleware } from './middlewares/requestId';
import { requireInternalToken } from './middlewares/internalToken';
import { runTrackedJob } from './utils/jobRuns';
import { initSentryBilling } from './utils/sentryBilling';
import { getMetricsText, getMetricsContentType } from './utils/billingMetrics';
import { getBillingStats } from './controllers/billingStatsController';

dotenv.config();
initSentryBilling();

const app = express();

// Configurar trust proxy para produção (necessário quando há proxy reverso)
// Railway geralmente usa 1 proxy reverso, então confiamos apenas no primeiro
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Mais seguro que 'true' - confia apenas no primeiro proxy
  console.log('✅ Trust proxy habilitado para produção (1 proxy)');
}

// Configuração de segurança básica
app.use(helmet());

// Correlation ID para logs (X-Request-Id)
app.use(requestIdMiddleware);

// Configuração do CORS - permitir múltiplas origens (frontend e landing)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3001',
  process.env.LANDING_URL || 'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Origin required'));
      }
      return callback(null, true);
    }
    
    // Permitir se estiver na lista de origens permitidas
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Em desenvolvimento, permitir localhost
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Permitir cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Church-Id'],
  optionsSuccessStatus: 200 // Para suporte a navegadores legados
}));

// Logging
app.use(morgan('dev'));

// Rate limiting geral - proteção contra DDoS e uso excessivo
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requisições por IP em 15 minutos
  message: {
    error: 'Muitas requisições',
    details: 'Você excedeu o limite de requisições. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Pular rate limiting para health checks
  skip: (req) => req.path === '/health',
});

// Aplicar rate limiting geral
app.use(generalLimiter);

// Parser para cookies
app.use(cookieParser());

// IMPORTANTE: Registrar rota do webhook ANTES do express.json()
// O webhook precisa receber o body raw (não parseado) para verificar a assinatura
app.use('/api/stripe', stripeRoutes);

// Parser para JSON (após a rota do webhook)
app.use(express.json());

// Rotas com rate limiting específico
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/congregations', congregationRoutes);
app.use('/api/refresh', refreshRoutes);
app.use('/api/church', churchRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/auth', authCallbackRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/registration-links', registrationLinksRoutes);
app.use('/api/integration-links', integrationLinksRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api', calendarParticipantsRoutes);
app.use('/api/church-users', churchUsersRoutes);

// Rota de healthcheck básico
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Prometheus metrics (protegido por METRICS_TOKEN quando definido)
app.get('/metrics', requireInternalToken('METRICS_TOKEN'), async (_req, res) => {
  try {
    res.set('Content-Type', getMetricsContentType());
    res.send(await getMetricsText());
  } catch (err) {
    console.error('Erro ao exportar métricas:', err);
    res.status(500).send('metrics_error');
  }
});

// Stats operacionais de billing (protegido por INTERNAL_BILLING_TOKEN)
app.get(
  '/api/internal/billing/stats',
  requireInternalToken('INTERNAL_BILLING_TOKEN'),
  getBillingStats
);

// Health Stripe: mínimo, sem chamada à API; opcional HEALTH_CHECK_TOKEN
app.get('/api/health/stripe', async (req, res) => {
  const expected = process.env.HEALTH_CHECK_TOKEN;
  if (expected) {
    const provided =
      (typeof req.headers['x-health-token'] === 'string' && req.headers['x-health-token']) ||
      (typeof req.query.token === 'string' && req.query.token);
    if (provided !== expected) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
  try {
    const { checkStripeHealth } = require('./controllers/stripeController');
    await checkStripeHealth(req, res);
  } catch {
    res.status(503).json({ status: 'unhealthy' });
  }
});

// Handler de erros
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Configurar jobs agendados (cron jobs)
// Limpeza de assinaturas pendentes expiradas - roda diariamente às 2h da manhã
// Verificação de expiração de assinaturas - roda diariamente às 9h da manhã
if (process.env.ENABLE_CRON_JOBS !== 'false') {
  const { runCleanupJob } = require('./jobs/cleanupPendingSubscriptions');
  const { runExpirationCheckJob } = require('./jobs/checkSubscriptionExpiration');
  const { runWebhookCleanupJob } = require('./jobs/cleanupWebhookEvents');
  const { runDowngradeExpiredSubscriptionsJob } = require('./jobs/downgradeExpiredSubscriptions');
  const { runSubscriptionIntegrityJob } = require('./jobs/validateSubscriptionIntegrity');

  const scheduleJob = (name: string, fn: () => Promise<number>) => {
    return () => runTrackedJob(name, fn).catch((err) => {
      console.error(`[cron] Falha no job ${name}:`, err);
    });
  };

  // Executar limpeza diariamente às 2h da manhã
  cron.schedule('0 2 * * *', scheduleJob('cleanup_pending_subscriptions', runCleanupJob), {
    timezone: 'America/Sao_Paulo'
  });

  // SL04: Downgrade de assinaturas expiradas sem webhook — diariamente às 3h
  cron.schedule('0 3 * * *', scheduleJob('downgrade_expired_subscriptions', runDowngradeExpiredSubscriptionsJob), {
    timezone: 'America/Sao_Paulo'
  });

  // OB08: Validação de integridade Stripe ↔ banco — diariamente às 5h
  cron.schedule('0 5 * * *', scheduleJob('validate_subscription_integrity', runSubscriptionIntegrityJob), {
    timezone: 'America/Sao_Paulo'
  });
  
  // Executar verificação de expiração diariamente às 9h da manhã
  cron.schedule('0 9 * * *', scheduleJob('check_subscription_expiration', runExpirationCheckJob), {
    timezone: 'America/Sao_Paulo'
  });

  cron.schedule('0 4 * * 0', scheduleJob('cleanup_webhook_events', runWebhookCleanupJob), {
    timezone: 'America/Sao_Paulo'
  });
  
  console.log('✅ Jobs agendados configurados:');
  console.log('   - Limpeza de assinaturas pendentes: diariamente às 2h');
  console.log('   - Downgrade de assinaturas expiradas: diariamente às 3h');
  console.log('   - Validação integridade Stripe: diariamente às 5h');
  console.log('   - Verificação de expiração: diariamente às 9h');
  console.log('   - Limpeza de webhooks processados: domingos às 4h');
}

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 