import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { AuthRequest } from '../types';
import {
  createTeachingClassSchema,
  replaceTeachingTeachersSchema,
  updateTeachingClassSchema,
} from '../validators/teachingValidator';
import { logAudit } from '../utils/auditLogger';
import {
  applyScopedCongregationFilter,
  assertCongregationAccess,
  resolveScopedCongregationFilter,
} from '../utils/congregationScope';
import {
  validateGroupCongregation,
  validateResponsibleAndCongregation,
} from '../utils/groupValidations';
import { error as logError } from '../utils/logger';
import { buildPagination, parsePageLimit } from '../utils/pagination';

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_CLASS_SORT_FIELDS = ['start_date', 'created_at', 'name'] as const;

function toDateOnly(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function parseListIsoDate(raw: unknown): { ok: true; value: string | null } | { ok: false } {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: null };
  const value = String(raw);
  if (!ISO_DATE_ONLY.test(value)) return { ok: false };
  return { ok: true, value };
}

async function validateTeachers(
  teacherIds: string[],
  responsibleId: string,
  churchId: string
): Promise<{ ok: true; uniqueIds: string[] } | { ok: false; message: string }> {
  const uniqueIds = [...new Set(teacherIds.filter(Boolean))];
  if (uniqueIds.includes(responsibleId)) {
    return {
      ok: false,
      message: 'O responsável não pode ser incluído também como professor',
    };
  }
  if (uniqueIds.length === 0) {
    return { ok: true, uniqueIds: [] };
  }

  const { data: members, error } = await supabase
    .from('members')
    .select('id')
    .eq('church_id', churchId)
    .in('id', uniqueIds);

  if (error) {
    logError('Erro ao validar professores:', error);
    return { ok: false, message: 'Não foi possível validar os professores' };
  }

  if (!members || members.length !== uniqueIds.length) {
    return {
      ok: false,
      message: 'Um ou mais professores não foram encontrados nesta igreja',
    };
  }

  return { ok: true, uniqueIds };
}

async function replaceClassTeachers(classId: string, teacherIds: string[]) {
  const { error: deleteError } = await supabase
    .from('teaching_class_teachers')
    .delete()
    .eq('class_id', classId);

  if (deleteError) {
    return { error: deleteError };
  }

  if (teacherIds.length === 0) {
    return { error: null };
  }

  const { error: insertError } = await supabase.from('teaching_class_teachers').insert(
    teacherIds.map((member_id) => ({ class_id: classId, member_id }))
  );

  return { error: insertError };
}

async function loadClassTeachers(classId: string) {
  const { data, error } = await supabase
    .from('teaching_class_teachers')
    .select(
      `
      member_id,
      created_at,
      members (
        id,
        name,
        congregation_id,
        whatsapp,
        phone
      )
    `
    )
    .eq('class_id', classId);

  if (error) {
    return { teachers: [], error };
  }

  return {
    teachers: (data || []).map((row: any) => ({
      id: row.members?.id || row.member_id,
      name: row.members?.name || '',
      congregation_id: row.members?.congregation_id || null,
    })),
    error: null,
  };
}

const classSelect = `
  *,
  congregations (
    id,
    name,
    abbreviation
  ),
  teaching_programs (
    id,
    name,
    congregation_id
  ),
  members!teaching_classes_responsible_id_fkey (
    id,
    name,
    congregation_id,
    whatsapp,
    phone
  )
`;

