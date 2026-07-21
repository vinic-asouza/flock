import { Response } from 'express';
import { AuthRequest } from '../types';
import { supabaseAdmin as supabase } from '../services/supabase';
import { validateCSV, importMembers } from '../services/memberImportService';
import { logAudit } from '../utils/auditLogger';
import { checkMemberLimit } from '../utils/planLimits';
import { assertCongregationAccess } from '../utils/congregationScope';

/**
 * Valida um arquivo CSV antes da importação
 * Retorna preview dos dados e lista de erros
 */
export const validateImport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Verifica se há arquivo
    if (!req.file) {
      return res.status(400).json({
        error: 'Arquivo não fornecido',
        details: 'É necessário enviar um arquivo CSV'
      });
    }

    const churchId = req.church!.churchId;

    const congregationIdRaw = req.body.congregation_id;
    if (
      !congregationIdRaw ||
      typeof congregationIdRaw !== 'string' ||
      congregationIdRaw.trim() === '' ||
      congregationIdRaw === 'null' ||
      congregationIdRaw === 'sede'
    ) {
      return res.status(400).json({
        error: 'Congregação obrigatória',
        details: 'Selecione uma congregação válida para importar os membros'
      });
    }

    const congregationId = congregationIdRaw;

    // Valida se a congregação existe
    const { data: congregation, error: congError } = await supabase
      .from('congregations')
      .select('id')
      .eq('id', congregationId)
      .eq('church_id', churchId)
      .single();

    if (congError || !congregation) {
      return res.status(400).json({
        error: 'Congregação inválida',
        details: 'A congregação fornecida não existe ou não pertence a esta igreja'
      });
    }

    const access = assertCongregationAccess(req.church!, congregationId);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    // Valida o CSV
    const validationResult = await validateCSV(
      req.file.buffer,
      churchId,
      congregationId
    );

    res.json(validationResult);

  } catch (error) {
    console.error('Erro ao validar importação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Importa membros do arquivo CSV
 */
export const importMembersFromCSV = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado'
      });
    }

    // Verifica se há arquivo
    if (!req.file) {
      return res.status(400).json({
        error: 'Arquivo não fornecido',
        details: 'É necessário enviar um arquivo CSV'
      });
    }

    const churchId = req.church!.churchId;

    const congregationIdRaw = req.body.congregation_id;
    if (
      !congregationIdRaw ||
      typeof congregationIdRaw !== 'string' ||
      congregationIdRaw.trim() === '' ||
      congregationIdRaw === 'null' ||
      congregationIdRaw === 'sede'
    ) {
      return res.status(400).json({
        error: 'Congregação obrigatória',
        details: 'Selecione uma congregação válida para importar os membros'
      });
    }

    const congregationId = congregationIdRaw;

    // Valida se a congregação existe
    const { data: congregation, error: congError } = await supabase
      .from('congregations')
      .select('id')
      .eq('id', congregationId)
      .eq('church_id', churchId)
      .single();

    if (congError || !congregation) {
      return res.status(400).json({
        error: 'Congregação inválida',
        details: 'A congregação fornecida não existe ou não pertence a esta igreja'
      });
    }

    const importAccess = assertCongregationAccess(req.church!, congregationId);
    if (!importAccess.ok) {
      return res.status(importAccess.status).json(importAccess.body);
    }

    // Opções de importação
    const skipDuplicates = req.body.skipDuplicates !== 'false';

    // Validar CSV primeiro para contar quantos membros válidos serão importados
    const validationResult = await validateCSV(
      req.file.buffer,
      churchId,
      congregationId
    );

    // Contar quantos membros válidos serão importados (considerando duplicatas)
    const validMembersCount = validationResult.validRows;
    
    // Verificar limite de membros ANTES de importar (tudo ou nada)
    const limitCheck = await checkMemberLimit(churchId, validMembersCount);
    if (!limitCheck.canAdd) {
      return res.status(403).json({
        error: 'Limite de membros atingido',
        details: limitCheck.message || `Não é possível importar ${validMembersCount} membros. O limite do plano foi atingido.`,
        currentCount: limitCheck.currentCount,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining,
        requested: validMembersCount,
        planType: limitCheck.planType,
        validationResult, // Incluir resultado da validação para o frontend
      });
    }

    // Importa os membros
    const importResult = await importMembers(
      req.file.buffer,
      churchId,
      congregationId,
      { skipDuplicates }
    );

    // Um log genérico por importação de lista de membros
    if (importResult.importedRows > 0) {
      await logAudit(req, {
        entity: 'church',
        entityId: req.church!.churchId,
        action: 'import',
        changesAfter: {
          list_type: 'members',
          importedRows: importResult.importedRows,
          totalRows: importResult.totalRows,
          congregationId: congregationId || null
        }
      });
    }

    res.status(importResult.success ? 200 : 207).json(importResult); // 207 = Multi-Status

  } catch (error) {
    console.error('Erro ao importar membros:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

