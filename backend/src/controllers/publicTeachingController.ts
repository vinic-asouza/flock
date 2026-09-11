import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { PublicTeachingRequest } from '../types';
import { publicTeachingEnrollSchema } from '../validators/teachingValidator';
import { matchEnrollment } from '../services/teachingMatchService';
import { error as logError } from '../utils/logger';

const UNAVAILABLE = {
  error: 'Esta inscrição não está disponível.',
  details: 'Esta inscrição não está disponível.',
};

const OPEN_STATUSES = new Set(['open', 'in_progress']);

async function loadClassContext(classId: string, churchId: string) {
  const { data: cls, error } = await supabase
    .from('teaching_classes')
    .select(
      `
      id,
      name,
      status,
      church_id,
      teaching_programs (
        id,
        name
      )
    `
    )
    .eq('id', classId)
    .eq('church_id', churchId)
    .single();

  if (error || !cls) {
    return null;
  }

  const { data: church } = await supabase
    .from('churches')
    .select('id, name')
    .eq('id', churchId)
    .single();

  return {
    class: cls,
    churchName: church?.name || '',
    programName: (cls.teaching_programs as any)?.name || '',
  };
}

/**
 * GET público — metadados da inscrição (sem vazamento de match).
 */
export const getPublicTeachingLink = async (req: PublicTeachingRequest, res: Response) => {
  try {
    const teachingLink = req.teachingLink!;
    const churchId = req.churchId!;

    const ctx = await loadClassContext(teachingLink.class_id, churchId);
    if (!ctx) {
      return res.status(404).json(UNAVAILABLE);
    }

    if (!OPEN_STATUSES.has(ctx.class.status)) {
      return res.status(403).json(UNAVAILABLE);
    }

    return res.json({
      status: 'ok',
      church_name: ctx.churchName,
      class_name: ctx.class.name,
      program_name: ctx.programName,
      expires_at: teachingLink.expires_at,
      enrollment_allowed: true,
    });
  } catch (err) {
    logError('Erro ao validar link público de ensino:', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};

/**
 * POST público — inscrição com match servidor; nunca revela detalhes do match.
 */
export const createPublicTeachingEnrollment = async (
  req: PublicTeachingRequest,
  res: Response
) => {
  try {
    const teachingLink = req.teachingLink!;
    const churchId = req.churchId!;

    const { error: validationError, value } = publicTeachingEnrollSchema.validate(req.body, {
      abortEarly: false,
    });
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details[0].message,
      });
    }

    const ctx = await loadClassContext(teachingLink.class_id, churchId);
    if (!ctx || !OPEN_STATUSES.has(ctx.class.status)) {
      return res.status(403).json(UNAVAILABLE);
    }

    const matchInput = {
      fullName: value.full_name,
      whatsapp: value.whatsapp,
      birthDate: value.birth_date,
    };
    const memberSelect = 'id, name, whatsapp, phone, birth';

    const { data: birthMatches, error: birthError } = await supabase
      .from('members')
      .select(memberSelect)
      .eq('church_id', churchId)
      .eq('active', true)
      .eq('birth', value.birth_date);

    if (birthError) {
      logError('Erro ao buscar membros para match de ensino:', birthError);
      return res.status(500).json({
        error: 'Erro interno do servidor',
        details: 'Não foi possível processar a inscrição no momento',
      });
    }

    let match = matchEnrollment(matchInput, birthMatches || []);

    if (match.kind !== 'member') {
      const { data: otherMembers, error: membersError } = await supabase
        .from('members')
        .select(memberSelect)
        .eq('church_id', churchId)
        .eq('active', true)
        .or(`birth.is.null,birth.neq.${value.birth_date}`);

      if (membersError) {
        logError('Erro ao buscar membros para match de ensino:', membersError);
        return res.status(500).json({
          error: 'Erro interno do servidor',
          details: 'Não foi possível processar a inscrição no momento',
        });
      }

      match = matchEnrollment(matchInput, [...(birthMatches || []), ...(otherMembers || [])]);
    }

    const enrollmentPayload: Record<string, unknown> = {
      church_id: churchId,
      class_id: teachingLink.class_id,
      kind: match.kind,
      member_id: match.kind === 'member' ? match.memberId || null : null,
      full_name: value.full_name.trim(),
      whatsapp: value.whatsapp.trim(),
      birth_date: value.birth_date,
      email: value.email ? String(value.email).trim() : null,
      match_meta:
        match.kind === 'possible_member'
          ? {
              signals: match.signals,
              candidates: match.candidates,
            }
          : match.kind === 'member'
            ? { signals: match.signals }
            : null,
    };

    // Se auto-membro e já matriculado, não duplica — trata como confirmado
    if (match.kind === 'member' && match.memberId) {
      const { data: existing } = await supabase
        .from('teaching_enrollments')
        .select('id')
        .eq('class_id', teachingLink.class_id)
        .eq('member_id', match.memberId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('teaching_public_links')
          .update({ current_uses: teachingLink.current_uses + 1 })
          .eq('id', teachingLink.id);

        return res.status(200).json({
          outcome: 'confirmed',
          church_name: ctx.churchName,
          class_name: ctx.class.name,
        });
      }
    }

    // Match fraco cujos candidatos já estão na turma: não reabre fila
    if (match.kind === 'possible_member') {
      const candidateIds = (match.candidates || []).map((c) => c.id).filter(Boolean);
      if (candidateIds.length > 0) {
        const { data: alreadyInClass } = await supabase
          .from('teaching_enrollments')
          .select('member_id')
          .eq('class_id', teachingLink.class_id)
          .in('member_id', candidateIds);

        const enrolled = new Set((alreadyInClass || []).map((row) => row.member_id));
        const allCandidatesEnrolled = candidateIds.every((id) => enrolled.has(id));

        if (allCandidatesEnrolled) {
          await supabase
            .from('teaching_public_links')
            .update({ current_uses: teachingLink.current_uses + 1 })
            .eq('id', teachingLink.id);

          return res.status(200).json({
            outcome: 'submitted',
            church_name: ctx.churchName,
            class_name: ctx.class.name,
          });
        }
      }
    }

    const { error: insertError } = await supabase
      .from('teaching_enrollments')
      .insert([enrollmentPayload]);

    if (insertError) {
      logError('Erro ao inserir matrícula pública de ensino:', insertError);
      return res.status(500).json({
        error: 'Erro interno do servidor',
        details: 'Não foi possível concluir a inscrição',
      });
    }

    await supabase
      .from('teaching_public_links')
      .update({ current_uses: teachingLink.current_uses + 1 })
      .eq('id', teachingLink.id);

    const outcome = match.kind === 'member' ? 'confirmed' : 'submitted';

    return res.status(201).json({
      outcome,
      church_name: ctx.churchName,
      class_name: ctx.class.name,
    });
  } catch (err) {
    logError('Erro na inscrição pública de ensino:', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
};
