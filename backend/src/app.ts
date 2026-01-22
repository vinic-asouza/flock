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
import roleRoutes from './routes/roles';
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

dotenv.config();

const app = express();

// Configurar trust proxy para produção (necessário quando há proxy reverso)
// Railway geralmente usa 1 proxy reverso, então confiamos apenas no primeiro
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Mais seguro que 'true' - confia apenas no primeiro proxy
  console.log('✅ Trust proxy habilitado para produção (1 proxy)');
}

// Configuração de segurança básica
app.use(helmet());

// Configuração do CORS - permitir múltiplas origens (frontend e landing)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3001',
  process.env.LANDING_URL || 'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
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
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
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
  skip: (req) => {
    return req.path === '/health' || req.path === '/api/health/stripe';
  },
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
app.use('/api/roles', roleRoutes);
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

// Rota de healthcheck básico
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rota de healthcheck do Stripe
app.get('/api/health/stripe', async (_req, res) => {
  try {
    const { checkStripeHealth } = require('./controllers/stripeController');
    await checkStripeHealth(_req, res);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Erro ao verificar saúde do Stripe',
    });
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
  
  // Executar limpeza diariamente às 2h da manhã
  cron.schedule('0 2 * * *', async () => {
    console.log('🕐 Executando limpeza automática de assinaturas pendentes expiradas...');
    await runCleanupJob();
  }, {
    timezone: 'America/Sao_Paulo'
  });
  
  // Executar verificação de expiração diariamente às 9h da manhã
  cron.schedule('0 9 * * *', async () => {
    console.log('🕐 Executando verificação de assinaturas próximas do vencimento...');
    await runExpirationCheckJob();
  }, {
    timezone: 'America/Sao_Paulo'
  });
  
  console.log('✅ Jobs agendados configurados:');
  console.log('   - Limpeza de assinaturas pendentes: diariamente às 2h');
  console.log('   - Verificação de expiração: diariamente às 9h');
}

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 