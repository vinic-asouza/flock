import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { attendanceRemovedAtOrFilter } from '../services/teachingAttendanceEligibility';
import {
  TeachingRecurrenceError,
  expandTeachingRecurrence,
} from '../services/teachingLessonRecurrenceService';
import { AuthRequest } from '../types';
import {
  createTeachingLessonSchema,
  saveTeachingAttendanceSchema,
  teachingLessonDeleteQuerySchema,
  teachingLessonSeriesSchema,
  updateTeachingLessonSchema,
} from '../validators/teachingValidator';
import { logAudit } from '../utils/auditLogger';
import { assertCongregationAccess } from '../utils/congregationScope';
import { error as logError } from '../utils/logger';
import { buildPagination, parsePageLimit } from '../utils/pagination';
import { buildIlikeContainsOrFilter } from '../utils/postgrestFilter';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function emptyToNull(value: unknown): string | null {
  return value === undefined || value === null || value === '' ? null : String(value);
}

function recurrenceRule(value: any) {
  return {
    type: value.recurrence_type,
    startsOn: value.starts_on,
    endsOn: value.ends_on,
    weekdays: value.weekdays,
    dayOfMonth: value.day_of_month,
    intervalDays: value.interval_days,
  };
}

function recurrenceRpcParams(value: any, dates: string[]) {
  return {
    p_title: value.title.trim(),
    p_description: emptyToNull(value.description),
    p_start_time: value.start_time,
    p_starts_on: value.starts_on,
    p_ends_on: value.ends_on,
    p_recurrence_type: value.recurrence_type,
    p_weekdays: value.weekdays || null,
    p_day_of_month: value.day_of_month || null,
    p_interval_days: value.interval_days || null,
    p_occurrences: dates,
  };
}

async function loadClass(classId: string, churchId: string) {
  return supabase
    .from('teaching_classes')
    .select('id, church_id, congregation_id, name')
    .eq('id', classId)
    .eq('church_id', churchId)
    .single();
}

async function loadLesson(lessonId: string, churchId: string) {
  return supabase
    .from('teaching_lessons')
    .select(
      `
      *,
      teaching_classes!inner (
        id,
        church_id,
        congregation_id
      ),
      teaching_lesson_series (*)
    `
    )
    .eq('id', lessonId)
    .eq('church_id', churchId)
    .single();
}

function checkAccess(req: AuthRequest, congregationId: string | null | undefined, res: Response) {
  const access = assertCongregationAccess(req.church!, congregationId);
  if (!access.ok) {
    res.status(access.status).json(access.body);
    return false;
  }
  return true;
}

function recurrenceFailure(res: Response, err: unknown) {
  if (err instanceof TeachingRecurrenceError) {
    return res.status(400).json({ error: 'Recorrência inválida', details: err.message });
  }
  throw err;
}

async function findScheduleConflicts(
  churchId: string,
  classId: string,
  dates: string[],
  startTime: string
) {
  const { data, error } = await supabase
    .from('teaching_lessons')
    .select('id, lesson_date, start_time, title, series_id, occurrence_key')
    .eq('church_id', churchId)
    .eq('class_id', classId)
    .eq('start_time', startTime)
    .in('lesson_date', dates);
  return { conflicts: data || [], error };
}

