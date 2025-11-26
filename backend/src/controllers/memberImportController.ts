import { Response } from 'express';
import { AuthRequest } from '../types';
import supabase from '../services/supabase';
import { validateCSV, importMembers } from '../services/memberImportService';
import { logAudit } from '../utils/auditLogger';

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

    // Busca a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Obtém congregation_id do body (pode ser null para "Sede")
    const congregationId = req.body.congregation_id === 'null' || req.body.congregation_id === '' 
      ? null 
      : req.body.congregation_id || null;

    // Valida se a congregação existe (se fornecida)
    if (congregationId) {
      const { data: congregation, error: congError } = await supabase
        .from('congregations')
        .select('id')
        .eq('id', congregationId)
        .eq('church_id', church.id)
        .single();

      if (congError || !congregation) {
        return res.status(400).json({
          error: 'Congregação inválida',
          details: 'A congregação fornecida não existe ou não pertence a esta igreja'
        });
      }
    }

    // Valida o CSV
    const validationResult = await validateCSV(
      req.file.buffer,
      church.id,
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

    // Busca a igreja do usuário
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (churchError || !church) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: 'Não foi possível encontrar a igreja associada ao usuário'
      });
    }

    // Obtém congregation_id do body (pode ser null para "Sede")
    const congregationId = req.body.congregation_id === 'null' || req.body.congregation_id === '' 
      ? null 
      : req.body.congregation_id || null;

    // Valida se a congregação existe (se fornecida)
    if (congregationId) {
      const { data: congregation, error: congError } = await supabase
        .from('congregations')
        .select('id')
        .eq('id', congregationId)
        .eq('church_id', church.id)
        .single();

      if (congError || !congregation) {
        return res.status(400).json({
          error: 'Congregação inválida',
          details: 'A congregação fornecida não existe ou não pertence a esta igreja'
        });
      }
    }

    // Opções de importação
    const skipDuplicates = req.body.skipDuplicates !== 'false';

    // Importa os membros
    const importResult = await importMembers(
      req.file.buffer,
      church.id,
      congregationId,
      { skipDuplicates }
    );

    // Log de auditoria para a importação
    if (importResult.importedRows > 0) {
      await logAudit(req, {
        entity: 'member',
        entityId: null,
        action: 'import',
        changesAfter: {
          importedRows: importResult.importedRows,
          totalRows: importResult.totalRows,
          congregationId: congregationId || 'Sede'
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

