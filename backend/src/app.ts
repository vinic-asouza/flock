import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import passwordRoutes from './routes/password';
import memberRoutes from './routes/members';
import roleRoutes from './routes/roles';

dotenv.config();

const app = express();

// Configuração de segurança básica
app.use(helmet());

// Configuração do CORS
app.use(cors());

// Logging
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por windowMs
});
app.use(limiter);

// Parser para JSON
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/roles', roleRoutes);

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