export const listTeachingLessons = async (req: AuthRequest, res: Response) => {
  try {
    const churchId = req.church!.churchId;
    const classId = req.params.id;
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    if (!DATE_ONLY.test(from) || !DATE_ONLY.test(to) || to < from) {
      return res.status(400).json({
        error: 'Período inválido',
        details: 'Informe from e to no formato YYYY-MM-DD, com data final válida',
      });
    }
    const rangeDays = Math.floor(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000
    );
    if (!Number.isFinite(rangeDays) || rangeDays > 366) {
      return res.status(400).json({
        error: 'Período inválido',
        details: 'A consulta não pode abranger mais de 366 dias',
      });
    }

    const { data: cls, error: classError } = await loadClass(classId, churchId);
    if (classError || !cls) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }
    if (!checkAccess(req, cls.congregation_id, res)) return;

    const { data, error } = await supabase
      .from('teaching_lessons')
      .select('*, teaching_lesson_series(*)')
      .eq('church_id', churchId)
      .eq('class_id', classId)
      .gte('lesson_date', from)
      .lte('lesson_date', to)
      .order('lesson_date', { ascending: true })
      .order('start_time', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      return res.status(400).json({ error: 'Erro ao buscar aulas', details: error.message });
    }
    return res.json({ data: data || [], period: { from, to } });
  } catch (err) {
    logError('Erro ao listar aulas de ensino:', err);
    return res.status(500).json({ error: 'Erro ao carregar aulas' });
  }
};

export const createTeachingLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = createTeachingLessonSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }
    const churchId = req.church!.churchId;
    const classId = req.params.id;
    const { data: cls, error: classError } = await loadClass(classId, churchId);
    if (classError || !cls) return res.status(404).json({ error: 'Turma não encontrada' });
    if (!checkAccess(req, cls.congregation_id, res)) return;

    const { conflicts, error: conflictError } = await findScheduleConflicts(
      churchId,
      classId,
      [value.lesson_date],
      value.start_time
    );
    if (conflictError) {
      return res.status(400).json({
        error: 'Erro ao validar conflito',
        details: conflictError.message,
      });
    }
    if (conflicts.length) {
      return res.status(409).json({
        error: 'Conflito de aula',
        details: 'Já existe uma aula nesta turma na mesma data e horário',
        conflicts,
      });
    }

    const { data, error } = await supabase
      .from('teaching_lessons')
      .insert({
        church_id: churchId,
        class_id: classId,
        title: value.title.trim(),
        description: emptyToNull(value.description),
        lesson_date: value.lesson_date,
        start_time: value.start_time,
      })
      .select()
      .single();
    if (error || !data) {
      const conflict = error?.code === '23505';
      return res.status(conflict ? 409 : 400).json({
        error: conflict ? 'Conflito de aula' : 'Erro ao criar aula',
        details: conflict
          ? 'Já existe uma aula nesta turma na mesma data e horário'
          : error?.message || 'Não foi possível criar a aula',
      });
    }

    await logAudit(req, {
      entity: 'teaching_lesson',
      entityId: data.id,
      action: 'create',
      changesAfter: {
        class_id: classId,
        lesson_date: data.lesson_date,
        start_time: data.start_time,
      },
    });
    return res.status(201).json(data);
  } catch (err) {
    logError('Erro ao criar aula de ensino:', err);
    return res.status(500).json({ error: 'Erro ao criar aula' });
  }
};

export const previewTeachingLessonSeries = async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = teachingLessonSeriesSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }
    const churchId = req.church!.churchId;
    const classId = req.params.id;
    const { data: cls, error: classError } = await loadClass(classId, churchId);
    if (classError || !cls) return res.status(404).json({ error: 'Turma não encontrada' });
    if (!checkAccess(req, cls.congregation_id, res)) return;

    let expansion;
    try {
      expansion = expandTeachingRecurrence(recurrenceRule(value));
    } catch (err) {
      return recurrenceFailure(res, err);
    }
    const { conflicts, error } = await findScheduleConflicts(
      churchId,
      classId,
      expansion.dates,
      value.start_time
    );
    if (error) {
      return res.status(400).json({ error: 'Erro ao gerar prévia', details: error.message });
    }
    return res.json({
      count: expansion.dates.length,
      first_date: expansion.dates[0],
      last_date: expansion.dates[expansion.dates.length - 1],
      dates: expansion.dates,
      skipped_months: expansion.skippedMonths,
      conflicts,
    });
  } catch (err) {
    logError('Erro ao gerar prévia de recorrência:', err);
    return res.status(500).json({ error: 'Erro ao gerar prévia' });
  }
};