export const listTeachingClasses = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const congregation_id = (req.query.congregation_id as string) || '';
    const program_id = (req.query.program_id as string) || '';
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';
    const start_date_from = parseListIsoDate(req.query.start_date_from);
    const start_date_to = parseListIsoDate(req.query.start_date_to);
    if (!start_date_from.ok || !start_date_to.ok) {
      return res.status(400).json({
        error: 'Filtro inválido',
        details: 'As datas de início devem estar no formato YYYY-MM-DD',
      });
    }
    if (
      start_date_from.value &&
      start_date_to.value &&
      start_date_to.value < start_date_from.value
    ) {
      return res.status(400).json({
        error: 'Filtro inválido',
        details: 'A data final do filtro deve ser igual ou posterior à data inicial',
      });
    }

    const { page, limit, offset } = parsePageLimit(req.query);
    const sort_by_raw = (req.query.sort_by as string) || 'start_date';
    const sort_by = ALLOWED_CLASS_SORT_FIELDS.includes(
      sort_by_raw as (typeof ALLOWED_CLASS_SORT_FIELDS)[number]
    )
      ? sort_by_raw
      : 'start_date';
    const defaultOrder = sort_by === 'name' ? 'asc' : 'desc';
    const sort_order_raw = (req.query.sort_order as string) || defaultOrder;
    const sort_order = sort_order_raw === 'asc' ? 'asc' : 'desc';

    const scoped = resolveScopedCongregationFilter(req.church!, congregation_id, {
      includeNullAsChurchWide: false,
    });
    if (!scoped.ok) {
      return res.status(scoped.status).json({
        error: 'Filtro inválido',
        details: scoped.message,
      });
    }

    let query = supabase
      .from('teaching_classes')
      .select(classSelect, { count: 'exact' })
      .eq('church_id', churchId);

    query = applyScopedCongregationFilter(query, 'congregation_id', scoped);

    if (program_id) {
      query = query.eq('program_id', program_id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }
    if (start_date_from.value) {
      query = query.gte('start_date', start_date_from.value);
    }
    if (start_date_to.value) {
      query = query.lte('start_date', start_date_to.value);
    }

    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: classes, error, count } = await query;
    if (error) {
      return res.status(400).json({
        error: 'Erro ao buscar turmas',
        details: error.message,
      });
    }

    const total = count || 0;
    const pagination = buildPagination(page, limit, total);

    if (!classes || classes.length === 0) {
      return res.json({ data: [], pagination });
    }

    const classIds = classes.map((c: any) => c.id);
    const { data: teacherRows, error: teachersError } = await supabase
      .from('teaching_class_teachers')
      .select('class_id, member_id')
      .in('class_id', classIds);

    if (teachersError) {
      logError('Erro ao carregar professores das turmas:', teachersError);
      return res.status(500).json({
        error: 'Erro ao carregar turmas',
        details: 'Não foi possível carregar os professores das turmas',
      });
    }

    const teachersByClass = (teacherRows || []).reduce(
      (acc: Record<string, string[]>, row: { class_id: string; member_id: string }) => {
        if (!acc[row.class_id]) acc[row.class_id] = [];
        acc[row.class_id].push(row.member_id);
        return acc;
      },
      {}
    );

    const result = classes.map((cls: any) => {
      const { members: responsible, teaching_programs: program, ...rest } = cls;
      return {
        ...rest,
        program: program || null,
        responsible: responsible || null,
        teacher_ids: teachersByClass[cls.id] || [],
      };
    });

    return res.json({ data: result, pagination });
  } catch (err) {
    logError('Erro ao listar turmas de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao carregar turmas',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const getTeachingClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { id } = req.params;

    const { data: cls, error } = await supabase
      .from('teaching_classes')
      .select(classSelect)
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (error || !cls) {
      return res.status(404).json({
        error: 'Turma não encontrada',
        details: 'Não foi possível encontrar a turma solicitada',
      });
    }

    const access = assertCongregationAccess(req.church!, cls.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const { teachers, error: teachersError } = await loadClassTeachers(id);
    if (teachersError) {
      return res.status(500).json({
        error: 'Erro ao carregar professores',
        details: teachersError.message,
      });
    }

    const { members: responsible, teaching_programs: program, ...rest } = cls as any;

    return res.json({
      ...rest,
      program: program || null,
      responsible: responsible || null,
      teachers,
      teacher_ids: teachers.map((t: any) => t.id),
    });
  } catch (err) {
    logError('Erro ao buscar turma de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao carregar turma',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const createTeachingClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = createTeachingClassSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const churchId = req.church!.churchId;

    const { data: program, error: programError } = await supabase
      .from('teaching_programs')
      .select('id, church_id, congregation_id')
      .eq('id', value.program_id)
      .eq('church_id', churchId)
      .single();

    if (programError || !program) {
      return res.status(400).json({
        error: 'Programa inválido',
        details: 'O programa não foi encontrado nesta igreja',
      });
    }

    if (program.congregation_id && program.congregation_id !== value.congregation_id) {
      return res.status(400).json({
        error: 'Congregação inconsistente',
        details:
          'A congregação da turma deve ser a mesma do programa quando o programa tem escopo de uma congregação',
      });
    }

    const congregationValidation = await validateGroupCongregation(
      value.congregation_id,
      churchId
    );
    if (!congregationValidation.isValid) {
      return res.status(400).json({
        error: 'Congregação inválida',
        details: congregationValidation.errorMessage,
      });
    }

    const congregationAccess = assertCongregationAccess(req.church!, value.congregation_id);
    if (!congregationAccess.ok) {
      return res.status(congregationAccess.status).json(congregationAccess.body);
    }

    const responsibleValidation = await validateResponsibleAndCongregation(
      value.responsible_id,
      value.congregation_id,
      churchId
    );
    if (!responsibleValidation.isValid) {
      return res.status(400).json({
        error: 'Responsável inválido',
        details: responsibleValidation.errorMessage,
      });
    }

    const teachersValidation = await validateTeachers(
      value.teacher_ids || [],
      value.responsible_id,
      churchId
    );
    if (!teachersValidation.ok) {
      return res.status(400).json({
        error: 'Professores inválidos',
        details: teachersValidation.message,
      });
    }

    const { data: cls, error: createError } = await supabase
      .from('teaching_classes')
      .insert([
        {
          church_id: churchId,
          program_id: value.program_id,
          congregation_id: value.congregation_id,
          name: value.name.trim(),
          location: emptyToNull(value.location),
          schedule: emptyToNull(value.schedule),
          start_date: value.start_date,
          end_date: emptyToNull(value.end_date),
          status: value.status || 'draft',
          responsible_id: value.responsible_id,
        },
      ])
      .select()
      .single();

    if (createError || !cls) {
      return res.status(400).json({
        error: 'Erro ao criar turma',
        details: createError?.message || 'Não foi possível criar a turma',
      });
    }

    const { error: teachersError } = await replaceClassTeachers(
      cls.id,
      teachersValidation.uniqueIds
    );
    if (teachersError) {
      await supabase.from('teaching_classes').delete().eq('id', cls.id);
      return res.status(400).json({
        error: 'Erro ao associar professores',
        details: teachersError.message,
      });
    }

    await logAudit(req, {
      entity: 'teaching_class',
      entityId: cls.id,
      action: 'create',
      changesAfter: { ...cls, teacher_ids: teachersValidation.uniqueIds },
    });

    return res.status(201).json({
      ...cls,
      teacher_ids: teachersValidation.uniqueIds,
    });
  } catch (err) {
    logError('Erro ao criar turma de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao cadastrar turma',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const updateTeachingClass = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = updateTeachingClassSchema.validate(req.body, {
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
      .from('teaching_classes')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        error: 'Turma não encontrada',
        details: 'Não foi possível encontrar a turma solicitada',
      });
    }

    const existingAccess = assertCongregationAccess(req.church!, existing.congregation_id);
    if (!existingAccess.ok) {
      return res.status(existingAccess.status).json(existingAccess.body);
    }

    const nextProgramId = value.program_id || existing.program_id;
    const nextCongregationId = value.congregation_id || existing.congregation_id;
    const nextResponsibleId = value.responsible_id || existing.responsible_id;

    const { data: program, error: programError } = await supabase
      .from('teaching_programs')
      .select('id, church_id, congregation_id')
      .eq('id', nextProgramId)
      .eq('church_id', churchId)
      .single();

    if (programError || !program) {
      return res.status(400).json({
        error: 'Programa inválido',
        details: 'O programa não foi encontrado nesta igreja',
      });
    }

    if (program.congregation_id && program.congregation_id !== nextCongregationId) {
      return res.status(400).json({
        error: 'Congregação inconsistente',
        details:
          'A congregação da turma deve ser a mesma do programa quando o programa tem escopo de uma congregação',
      });
    }

    if (value.congregation_id) {
      const congregationValidation = await validateGroupCongregation(
        nextCongregationId,
        churchId
      );
      if (!congregationValidation.isValid) {
        return res.status(400).json({
          error: 'Congregação inválida',
          details: congregationValidation.errorMessage,
        });
      }
      const access = assertCongregationAccess(req.church!, nextCongregationId);
      if (!access.ok) {
        return res.status(access.status).json(access.body);
      }
    }

    if (value.responsible_id || value.congregation_id) {
      const responsibleValidation = await validateResponsibleAndCongregation(
        nextResponsibleId,
        nextCongregationId,
        churchId
      );
      if (!responsibleValidation.isValid) {
        return res.status(400).json({
          error: 'Responsável inválido',
          details: responsibleValidation.errorMessage,
        });
      }
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (value.program_id !== undefined) updates.program_id = value.program_id;
    if (value.congregation_id !== undefined) updates.congregation_id = value.congregation_id;
    if (value.name !== undefined) updates.name = value.name.trim();
    if (value.location !== undefined) updates.location = emptyToNull(value.location);
    if (value.schedule !== undefined) updates.schedule = emptyToNull(value.schedule);
    if (value.start_date !== undefined) updates.start_date = value.start_date;
    if (value.end_date !== undefined) updates.end_date = emptyToNull(value.end_date);
    if (value.status !== undefined) updates.status = value.status;
    if (value.responsible_id !== undefined) updates.responsible_id = value.responsible_id;

    const nextStartDate =
      value.start_date !== undefined ? value.start_date : toDateOnly(existing.start_date);
    const nextEndDate =
      value.end_date !== undefined ? emptyToNull(value.end_date) : toDateOnly(existing.end_date);
    if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
      return res.status(400).json({
        error: 'Período inválido',
        details: 'A data de término deve ser igual ou posterior à data de início',
      });
    }

    // Se o responsável mudou, garantir que não esteja na lista de professores
    if (value.responsible_id && value.responsible_id !== existing.responsible_id) {
      await supabase
        .from('teaching_class_teachers')
        .delete()
        .eq('class_id', id)
        .eq('member_id', value.responsible_id);
    }

    const { data: cls, error: updateError } = await supabase
      .from('teaching_classes')
      .update(updates)
      .eq('id', id)
      .eq('church_id', churchId)
      .select()
      .single();

    if (updateError || !cls) {
      return res.status(400).json({
        error: 'Erro ao atualizar turma',
        details: updateError?.message || 'Não foi possível atualizar a turma',
      });
    }

    let teacherIds: string[] | undefined;
    if (value.teacher_ids !== undefined) {
      const teachersValidation = await validateTeachers(
        value.teacher_ids || [],
        cls.responsible_id,
        churchId
      );
      if (!teachersValidation.ok) {
        return res.status(400).json({
          error: 'Professores inválidos',
          details: teachersValidation.message,
        });
      }
      const { error: teachersError } = await replaceClassTeachers(
        id,
        teachersValidation.uniqueIds
      );
      if (teachersError) {
        return res.status(400).json({
          error: 'Erro ao atualizar professores',
          details: teachersError.message,
        });
      }
      teacherIds = teachersValidation.uniqueIds;
    }

    await logAudit(req, {
      entity: 'teaching_class',
      entityId: cls.id,
      action: 'update',
      changesBefore: existing,
      changesAfter: cls,
    });

    if (teacherIds) {
      return res.json({ ...cls, teacher_ids: teacherIds });
    }
    return res.json(cls);
  } catch (err) {
    logError('Erro ao atualizar turma de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao atualizar turma',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const deleteTeachingClass = async (req: AuthRequest, res: Response) => {
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
      .from('teaching_classes')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        error: 'Turma não encontrada',
        details: 'Não foi possível encontrar a turma solicitada',
      });
    }

    const access = assertCongregationAccess(req.church!, existing.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const { error: deleteError } = await supabase
      .from('teaching_classes')
      .delete()
      .eq('id', id)
      .eq('church_id', churchId);

    if (deleteError) {
      return res.status(400).json({
        error: 'Erro ao excluir turma',
        details: deleteError.message,
      });
    }

    await logAudit(req, {
      entity: 'teaching_class',
      entityId: id,
      action: 'delete',
      changesBefore: existing,
    });

    return res.status(204).send();
  } catch (err) {
    logError('Erro ao excluir turma de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao excluir turma',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const replaceTeachingClassTeachers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = replaceTeachingTeachersSchema.validate(req.body, {
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

    const { data: cls, error: classError } = await supabase
      .from('teaching_classes')
      .select('*')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (classError || !cls) {
      return res.status(404).json({
        error: 'Turma não encontrada',
        details: 'Não foi possível encontrar a turma solicitada',
      });
    }

    const access = assertCongregationAccess(req.church!, cls.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const teachersValidation = await validateTeachers(
      value.teacher_ids || [],
      cls.responsible_id,
      churchId
    );
    if (!teachersValidation.ok) {
      return res.status(400).json({
        error: 'Professores inválidos',
        details: teachersValidation.message,
      });
    }

    const { error: teachersError } = await replaceClassTeachers(
      id,
      teachersValidation.uniqueIds
    );
    if (teachersError) {
      return res.status(400).json({
        error: 'Erro ao atualizar professores',
        details: teachersError.message,
      });
    }

    const { teachers } = await loadClassTeachers(id);

    await logAudit(req, {
      entity: 'teaching_class_teachers',
      entityId: id,
      action: 'update',
      changesAfter: { teacher_ids: teachersValidation.uniqueIds },
    });

    return res.json({
      class_id: id,
      teacher_ids: teachersValidation.uniqueIds,
      teachers,
    });
  } catch (err) {
    logError('Erro ao atualizar professores da turma:', err);
    return res.status(500).json({
      error: 'Erro ao atualizar professores',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};
