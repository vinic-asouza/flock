import { Router } from 'express';
import { validateRegistrationLink, createMemberViaPublicLink } from '../controllers/publicRegistrationController';
import { validateIntegrationLink, createIntegrationMemberViaPublicLink } from '../controllers/publicIntegrationController';
import publicRegistrationAuth from '../middlewares/publicRegistrationAuth';
import publicIntegrationAuth from '../middlewares/publicIntegrationAuth';

const router = Router();

// Rotas públicas de registro (sem autenticação)
// Validação do link é feita pelo middleware publicRegistrationAuth

// Validar link de registro (GET para verificar se é válido)
router.get('/registration/:token', publicRegistrationAuth, validateRegistrationLink);

// Criar membro via link público
router.post('/registration/:token', publicRegistrationAuth, createMemberViaPublicLink);

// Rotas públicas de integração (sem autenticação)
// Validação do link é feita pelo middleware publicIntegrationAuth

// Validar link de integração (GET para verificar se é válido)
router.get('/integration/:token', publicIntegrationAuth, validateIntegrationLink);

// Criar integrante via link público
router.post('/integration/:token', publicIntegrationAuth, createIntegrationMemberViaPublicLink);

export default router;