export const createTeachingLessonSeries = async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = teachingLessonSeriesSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }
    const churchId = req.church!.churchId;
    const classId = req.params.id;
    const { data: cls, error: classError } = await loadClass(classId, churchId);
    if (classError || !cls) return res.status(404).json({ error: 'Turma não encontrada' });
    if (!checkAccess(req, cls.congregation_id, res)) return;

    let expansion;
    try {
      expansion = expandTeachingRecurrence(recurrenceRule(value));
    } catch (err) {
      return recurrenceFailure(res, err);
    }
    const { conflicts, error: conflictError } = await findScheduleConflicts(
      churchId,
      classId,
      expansion.dates,
      value.start_time
    );
    if (conflictError) {
      return res.status(400).json({
        error: 'Erro ao validar conflitos',
        details: conflictError.message,
      });
    }
    if (conflicts.length) {
      return res.status(409).json({
        error: 'Conflitos na recorrência',
        details: 'A série coincide com aulas existentes. Ajuste a regra antes de confirmar.',
        conflicts,
      });
    }

    const { data, error } = await supabase.rpc('create_teaching_lesson_series', {
      p_church_id: churchId,
      p_class_id: classId,
      p_actor_id: req.user!.id,
      ...recurrenceRpcParams(value, expansion.dates),
    });
    if (error || !data) {
      const conflict = error?.code === '23505';
      return res.status(conflict ? 409 : 400).json({
        error: conflict ? 'Conflitos na recorrência' : 'Erro ao criar recorrência',
        details: conflict
          ? 'Uma ocorrência coincide com uma aula criada simultaneamente.'
          : error?.message || 'Não foi possível criar a recorrência',
      });
    }

    const series = Array.isArray(data) ? data[0] : data;
    await logAudit(req, {
      entity: 'teaching_lesson_series',
      entityId: series.id,
      action: 'create',
      changesAfter: {
        class_id: classId,
        recurrence_type: value.recurrence_type,
        occurrence_count: expansion.dates.length,
      },
    });
    return res.status(201).json({
      series,
      occurrence_count: expansion.dates.length,
      skipped_months: expansion.skippedMonths,
    });
  } catch (err) {
    logError('Erro ao criar recorrência de ensino:', err);
    return res.status(500).json({ error: 'Erro ao criar recorrência' });
  }
};

