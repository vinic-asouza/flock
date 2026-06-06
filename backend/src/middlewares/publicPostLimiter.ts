import rateLimit from 'express-rate-limit';

export const publicPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de cadastro',
    details: 'Aguarde alguns minutos antes de enviar novamente.',
  },
});
