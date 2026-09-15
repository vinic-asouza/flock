export const CERTIFICATE_MAX_ENROLLMENTS = 50;
export const CERTIFICATE_MAX_EXTRA_LOGOS = 2;
export const CERTIFICATE_MAX_LOGO_BYTES = 2 * 1024 * 1024;

export const CERTIFICATE_ELIGIBLE_KINDS = ['member', 'guest'] as const;
export type CertificateEligibleKind = (typeof CERTIFICATE_ELIGIBLE_KINDS)[number];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value.trim());
}

export function normalizeHexColor(value: string): string {
  return value.trim().toUpperCase();
}

/** Aceita JSON array, CSV ou valor único. */
export function parseEnrollmentIds(raw: unknown): string[] {
  if (raw === undefined || raw === null || raw === '') return [];
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((v) => String(v).trim()).filter(Boolean))];
  }
  const text = String(raw).trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.map((v) => String(v).trim()).filter(Boolean))];
      }
    } catch {
      // fall through
    }
  }
  return [...new Set(text.split(/[,;\s]+/).map((v) => v.trim()).filter(Boolean))];
}

export type DetectedImageMime = 'image/png' | 'image/jpeg';

export function detectImageMime(buffer: Buffer): DetectedImageMime | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // WebP (RIFF....WEBP) e demais formatos não são suportados pelo PDFKit neste fluxo
  return null;
}

export function validateLogoBuffer(
  buffer: Buffer | undefined,
  label: string
): { ok: true; mime: DetectedImageMime } | { ok: false; message: string } {
  if (!buffer || buffer.length === 0) {
    return { ok: false, message: `${label} é obrigatório` };
  }
  if (buffer.length > CERTIFICATE_MAX_LOGO_BYTES) {
    return { ok: false, message: `${label} deve ter no máximo 2 MB` };
  }
  const mime = detectImageMime(buffer);
  if (!mime) {
    return { ok: false, message: `${label} deve ser PNG ou JPEG válido` };
  }
  return { ok: true, mime };
}

export type EnrollmentForCertificate = {
  id: string;
  kind: string;
  removed_at?: string | null;
  display_name: string;
};

export function resolveCertificateStudents(
  requestedIds: string[],
  rows: EnrollmentForCertificate[]
):
  | { ok: true; students: EnrollmentForCertificate[] }
  | { ok: false; message: string } {
  if (requestedIds.length === 0) {
    return { ok: false, message: 'Selecione ao menos um aluno elegível' };
  }
  if (requestedIds.length > CERTIFICATE_MAX_ENROLLMENTS) {
    return {
      ok: false,
      message: `É possível emitir no máximo ${CERTIFICATE_MAX_ENROLLMENTS} certificados por vez`,
    };
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  const students: EnrollmentForCertificate[] = [];

  for (const id of requestedIds) {
    const row = byId.get(id);
    if (!row) {
      return {
        ok: false,
        message: 'Uma ou mais matrículas não pertencem a esta turma',
      };
    }
    if (row.removed_at) {
      return {
        ok: false,
        message: 'Não é possível emitir certificado para matrícula removida',
      };
    }
    if (!(CERTIFICATE_ELIGIBLE_KINDS as readonly string[]).includes(row.kind)) {
      return {
        ok: false,
        message: 'Possível membro não é elegível para certificado até a resolução na aba Inscritos',
      };
    }
    if (!row.display_name?.trim()) {
      return { ok: false, message: 'Aluno sem nome válido para o certificado' };
    }
    students.push(row);
  }

  return { ok: true, students };
}

export function formatCertificateIssueDate(date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

export function slugifyForFilename(value: string): string {
  const slug = (value || 'turma')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'turma';
}