export const updateTeachingLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = updateTeachingLessonSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }
    const churchId = req.church!.churchId;
    const lessonId = req.params.lessonId;
    const { data: lesson, error: lessonError } = await loadLesson(lessonId, churchId);
    if (lessonError || !lesson) return res.status(404).json({ error: 'Aula não encontrada' });
    const classRow = lesson.teaching_classes as any;
    if (!checkAccess(req, classRow?.congregation_id, res)) return;

    if (value.scope === 'single') {
      if (
        value.lesson_date !== undefined &&
        lesson.series_id &&
        value.lesson_date !== lesson.lesson_date
      ) {
        return res.status(400).json({
          error: 'Data não alterável',
          details:
            'Em aulas recorrentes, a data desta ocorrência não pode ser alterada com “Somente esta aula”. Use “Esta e as próximas” ou edite título, horário e descrição.',
        });
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (value.title !== undefined) updates.title = value.title.trim();
      if (value.description !== undefined) updates.description = emptyToNull(value.description);
      if (value.lesson_date !== undefined) updates.lesson_date = value.lesson_date;
      if (value.start_time !== undefined) updates.start_time = value.start_time;

      const nextDate = value.lesson_date || lesson.lesson_date;
      const nextTime = value.start_time || String(lesson.start_time).slice(0, 5);
      const { conflicts } = await findScheduleConflicts(
        churchId,
        lesson.class_id,
        [nextDate],
        nextTime
      );
      const externalConflicts = conflicts.filter((row: any) => row.id !== lessonId);
      if (externalConflicts.length) {
        return res.status(409).json({
          error: 'Conflito de aula',
          details: 'Já existe outra aula nesta data e horário',
          conflicts: externalConflicts,
        });
      }
      const { data, error } = await supabase
        .from('teaching_lessons')
        .update(updates)
        .eq('id', lessonId)
        .eq('church_id', churchId)
        .select()
        .single();
      if (error || !data) {
        const conflict = error?.code === '23505';
        return res.status(conflict ? 409 : 400).json({
          error: conflict ? 'Conflito de aula' : 'Erro ao atualizar aula',
          details: conflict ? 'Já existe outra aula nesta data e horário' : error?.message,
        });
      }
      await logAudit(req, {
        entity: 'teaching_lesson',
        entityId: lessonId,
        action: 'update',
        changesBefore: {
          lesson_date: lesson.lesson_date,
          start_time: lesson.start_time,
          title: lesson.title,
        },
        changesAfter: { lesson_date: data.lesson_date, start_time: data.start_time, title: data.title },
      });
      return res.json(data);
    }

    const series = lesson.teaching_lesson_series as any;
    if (!series || !lesson.occurrence_key) {
      return res.status(400).json({
        error: 'Escopo inválido',
        details: 'Apenas aulas recorrentes aceitam o escopo following',
      });
    }
    const recurrence = value.recurrence || {
      recurrence_type: series.recurrence_type,
      starts_on: lesson.occurrence_key,
      ends_on: series.ends_on,
      weekdays: series.weekdays,
      day_of_month: series.day_of_month,
      interval_days: series.interval_days,
    };
    const merged = {
      title: value.title ?? lesson.title,
      description: value.description !== undefined ? value.description : lesson.description,
      start_time: value.start_time ?? String(lesson.start_time).slice(0, 5),
      ...recurrence,
    };
    let expansion;
    try {
      expansion = expandTeachingRecurrence(recurrenceRule(merged));
    } catch (err) {
      return recurrenceFailure(res, err);
    }
    if (!expansion.dates.includes(lesson.occurrence_key)) {
      return res.status(400).json({
        error: 'Recorrência inválida',
        details: 'A nova regra deve manter a ocorrência selecionada',
      });
    }
    const { conflicts } = await findScheduleConflicts(
      churchId,
      lesson.class_id,
      expansion.dates,
      merged.start_time
    );
    const externalConflicts = conflicts.filter(
      (row: any) =>
        row.series_id !== lesson.series_id ||
        !row.occurrence_key ||
        row.occurrence_key < lesson.occurrence_key
    );
    if (externalConflicts.length) {
      return res.status(409).json({
        error: 'Conflitos na recorrência',
        details: 'A nova regra coincide com aulas fora do segmento editado',
        conflicts: externalConflicts,
      });
    }

    const { data: newSeriesId, error } = await supabase.rpc(
      'replace_teaching_lesson_series_following',
      {
        p_church_id: churchId,
        p_lesson_id: lessonId,
        p_actor_id: req.user!.id,
        ...recurrenceRpcParams(merged, expansion.dates),
      }
    );
    if (error) {
      const attendanceConflict = error.message.includes('attendance_reassociation_required');
      const scheduleConflict = error.code === '23505';
      return res.status(attendanceConflict || scheduleConflict ? 409 : 400).json({
        error: attendanceConflict
          ? 'Presença impede a alteração'
          : scheduleConflict
            ? 'Conflitos na recorrência'
            : 'Erro ao atualizar recorrência',
        details: attendanceConflict
          ? 'A nova regra exigiria apagar ou reassociar presenças. Ajuste essas chamadas primeiro.'
          : scheduleConflict
            ? 'Uma ocorrência coincide com outra aula da turma.'
            : error.message,
      });
    }
    await logAudit(req, {
      entity: 'teaching_lesson_series',
      entityId: String(newSeriesId),
      action: 'update',
      changesAfter: {
        split_from_lesson_id: lessonId,
        occurrence_count: expansion.dates.length,
      },
    });
    return res.json({
      series_id: newSeriesId,
      occurrence_count: expansion.dates.length,
      skipped_months: expansion.skippedMonths,
    });
  } catch (err) {
    logError('Erro ao atualizar aula de ensino:', err);
    return res.status(500).json({ error: 'Erro ao atualizar aula' });
  }
};

