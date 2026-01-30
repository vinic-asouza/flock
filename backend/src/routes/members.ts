import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { listMembers, getMember, createMember, updateMember, deleteMember, createBatchMembers, getMemberReports, getBirthdaysCount, getBirthdaysList } from '../controllers/memberController';
import { validateImport, importMembersFromCSV } from '../controllers/memberImportController';
import authMiddleware from '../middlewares/auth';
import { uploadCSV } from '../middlewares/upload';

const router = Router();

// Todas as rotas de membros requerem autenticação
router.use(authMiddleware);

// Rate limiting específico para relatórios (operação pesada)
const reportsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // 10 requisições por IP em 1 minuto
  message: {
    error: 'Muitas requisições de relatórios',
    details: 'Você excedeu o limite de requisições de relatórios. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Contar todas as requisições
});

// Listar todos os membros (com paginação e filtros avançados)
router.get('/', listMembers);

// Gerar relatórios de membros (com rate limiting específico)
router.get('/reports', reportsLimiter, getMemberReports);

// Buscar contagem de aniversariantes do mês
router.get('/birthdays/count', getBirthdaysCount);

// Buscar lista de aniversariantes do mês
router.get('/birthdays/list', getBirthdaysList);

// Validar arquivo CSV antes da importação
router.post('/import/validate', uploadCSV.single('file'), validateImport);

// Importar membros do CSV
router.post('/import', uploadCSV.single('file'), importMembersFromCSV);

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