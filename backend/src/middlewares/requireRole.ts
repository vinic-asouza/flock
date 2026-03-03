import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { ChurchUserRole } from '../types';
import { hasRoleOrHigher } from '../services/churchContext';

/**
 * Middleware que exige um papel mínimo na igreja (owner > admin > editor > reader).
 * Deve ser usado após authMiddleware (req.church já preenchido).
 */
export function requireRole(minRole: ChurchUserRole) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.church) {
      return res.status(403).json({
        error: 'Acesso negado',
        details: 'Você não tem vínculo com uma igreja.'
      });
    }
    if (!hasRoleOrHigher(req.church.role, minRole)) {
      return res.status(403).json({
        error: 'Permissão insuficiente',
        details: `Esta ação exige o papel "${minRole}" ou superior.`
      });
    }
    next();
  };
}
