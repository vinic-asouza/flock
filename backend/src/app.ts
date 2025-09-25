import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import passwordRoutes from './routes/password';
import memberRoutes from './routes/members';
import roleRoutes from './routes/roles';
import congregationRoutes from './routes/congregations';
import refreshRoutes from './routes/refresh';
import churchRoutes from './routes/church';
import accountRoutes from './routes/account';
import authCallbackRoutes from './routes/authCallback';

dotenv.config();

const app = express();

// Configuração de segurança básica
app.use(helmet());

// Configuração do CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true, // Permitir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
});

// Aplicar rate limiting geral
app.use(generalLimiter);

// Parser para JSON
app.use(express.json());

// Parser para cookies
app.use(cookieParser());

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

// Rota de healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Handler de erros
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 