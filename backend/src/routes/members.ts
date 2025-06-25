import { Router } from 'express';
import { listMembers, getMember, createMember, updateMember, deleteMember, createBatchMembers, getMemberReports } from '../controllers/memberController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Todas as rotas de membros requerem autenticação
router.use(authMiddleware);

// Listar todos os membros (com paginação e filtros avançados)
router.get('/', listMembers);

// Gerar relatórios de membros
router.get('/reports', getMemberReports);

// Buscar um membro específico
router.get('/:id', getMember);

// Criar um novo membro
router.post('/', createMember);

// Criar múltiplos membros
router.post('/batch', createBatchMembers);

// Atualizar um membro
router.put('/:id', updateMember);

// Remover um membro (soft delete)
router.delete('/:id', deleteMember);

export default router; 