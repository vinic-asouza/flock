import { Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthRequest } from '../types';
import { attachChurchContext, hasRoleOrHigher } from '../services/churchContext';

/** Limite para checkout público (sem usuário autenticado). */
export const publicCheckoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'Muitas tentativas de checkout',
    details: 'Aguarde antes de iniciar um novo pagamento.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Limite generoso para webhooks Stripe (evita DoS sem bloquear picos legítimos). */
export const stripeWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Muitas requisições ao webhook' },
  standardHeaders: true,
  legacyHeaders: false,
});

export function rateLimitPublicCheckoutOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user) {
    next();
    return;
  }
  publicCheckoutLimiter(req, res, next);
}

/** Checkout pago autenticado: apenas admin ou owner (S04). */
export async function requireAdminForPaidCheckout(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  if (!req.church) {
    const attached = await attachChurchContext(req, res);
    if (!attached.ok) {
      if (attached.reason === 'selection_required') {
        res.status(403).json({
          error: 'Seleção de igreja obrigatória',
          code: 'CHURCH_SELECTION_REQUIRED',
          memberships: attached.memberships,
        });
        return;
      }
      res.status(403).json({
        error: 'Sem acesso a nenhuma igreja',
        details: 'Sua conta não está vinculada a uma igreja.',
      });
      return;
    }
  }

  if (!hasRoleOrHigher(req.church!.role, 'admin')) {
    res.status(403).json({
      error: 'Permissão insuficiente',
      details: 'Apenas administradores podem iniciar checkout de plano pago.',
    });
    return;
  }

  next();
}
