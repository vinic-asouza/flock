import { Router } from 'express';
import {
  listRegistrationLinks,
  getRegistrationLink,
  createRegistrationLink,
  updateRegistrationLink,
  deleteRegistrationLink
} from '../controllers/registrationLinkController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Todas as rotas de gerenciamento de links requerem autenticação
router.use(authMiddleware);

// Listar todos os links de registro da igreja
router.get('/', listRegistrationLinks);

// Buscar um link específico
router.get('/:id', getRegistrationLink);

// Criar um novo link de registro
router.post('/', createRegistrationLink);

// Atualizar um link existente
router.put('/:id', updateRegistrationLink);

// Desativar um link (soft delete)
router.delete('/:id', deleteRegistrationLink);

export default router;