export const deleteTeachingLesson = async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = teachingLessonDeleteQuerySchema.validate(req.query);
    if (validationError) {
      return res.status(400).json({
        error: 'Parâmetros inválidos',
        details: validationError.details[0].message,
      });
    }
    const churchId = req.church!.churchId;
    const lessonId = req.params.lessonId;
    const { data: lesson, error: lessonError } = await loadLesson(lessonId, churchId);
    if (lessonError || !lesson) return res.status(404).json({ error: 'Aula não encontrada' });
    const classRow = lesson.teaching_classes as any;
    if (!checkAccess(req, classRow?.congregation_id, res)) return;

    const { data, error } = await supabase.rpc('delete_teaching_lessons_scope', {
      p_church_id: churchId,
      p_lesson_id: lessonId,
      p_scope: value.scope,
      p_confirm_attendance_deletion: value.confirm_attendance_deletion,
    });
    if (error) {
      const attendanceConflict = error.message.includes(
        'attendance_deletion_confirmation_required'
      );
      return res.status(attendanceConflict ? 409 : 400).json({
        error: attendanceConflict ? 'Aula possui presença' : 'Erro ao excluir aula',
        details: attendanceConflict
          ? 'Confirme explicitamente a exclusão das presenças das aulas afetadas.'
          : error.message,
      });
    }
    await logAudit(req, {
      entity: 'teaching_lesson',
      entityId: lessonId,
      action: 'delete',
      changesBefore: {
        scope: value.scope,
        affected_count: data,
        attendance_deletion_confirmed: value.confirm_attendance_deletion,
      },
    });
    return res.status(204).send();
  } catch (err) {
    logError('Erro ao excluir aula de ensino:', err);
    return res.status(500).json({ error: 'Erro ao excluir aula' });
  }
};

