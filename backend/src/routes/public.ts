import { Router } from 'express';
import { validateRegistrationLink, createMemberViaPublicLink } from '../controllers/publicRegistrationController';
import publicRegistrationAuth from '../middlewares/publicRegistrationAuth';

const router = Router();

// Rotas públicas de registro (sem autenticação)
// Validação do link é feita pelo middleware publicRegistrationAuth

// Validar link de registro (GET para verificar se é válido)
router.get('/registration/:token', publicRegistrationAuth, validateRegistrationLink);

// Criar membro via link público
router.post('/registration/:token', publicRegistrationAuth, createMemberViaPublicLink);

export default router;

