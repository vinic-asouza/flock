import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { AuthRequest } from '../types';
import {
  createTeachingProgramSchema,
  updateTeachingProgramSchema,
} from '../validators/teachingValidator';
import { logAudit } from '../utils/auditLogger';
import {
  assertCongregationAccess,
  resolveScopedCongregationFilter,
} from '../utils/congregationScope';
import { validateGroupCongregation } from '../utils/groupValidations';
import { error as logError } from '../utils/logger';

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

/**
 * Lista programas da igreja (filtro: congregação específica inclui programas "todas").
 */
export const listTeachingPrograms = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const congregation_id = (req.query.congregation_id as string) || '';

    const scoped = resolveScopedCongregationFilter(req.church!, congregation_id, {
      includeNullAsChurchWide: true,
    });
    if (!scoped.ok) {
      return res.status(scoped.status).json({
        error: 'Filtro inválido',
        details: scoped.message,
      });
    }

    let query = supabase
      .from('teaching_programs')
      .select(
        `
        *,
        congregations (
          id,
          name,
          abbreviation
        )
      `
      )
      .eq('church_id', churchId)
      .order('name', { ascending: true });

    if (scoped.mode === 'single') {
      query = query.or(
        `congregation_id.is.null,congregation_id.eq.${scoped.congregationId}`
      );
    } else if (scoped.mode === 'in') {
      const ids = scoped.congregationIds.join(',');
      query = query.or(`congregation_id.is.null,congregation_id.in.(${ids})`);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(400).json({
        error: 'Erro ao buscar programas',
        details: error.message,
      });
    }

    return res.json(data || []);
  } catch (err) {
    logError('Erro ao listar programas de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao carregar programas',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const getTeachingProgram = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { id } = req.params;

    const { data: program, error } = await supabase
      .from('teaching_programs')
      .select(
        `
        *,
        congregations (
          id,
          name,
          abbreviation
        )
      `
      )
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (error || !program) {
      return res.status(404).json({
        error: 'Programa não encontrado',
        details: 'Não foi possível encontrar o programa solicitado',
      });
    }

    const access = assertCongregationAccess(req.church!, program.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    return res.json(program);
  } catch (err) {
    logError('Erro ao buscar programa de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao carregar programa',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const createTeachingProgram = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = createTeachingProgramSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const churchId = req.church!.churchId;
    const congregationId = emptyToNull(value.congregation_id);

    if (congregationId) {
      const congregationValidation = await validateGroupCongregation(congregationId, churchId);
      if (!congregationValidation.isValid) {
        return res.status(400).json({
          error: 'Congregação inválida',
          details: congregationValidation.errorMessage,
        });
      }

      const access = assertCongregationAccess(req.church!, congregationId);
      if (!access.ok) {
        return res.status(access.status).json(access.body);
      }
    }

    const { data: program, error: createError } = await supabase
      .from('teaching_programs')
      .insert([
        {
          church_id: churchId,
          name: value.name.trim(),
          description: emptyToNull(value.description),
          congregation_id: congregationId,
        },
      ])
      .select()
      .single();

    if (createError || !program) {
      return res.status(400).json({
        error: 'Erro ao criar programa',
        details: createError?.message || 'Não foi possível criar o programa',
      });
    }

    await logAudit(req, {
      entity: 'teaching_program',
      entityId: program.id,
      action: 'create',
      changesAfter: program,
    });

    return res.status(201).json(program);
  } catch (err) {
    logError('Erro ao criar programa de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao cadastrar programa',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const updateTeachingProgram = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = updateTeachingProgramSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const churchId = req.church!.churchId;
    const { id } = req.params;

    const { data: existing, error: existingError } = await supabase
      .from('teaching_programs')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        error: 'Programa não encontrado',
        details: 'Não foi possível encontrar o programa solicitado',
      });
    }

    const existingAccess = assertCongregationAccess(req.church!, existing.congregation_id);
    if (!existingAccess.ok) {
      return res.status(existingAccess.status).json(existingAccess.body);
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (value.name !== undefined) updates.name = value.name.trim();
    if (value.description !== undefined) updates.description = emptyToNull(value.description);

    if (value.congregation_id !== undefined) {
      const congregationId = emptyToNull(value.congregation_id);
      if (congregationId) {
        const congregationValidation = await validateGroupCongregation(congregationId, churchId);
        if (!congregationValidation.isValid) {
          return res.status(400).json({
            error: 'Congregação inválida',
            details: congregationValidation.errorMessage,
          });
        }
        const access = assertCongregationAccess(req.church!, congregationId);
        if (!access.ok) {
          return res.status(access.status).json(access.body);
        }
      }
      updates.congregation_id = congregationId;
    }

    const { data: program, error: updateError } = await supabase
      .from('teaching_programs')
      .update(updates)
      .eq('id', id)
      .eq('church_id', churchId)
      .select()
      .single();

    if (updateError || !program) {
      return res.status(400).json({
        error: 'Erro ao atualizar programa',
        details: updateError?.message || 'Não foi possível atualizar o programa',
      });
    }

    await logAudit(req, {
      entity: 'teaching_program',
      entityId: program.id,
      action: 'update',
      changesBefore: existing,
      changesAfter: program,
    });

    return res.json(program);
  } catch (err) {
    logError('Erro ao atualizar programa de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao atualizar programa',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const deleteTeachingProgram = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { id } = req.params;

    const { data: existing, error: existingError } = await supabase
      .from('teaching_programs')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        error: 'Programa não encontrado',
        details: 'Não foi possível encontrar o programa solicitado',
      });
    }

    const access = assertCongregationAccess(req.church!, existing.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const { error: deleteError } = await supabase
      .from('teaching_programs')
      .delete()
      .eq('id', id)
      .eq('church_id', churchId);

    if (deleteError) {
      return res.status(400).json({
        error: 'Erro ao excluir programa',
        details: deleteError.message,
      });
    }

    await logAudit(req, {
      entity: 'teaching_program',
      entityId: id,
      action: 'delete',
      changesBefore: existing,
    });

    return res.status(204).send();
  } catch (err) {
    logError('Erro ao excluir programa de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao excluir programa',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};
