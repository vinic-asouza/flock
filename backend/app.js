const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');

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

// Rota de healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Handler de erros
app.use((err, req, res, next) => {
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