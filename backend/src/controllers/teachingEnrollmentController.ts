import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { AuthRequest } from '../types';
import {
  createEnrollmentSchema,
  resolveEnrollmentSchema,
} from '../validators/teachingValidator';
import { logAudit } from '../utils/auditLogger';
import { assertCongregationAccess } from '../utils/congregationScope';
import { error as logError } from '../utils/logger';
import { buildPagination, parsePageLimit } from '../utils/pagination';
import { buildIlikeContainsOrFilter } from '../utils/postgrestFilter';
import { decideLinkMemberResolve } from '../services/teachingEnrollmentPolicy';
import {
  normalizeWhatsAppDigits,
  whatsappLast4National,
} from '../services/teachingMatchService';

function maskWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const last4 = whatsappLast4National(normalizeWhatsAppDigits(phone));
  if (!last4) return '****';
  return `****${last4}`;
}

function toBirthDateString(birth: Date | string | null | undefined): string | null {
  if (birth == null || birth === '') return null;
  if (typeof birth === 'string') return birth.slice(0, 10);
  if (birth instanceof Date && !Number.isNaN(birth.getTime())) {
    return birth.toISOString().slice(0, 10);
  }
  return null;
}

function calcAge(birth: string | Date | null | undefined): number | null {
  const iso = toBirthDateString(birth);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

async function loadClassForChurch(classId: string, churchId: string) {
  return supabase
    .from('teaching_classes')
    .select('id, church_id, congregation_id, name, status')
    .eq('id', classId)
    .eq('church_id', churchId)
    .single();
}

function serializeEnrollment(row: any) {
  const rawWhatsapp =
    row.kind === 'member'
      ? row.members?.whatsapp || row.members?.phone || row.whatsapp || null
      : row.whatsapp || null;
  const masked = maskWhatsApp(rawWhatsapp);
  return {
    id: row.id,
    church_id: row.church_id,
    class_id: row.class_id,
    kind: row.kind,
    member_id: row.member_id,
    full_name: row.full_name,
    birth_date: toBirthDateString(row.birth_date),
    email: row.email,
    attendance_eligible_from: row.attendance_eligible_from,
    removed_at: row.removed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    display_name: row.members?.name || row.full_name || null,
    whatsapp: rawWhatsapp,
    whatsapp_masked: masked,
    age: calcAge(row.birth_date || row.members?.birth),
    member: row.members
      ? {
          id: row.members.id,
          name: row.members.name,
          congregation_id: row.members.congregation_id,
          whatsapp: row.members.whatsapp || row.members.phone || null,
          whatsapp_masked: maskWhatsApp(row.members.whatsapp || row.members.phone),
          age: calcAge(row.members.birth),
          birth: toBirthDateString(row.members.birth),
          congregations: row.members.congregations || null,
        }
      : null,
  };
}

async function enrolledMemberIdsForClass(classId: string, churchId: string) {
  const { data } = await supabase
    .from('teaching_enrollments')
    .select('member_id')
    .eq('class_id', classId)
    .eq('church_id', churchId)
    .is('removed_at', null)
    .not('member_id', 'is', null);

  return new Set(
    (data || []).map((row: { member_id?: string | null }) => row.member_id).filter(Boolean)
  );
}

async function enrichPossibleMemberCandidates(enrollment: any, churchId: string) {
  const meta = enrollment.match_meta || {};
  const candidateIds: string[] = Array.isArray(meta.candidates)
    ? meta.candidates.map((c: any) => c.id).filter(Boolean)
    : [];

  const base = serializeEnrollment(enrollment);

  if (candidateIds.length === 0) {
    return {
      ...base,
      signals: meta.signals || null,
      queue_candidates: [],
    };
  }

  const enrolledIds = await enrolledMemberIdsForClass(enrollment.class_id, churchId);

  const { data: members } = await supabase
    .from('members')
    .select(
      `
      id,
      name,
      birth,
      whatsapp,
      phone,
      email,
      congregation_id,
      congregations (
        id,
        name,
        abbreviation
      )
    `
    )
    .eq('church_id', churchId)
    .in('id', candidateIds);

  const byId = new Map((members || []).map((m: any) => [m.id, m]));
  const signalById = new Map(
    (meta.candidates || []).map((c: any) => [c.id, c.signals || { N: false, W: false, D: false }])
  );

  const queue_candidates = candidateIds
    .map((id) => {
      const member = byId.get(id);
      if (!member) return null;
      const rawWhatsapp = member.whatsapp || member.phone || null;
      return {
        id: member.id,
        name: member.name,
        age: calcAge(member.birth),
        birth: toBirthDateString(member.birth),
        email: member.email || null,
        whatsapp: rawWhatsapp,
        whatsapp_masked: maskWhatsApp(rawWhatsapp),
        congregation_id: member.congregation_id,
        congregation: member.congregations || null,
        already_enrolled: enrolledIds.has(member.id),
        signals: signalById.get(id) || { N: false, W: false, D: false },
      };
    })
    .filter(Boolean);

  return {
    ...base,
    signals: meta.signals || null,
    queue_candidates,
  };
}

export const listTeachingEnrollments = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { id: classId } = req.params;

    const { data: cls, error: classError } = await loadClassForChurch(classId, churchId);
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

    const { page, limit, offset } = parsePageLimit(req.query);
    const searchFilter = buildIlikeContainsOrFilter(
      ['full_name', 'whatsapp', 'email'],
      String(req.query.search || '')
    );

    const enrollmentSelect = `
        *,
        members (
          id,
          name,
          birth,
          whatsapp,
          phone,
          congregation_id,
          congregations (
            id,
            name,
            abbreviation
          )
        )
      `;

    const { data: queueRows, error: queueError } = await supabase
      .from('teaching_enrollments')
      .select(enrollmentSelect)
      .eq('class_id', classId)
      .eq('church_id', churchId)
      .eq('kind', 'possible_member')
      .order('created_at', { ascending: false });

    if (queueError) {
      return res.status(400).json({
        error: 'Erro ao buscar matrículas',
        details: queueError.message,
      });
    }

    let othersQuery = supabase
      .from('teaching_enrollments')
      .select(enrollmentSelect, { count: 'exact' })
      .eq('class_id', classId)
      .eq('church_id', churchId)
      .neq('kind', 'possible_member')
      .is('removed_at', null);

    if (searchFilter) {
      othersQuery = othersQuery.or(searchFilter);
    }

    const { data: otherRows, error, count } = await othersQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({
        error: 'Erro ao buscar matrículas',
        details: error.message,
      });
    }

    const queue = [];
    for (const enrollment of queueRows || []) {
      queue.push(await enrichPossibleMemberCandidates(enrollment, churchId));
    }

    const data = (otherRows || []).map((enrollment) => serializeEnrollment(enrollment));

    return res.json({
      data,
      queue,
      pagination: buildPagination(page, limit, count || 0),
    });
  } catch (err) {
    logError('Erro ao listar matrículas de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao carregar matrículas',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const createTeachingEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = createEnrollmentSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const churchId = req.church!.churchId;
    const { id: classId } = req.params;

    const { data: cls, error: classError } = await loadClassForChurch(classId, churchId);
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

    let payload: Record<string, unknown>;

    if (value.type === 'member') {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, name, birth, whatsapp, phone, email')
        .eq('id', value.member_id)
        .eq('church_id', churchId)
        .single();

      if (memberError || !member) {
        return res.status(400).json({
          error: 'Membro inválido',
          details: 'Membro não encontrado ou não pertence a esta igreja',
        });
      }

      const { data: existing } = await supabase
        .from('teaching_enrollments')
        .select('id')
        .eq('class_id', classId)
        .eq('member_id', member.id)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({
          error: 'Matrícula duplicada',
          details: 'Este membro já está matriculado nesta turma',
        });
      }

      payload = {
        church_id: churchId,
        class_id: classId,
        kind: 'member',
        member_id: member.id,
        full_name: member.name,
        display_name_snapshot: member.name,
        whatsapp: member.whatsapp || member.phone || null,
        birth_date: toBirthDateString(member.birth),
        email: member.email || null,
        match_meta: null,
        attendance_eligible_from: new Date().toISOString().slice(0, 10),
      };
    } else {
      // Convidado manual — nunca cria members
      payload = {
        church_id: churchId,
        class_id: classId,
        kind: 'guest',
        member_id: null,
        full_name: value.full_name.trim(),
        display_name_snapshot: value.full_name.trim(),
        whatsapp: value.whatsapp.trim(),
        birth_date: value.birth_date,
        email: emptyToNull(value.email),
        match_meta: null,
        attendance_eligible_from: new Date().toISOString().slice(0, 10),
      };
    }

    const { data: enrollment, error: createError } = await supabase
      .from('teaching_enrollments')
      .insert([payload])
      .select()
      .single();

    if (createError || !enrollment) {
      return res.status(400).json({
        error: 'Erro ao criar matrícula',
        details: createError?.message || 'Não foi possível criar a matrícula',
      });
    }

    await logAudit(req, {
      entity: 'teaching_enrollment',
      entityId: enrollment.id,
      action: 'create',
      changesAfter: enrollment,
    });

    return res.status(201).json(serializeEnrollment(enrollment));
  } catch (err) {
    logError('Erro ao criar matrícula de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao cadastrar matrícula',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const resolveTeachingEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const { error: validationError, value } = resolveEnrollmentSchema.validate(req.body, {
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

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('teaching_enrollments')
      .select('*, teaching_classes ( id, congregation_id )')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(404).json({
        error: 'Matrícula não encontrada',
        details: 'Não foi possível encontrar a matrícula solicitada',
      });
    }

    const classRow = enrollment.teaching_classes as any;
    const access = assertCongregationAccess(req.church!, classRow?.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    if (enrollment.kind !== 'possible_member') {
      return res.status(400).json({
        error: 'Ação inválida',
        details: 'Somente matrículas de possível membro podem ser resolvidas',
      });
    }

    let updates: Record<string, unknown>;

    if (value.action === 'keep_guest') {
      updates = {
        kind: 'guest',
        member_id: null,
        match_meta: null,
        display_name_snapshot: enrollment.full_name,
        attendance_eligible_from: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      };
    } else {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, name, birth, whatsapp, phone, email')
        .eq('id', value.member_id)
        .eq('church_id', churchId)
        .single();

      if (memberError || !member) {
        return res.status(400).json({
          error: 'Membro inválido',
          details: 'Membro não encontrado ou não pertence a esta igreja',
        });
      }

      const { data: duplicate } = await supabase
        .from('teaching_enrollments')
        .select('id')
        .eq('class_id', enrollment.class_id)
        .eq('member_id', member.id)
        .is('removed_at', null)
        .neq('id', enrollment.id)
        .maybeSingle();

      if (decideLinkMemberResolve(Boolean(duplicate)) === 'dismiss_already_enrolled') {
        const { error: deleteError } = await supabase
          .from('teaching_enrollments')
          .delete()
          .eq('id', id)
          .eq('church_id', churchId);

        if (deleteError) {
          return res.status(400).json({
            error: 'Matrícula duplicada',
            details: 'Este membro já está matriculado nesta turma',
          });
        }

        await logAudit(req, {
          entity: 'teaching_enrollment',
          entityId: id,
          action: 'delete',
          changesBefore: enrollment,
        });

        return res.json({
          already_enrolled: true,
          id,
          member_id: member.id,
        });
      }

      updates = {
        kind: 'member',
        member_id: member.id,
        full_name: member.name,
        display_name_snapshot: member.name,
        whatsapp: member.whatsapp || member.phone || enrollment.whatsapp,
        birth_date: toBirthDateString(member.birth) || enrollment.birth_date,
        email: member.email || enrollment.email,
        match_meta: null,
        attendance_eligible_from: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      };
    }

    const { data: updated, error: updateError } = await supabase
      .from('teaching_enrollments')
      .update(updates)
      .eq('id', id)
      .eq('church_id', churchId)
      .select()
      .single();

    if (updateError || !updated) {
      return res.status(400).json({
        error: 'Erro ao resolver matrícula',
        details: updateError?.message || 'Não foi possível resolver a matrícula',
      });
    }

    await logAudit(req, {
      entity: 'teaching_enrollment',
      entityId: updated.id,
      action: 'update',
      changesBefore: enrollment,
      changesAfter: updated,
    });

    return res.json(serializeEnrollment(updated));
  } catch (err) {
    logError('Erro ao resolver matrícula de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao resolver matrícula',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

export const deleteTeachingEnrollment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        details: 'Usuário não está autenticado',
      });
    }

    const churchId = req.church!.churchId;
    const { id } = req.params;

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('teaching_enrollments')
      .select('*, teaching_classes ( id, congregation_id )')
      .eq('id', id)
      .eq('church_id', churchId)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(404).json({
        error: 'Matrícula não encontrada',
        details: 'Não foi possível encontrar a matrícula solicitada',
      });
    }

    const classRow = enrollment.teaching_classes as any;
    const access = assertCongregationAccess(req.church!, classRow?.congregation_id);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    if (enrollment.kind === 'possible_member') {
      const { error: deleteError } = await supabase
        .from('teaching_enrollments')
        .delete()
        .eq('id', id)
        .eq('church_id', churchId);
      if (deleteError) {
        return res.status(400).json({
          error: 'Erro ao excluir matrícula',
          details: deleteError.message,
        });
      }
      await logAudit(req, {
        entity: 'teaching_enrollment',
        entityId: id,
        action: 'delete',
        changesBefore: { kind: enrollment.kind, class_id: enrollment.class_id },
      });
      return res.status(204).send();
    }

    if (enrollment.removed_at) {
      return res.status(409).json({
        error: 'Matrícula já removida',
        details: 'Esta matrícula já não está ativa na turma',
      });
    }

    const removalDate = new Date().toISOString().slice(0, 10);
    const { data: futureAttendance, error: attendanceError } = await supabase
      .from('teaching_lesson_attendance')
      .select('id, teaching_lessons!inner(lesson_date)')
      .eq('church_id', churchId)
      .eq('enrollment_id', id)
      .gte('teaching_lessons.lesson_date', removalDate)
      .limit(1);
    if (attendanceError) {
      return res.status(400).json({
        error: 'Erro ao validar histórico',
        details: attendanceError.message,
      });
    }
    if (futureAttendance?.length) {
      return res.status(409).json({
        error: 'Presença futura impede a remoção',
        details:
          'Limpe a chamada futura desta matrícula antes de removê-la; nenhuma presença foi apagada.',
      });
    }

    const removedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('teaching_enrollments')
      .update({
        removed_at: removedAt,
        removed_by: req.user.id,
        updated_at: removedAt,
      })
      .eq('id', id)
      .eq('church_id', churchId)
      .is('removed_at', null);
    if (updateError) {
      return res.status(400).json({
        error: 'Erro ao remover matrícula',
        details: updateError.message,
      });
    }

    await logAudit(req, {
      entity: 'teaching_enrollment',
      entityId: id,
      action: 'deactivate',
      changesBefore: { kind: enrollment.kind, class_id: enrollment.class_id },
      changesAfter: { removed_at: removedAt },
    });

    return res.status(204).send();
  } catch (err) {
    logError('Erro ao excluir matrícula de ensino:', err);
    return res.status(500).json({
      error: 'Erro ao excluir matrícula',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};
