import { Router } from 'express';
import { listMembers, getMember, createMember, updateMember, deleteMember } from '../controllers/memberController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// Todas as rotas de membros requerem autenticação
router.use(authMiddleware);

// Listar todos os membros
router.get('/', listMembers);

// Buscar um membro específico
router.get('/:id', getMember);

// Criar um novo membro
router.post('/', createMember);

// Atualizar um membro
router.put('/:id', updateMember);

// Remover um membro (soft delete)
router.delete('/:id', deleteMember);

export default router; 