export const getTeachingLessonAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const churchId = req.church!.churchId;
    const lessonId = req.params.lessonId;
    const { data: lesson, error: lessonError } = await loadLesson(lessonId, churchId);
    if (lessonError || !lesson) return res.status(404).json({ error: 'Aula não encontrada' });
    const classRow = lesson.teaching_classes as any;
    if (!checkAccess(req, classRow?.congregation_id, res)) return;

    const { page, limit, offset } = parsePageLimit(req.query);
    let eligibleQuery = supabase
      .from('teaching_enrollments')
      .select(
        'id, kind, member_id, display_name_snapshot, attendance_eligible_from, removed_at',
        { count: 'exact' }
      )
      .eq('church_id', churchId)
      .eq('class_id', lesson.class_id)
      .in('kind', ['member', 'guest'])
      .lte('attendance_eligible_from', lesson.lesson_date)
      .or(attendanceRemovedAtOrFilter(lesson.lesson_date));
    const search = buildIlikeContainsOrFilter(
      ['display_name_snapshot'],
      String(req.query.search || '')
    );
    if (search) eligibleQuery = eligibleQuery.or(search);
    const { data: enrollments, error, count } = await eligibleQuery
      .order('display_name_snapshot', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) {
      return res.status(400).json({ error: 'Erro ao carregar chamada', details: error.message });
    }

    const enrollmentIds = (enrollments || []).map((row: any) => row.id);
    let pageAttendance: any[] = [];
    if (enrollmentIds.length) {
      const { data, error: attendanceError } = await supabase
        .from('teaching_lesson_attendance')
        .select('id, enrollment_id, status, updated_at')
        .eq('church_id', churchId)
        .eq('lesson_id', lessonId)
        .in('enrollment_id', enrollmentIds);
      if (attendanceError) {
        return res.status(400).json({
          error: 'Erro ao carregar presença',
          details: attendanceError.message,
        });
      }
      pageAttendance = data || [];
    }
    const { data: allAttendance, error: summaryError } = await supabase
      .from('teaching_lesson_attendance')
      .select('status')
      .eq('church_id', churchId)
      .eq('lesson_id', lessonId);
    if (summaryError) {
      return res.status(400).json({
        error: 'Erro ao resumir chamada',
        details: summaryError.message,
      });
    }
    const { count: eligibleTotal, error: eligibleCountError } = await supabase
      .from('teaching_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', churchId)
      .eq('class_id', lesson.class_id)
      .in('kind', ['member', 'guest'])
      .lte('attendance_eligible_from', lesson.lesson_date)
      .or(attendanceRemovedAtOrFilter(lesson.lesson_date));
    if (eligibleCountError) {
      return res.status(400).json({
        error: 'Erro ao resumir chamada',
        details: eligibleCountError.message,
      });
    }
    const attendanceByEnrollment = new Map(
      pageAttendance.map((row: any) => [row.enrollment_id, row])
    );
    const present = (allAttendance || []).filter((row: any) => row.status === 'present').length;
    const absent = (allAttendance || []).filter((row: any) => row.status === 'absent').length;
    const filteredTotal = count || 0;
    const total = eligibleTotal || 0;

    return res.json({
      lesson: {
        id: lesson.id,
        lesson_date: lesson.lesson_date,
        start_time: lesson.start_time,
        title: lesson.title,
      },
      data: (enrollments || []).map((enrollment: any) => ({
        enrollment_id: enrollment.id,
        kind: enrollment.kind,
        display_name: enrollment.display_name_snapshot,
        removed_from_class: Boolean(enrollment.removed_at),
        status: attendanceByEnrollment.get(enrollment.id)?.status || 'unregistered',
        attendance_updated_at: attendanceByEnrollment.get(enrollment.id)?.updated_at || null,
      })),
      summary: { total, present, absent, unregistered: Math.max(0, total - present - absent) },
      pagination: buildPagination(page, limit, filteredTotal),
    });
  } catch (err) {
    logError('Erro ao carregar chamada de ensino:', err);
    return res.status(500).json({ error: 'Erro ao carregar chamada' });
  }
};

export const saveTeachingLessonAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = saveTeachingAttendanceSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }
    const churchId = req.church!.churchId;
    const lessonId = req.params.lessonId;
    const { data: lesson, error: lessonError } = await loadLesson(lessonId, churchId);
    if (lessonError || !lesson) return res.status(404).json({ error: 'Aula não encontrada' });
    const classRow = lesson.teaching_classes as any;
    if (!checkAccess(req, classRow?.congregation_id, res)) return;

    const { data, error } = await supabase.rpc('save_teaching_lesson_attendance', {
      p_church_id: churchId,
      p_lesson_id: lessonId,
      p_actor_id: req.user!.id,
      p_changes: value.changes,
      p_mark_unregistered_present: value.mark_unregistered_present,
      p_overwrite_absent: value.overwrite_absent,
    });
    if (error) {
      const eligibilityConflict = error.message.includes('ineligible_attendance_enrollment');
      return res.status(eligibilityConflict ? 409 : 400).json({
        error: eligibilityConflict ? 'Matrícula inelegível' : 'Erro ao salvar chamada',
        details: eligibilityConflict
          ? 'Uma ou mais matrículas não são elegíveis para esta aula.'
          : error.message,
      });
    }
    await logAudit(req, {
      entity: 'teaching_lesson_attendance',
      entityId: lessonId,
      action: 'update',
      changesAfter: {
        explicit_change_count: value.changes.length,
        mark_unregistered_present: value.mark_unregistered_present,
        overwrite_absent: value.overwrite_absent,
        affected_count: data,
      },
    });
    return res.json({ lesson_id: lessonId, affected_count: data });
  } catch (err) {
    logError('Erro ao salvar chamada de ensino:', err);
    return res.status(500).json({ error: 'Erro ao salvar chamada' });
  }
};
