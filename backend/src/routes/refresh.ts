import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { refreshToken, checkAuth } from '../controllers/refreshController';

const router = Router();

// Rate limiting para refresh de token
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 tentativas de refresh por IP em 15 minutos
  message: {
    error: 'Muitas tentativas de renovação de token',
    details: 'Você excedeu o limite de tentativas de renovação. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rota para renovar token de acesso
router.post('/refresh', refreshLimiter, refreshToken);

// Rota para verificar estado de autenticação
router.get('/check', checkAuth);

// Rota de teste para verificar cookies
router.get('/test-cookies', (req, res) => {
  res.json({
    cookies: req.cookies,
    headers: req.headers.cookie,
    message: 'Cookies recebidos'
  });
});

// Rota de teste para limpar cookies
router.post('/test-clear-cookies', (req, res) => {
  const { clearAuthCookies } = require('../utils/cookieUtils');
  clearAuthCookies(res);
  res.json({
    message: 'Cookies limpos para teste'
  });
});

export default router;
