import { Router } from 'express';
import {
  listRegistrationLinks,
  getRegistrationLink,
  createRegistrationLink,
  updateRegistrationLink,
  deactivateRegistrationLink,
  deleteRegistrationLink
} from '../controllers/registrationLinkController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Todas as rotas de gerenciamento de links requerem autenticação
router.use(authMiddleware);

// Listar todos os links de registro da igreja
router.get('/', listRegistrationLinks);

// Criar um novo link de registro
router.post('/', createRegistrationLink);

// Desativar um link (soft delete) - DEVE VIR ANTES DE /:id
router.patch('/:id/deactivate', deactivateRegistrationLink);

// Buscar um link específico
router.get('/:id', getRegistrationLink);

// Atualizar um link existente
router.put('/:id', updateRegistrationLink);

// Remover permanentemente um link
router.delete('/:id', deleteRegistrationLink);

export default router;

