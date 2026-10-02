import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import {
  buildTeachingClassStatistics,
  type StatisticsEnrollmentKind,
} from '../services/teachingStatisticsService';
import { AuthRequest } from '../types';
import { assertCongregationAccess } from '../utils/congregationScope';
import { error as logError } from '../utils/logger';

const PAGE = 1000;

function memberName(members: unknown): string | null {
  const row = Array.isArray(members) ? members[0] : members;
  if (!row || typeof row !== 'object' || !('name' in row)) return null;
  const name = (row as { name?: string | null }).name;
  return name ? String(name) : null;
}

async function selectAll(
  build: () => any
): Promise<{ data: any[]; error: { message: string } | null }> {
  const rows: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) return { data: [], error };
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < PAGE) return { data: rows, error: null };
    from += PAGE;
  }
}

export const getTeachingClassStatistics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const classId = String(req.params.id || '');
    if (!classId) {
      return res.status(400).json({
        error: 'Turma inválida',
        details: 'ID da turma é obrigatório',
      });
    }

    const { data: cls, error: classError } = await supabase
      .from('teaching_classes')
      .select('id, congregation_id')
      .eq('id', classId)
      .eq('church_id', churchId)
      .maybeSingle();

    if (classError) {
      return res.status(400).json({
        error: 'Erro ao carregar turma',
        details: classError.message,
      });
    }
    if (!cls) {
      return res.status(404).json({
        error: 'Turma não encontrada',
        details: 'Não foi possível encontrar a turma solicitada',
      });
    }

    const access = assertCongregationAccess(req.church!, cls.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    const enrollmentsQuery = await selectAll(() =>
      supabase
        .from('teaching_enrollments')
        .select(
          'id, kind, full_name, display_name_snapshot, attendance_eligible_from, removed_at, members ( name )'
        )
        .eq('church_id', churchId)
        .eq('class_id', classId)
    );
    if (enrollmentsQuery.error) {
      return res.status(400).json({
        error: 'Erro ao carregar inscritos',
        details: enrollmentsQuery.error.message,
      });
    }

    const lessonsQuery = await selectAll(() =>
      supabase
        .from('teaching_lessons')
        .select('id, lesson_date, start_time, title')
        .eq('church_id', churchId)
        .eq('class_id', classId)
        .order('lesson_date', { ascending: true })
        .order('start_time', { ascending: true })
    );
    if (lessonsQuery.error) {
      return res.status(400).json({
        error: 'Erro ao carregar aulas',
        details: lessonsQuery.error.message,
      });
    }

    const lessonIds = lessonsQuery.data.map((row) => row.id as string);
    let marks: Array<{ lesson_id: string; enrollment_id: string; status: string | null }> = [];
    if (lessonIds.length > 0) {
      const marksQuery = await selectAll(() =>
        supabase
          .from('teaching_lesson_attendance')
          .select('lesson_id, enrollment_id, status')
          .eq('church_id', churchId)
          .in('lesson_id', lessonIds)
      );
      if (marksQuery.error) {
        return res.status(400).json({
          error: 'Erro ao carregar presenças',
          details: marksQuery.error.message,
        });
      }
      marks = marksQuery.data;
    }

    const statistics = buildTeachingClassStatistics({
      enrollments: enrollmentsQuery.data.map((row) => ({
        id: row.id,
        kind: row.kind as StatisticsEnrollmentKind,
        displayName: String(
          row.display_name_snapshot || memberName(row.members) || row.full_name || 'Sem nome'
        ).trim(),
        attendanceEligibleFrom: row.attendance_eligible_from,
        removedAt: row.removed_at,
      })),
      lessons: lessonsQuery.data.map((row) => ({
        id: row.id,
        lessonDate: String(row.lesson_date).slice(0, 10),
        startTime: row.start_time,
        title: row.title,
      })),
      marks: marks.map((row) => ({
        lessonId: row.lesson_id,
        enrollmentId: row.enrollment_id,
        status: row.status,
      })),
    });

    return res.json(statistics);
  } catch (err) {
    logError('Erro ao carregar estatísticas de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao carregar estatísticas',
      details: 'Não foi possível montar o panorama da turma',
    });
  }
};
