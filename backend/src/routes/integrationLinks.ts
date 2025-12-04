import { Router } from 'express';
import {
  listIntegrationLinks,
  getIntegrationLink,
  createIntegrationLink,
  updateIntegrationLink,
  deleteIntegrationLink
} from '../controllers/integrationLinkController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Todas as rotas de gerenciamento de links requerem autenticação
router.use(authMiddleware);

// Listar todos os links de integração da igreja
router.get('/', listIntegrationLinks);

// Buscar um link específico
router.get('/:id', getIntegrationLink);

// Criar um novo link de integração
router.post('/', createIntegrationLink);

// Atualizar um link existente
router.put('/:id', updateIntegrationLink);

// Desativar um link (soft delete)
router.delete('/:id', deleteIntegrationLink);

export default router;

