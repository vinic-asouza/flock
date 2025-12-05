import { Router } from 'express';
import {
  listIntegrationLinks,
  getIntegrationLink,
  createIntegrationLink,
  updateIntegrationLink,
  deactivateIntegrationLink,
  deleteIntegrationLink
} from '../controllers/integrationLinkController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Todas as rotas de gerenciamento de links requerem autenticação
router.use(authMiddleware);

// Listar todos os links de integração da igreja
router.get('/', listIntegrationLinks);

// Criar um novo link de integração
router.post('/', createIntegrationLink);

// Desativar um link (soft delete) - DEVE VIR ANTES DE /:id
router.patch('/:id/deactivate', deactivateIntegrationLink);

// Buscar um link específico
router.get('/:id', getIntegrationLink);

// Atualizar um link existente
router.put('/:id', updateIntegrationLink);

// Remover permanentemente um link
router.delete('/:id', deleteIntegrationLink);

export default router;

