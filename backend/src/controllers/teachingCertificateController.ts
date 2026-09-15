import { Response } from 'express';
import { supabaseAdmin as supabase } from '../services/supabase';
import { AuthRequest } from '../types';
import { assertCongregationAccess } from '../utils/congregationScope';
import { error as logError } from '../utils/logger';
import { logAudit } from '../utils/auditLogger';
import { renderTeachingCertificatePdf } from '../utils/pdf/renderTeachingCertificate';
import {
  CERTIFICATE_MAX_EXTRA_LOGOS,
  isHexColor,
  normalizeHexColor,
  parseEnrollmentIds,
  resolveCertificateStudents,
  validateLogoBuffer,
  type EnrollmentForCertificate,
} from '../services/teachingCertificateService';

type MulterFiles = {
  churchLogo?: Express.Multer.File[];
  extraLogos?: Express.Multer.File[];
};

export const exportTeachingCertificates = async (req: AuthRequest, res: Response) => {
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

    const enrollmentIds = parseEnrollmentIds(req.body?.enrollmentIds);
    const primaryRaw = req.body?.primaryColor;
    const secondaryRaw = req.body?.secondaryColor;

    if (!isHexColor(primaryRaw) || !isHexColor(secondaryRaw)) {
      return res.status(400).json({
        error: 'Cores inválidas',
        details: 'Informe cores primária e secundária no formato #RRGGBB',
      });
    }

    const files = (req.files || {}) as MulterFiles;
    const churchLogoFile = files.churchLogo?.[0];
    const extraLogoFiles = files.extraLogos || [];

    if (extraLogoFiles.length > CERTIFICATE_MAX_EXTRA_LOGOS) {
      return res.status(400).json({
        error: 'Logos adicionais em excesso',
        details: `É permitido no máximo ${CERTIFICATE_MAX_EXTRA_LOGOS} logos adicionais`,
      });
    }

    const churchLogoCheck = validateLogoBuffer(churchLogoFile?.buffer, 'Logo da Igreja');
    if (!churchLogoCheck.ok) {
      return res.status(400).json({
        error: 'Logo inválido',
        details: churchLogoCheck.message,
      });
    }

    const extraBuffers: Buffer[] = [];
    for (let i = 0; i < extraLogoFiles.length; i += 1) {
      const check = validateLogoBuffer(extraLogoFiles[i]?.buffer, `Logo adicional ${i + 1}`);
      if (!check.ok) {
        return res.status(400).json({
          error: 'Logo inválido',
          details: check.message,
        });
      }
      extraBuffers.push(extraLogoFiles[i].buffer);
    }

    const { data: cls, error: classError } = await supabase
      .from('teaching_classes')
      .select(
        `
        id,
        church_id,
        congregation_id,
        name,
        status,
        teaching_programs ( id, name )
      `
      )
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

    if (cls.status !== 'closed') {
      return res.status(400).json({
        error: 'Turma não encerrada',
        details: 'Encerre a Turma para emitir certificados',
      });
    }

    const { data: churchData, error: churchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', churchId)
      .single();

    if (churchError || !churchData) {
      return res.status(404).json({
        error: 'Igreja não encontrada',
        details: churchError?.message || 'Não foi possível carregar a igreja',
      });
    }

    if (enrollmentIds.length === 0) {
      return res.status(400).json({
        error: 'Seleção vazia',
        details: 'Selecione ao menos um aluno elegível',
      });
    }

    const { data: enrollmentRows, error: enrollmentError } = await supabase
      .from('teaching_enrollments')
      .select(
        `
        id,
        kind,
        full_name,
        removed_at,
        members ( id, name )
      `
      )
      .eq('class_id', classId)
      .eq('church_id', churchId)
      .in('id', enrollmentIds);

    if (enrollmentError) {
      return res.status(400).json({
        error: 'Erro ao carregar matrículas',
        details: enrollmentError.message,
      });
    }

    const mapped: EnrollmentForCertificate[] = (enrollmentRows || []).map((row: any) => ({
      id: row.id,
      kind: row.kind,
      removed_at: row.removed_at,
      display_name: String(row.members?.name || row.full_name || '').trim(),
    }));

    const resolved = resolveCertificateStudents(enrollmentIds, mapped);
    if (!resolved.ok) {
      return res.status(400).json({
        error: 'Seleção inválida',
        details: resolved.message,
      });
    }

    const program = Array.isArray((cls as any).teaching_programs)
      ? (cls as any).teaching_programs[0]
      : (cls as any).teaching_programs;

    const programName = String(program?.name || 'Programa').trim();
    const className = String(cls.name || 'Turma').trim();

    await logAudit(req, {
      entity: 'teaching_class',
      entityId: classId,
      action: 'export',
      changesAfter: {
        certificate_enrollment_count: resolved.students.length,
        certificate_extra_logos: extraBuffers.length,
      },
    });

    renderTeachingCertificatePdf(res, {
      churchName: churchData.name || 'Igreja',
      programName,
      className,
      primaryColor: normalizeHexColor(String(primaryRaw)),
      secondaryColor: normalizeHexColor(String(secondaryRaw)),
      churchLogo: churchLogoFile!.buffer,
      extraLogos: extraBuffers,
      students: resolved.students.map((s) => ({ display_name: s.display_name })),
    });
  } catch (err) {
    logError('Erro ao exportar certificados de ensino:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Erro ao gerar certificados',
        details: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  }
};
