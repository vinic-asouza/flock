import { Response } from 'express';
import {
  beginPdfResponse,
  drawHeroName,
  drawKeyValueGrid,
  drawSectionTitle,
  drawStatusBadge,
  endPdfResponse,
} from './index';
import { dash, formatDateSafe, formatPhoneBR } from './format';
import {
  baptismTypeLabels,
  integrationAdmissionLabels,
  integrationGenderLabels,
  integrationMaritalLabels,
  integrationStatusLabels,
  sundayAttendanceLabels,
} from './integrationLabels';

export {
  integrationAdmissionLabels,
  integrationGenderLabels,
  integrationMaritalLabels,
  integrationStatusLabels,
} from './integrationLabels';

export function renderIntegrationProfilePdf(
  res: Response,
  churchName: string,
  member: any
): void {
  const filename = `integrante-${String(member.name || 'desconhecido')
    .replace(/\s+/g, '-')
    .toLowerCase()}.pdf`;

  const statusLabel = integrationStatusLabels[member.status] ?? member.status ?? '—';
  const tone =
    member.status === 'integrado'
      ? 'success'
      : member.status === 'descartado'
        ? 'muted'
        : 'info';

  const ctx = beginPdfResponse(res, filename, {
    orientation: 'portrait',
    churchName,
    title: 'Ficha de Integração',
  });

  drawStatusBadge(ctx, statusLabel, tone as any, { align: 'center' });
  drawHeroName(ctx, member.name || 'Sem nome');

  drawSectionTitle(ctx, 'Informações Pessoais');
  drawKeyValueGrid(ctx, [
    { label: 'Data de Nascimento', value: formatDateSafe(member.birth) },
    {
      label: 'Gênero',
      value: member.gender
        ? integrationGenderLabels[member.gender] ?? member.gender
        : '—',
    },
    {
      label: 'Estado Civil',
      value: member.marital_status
        ? integrationMaritalLabels[member.marital_status] ?? member.marital_status
        : '—',
    },
  ]);

  drawSectionTitle(ctx, 'Contato');
  drawKeyValueGrid(ctx, [
    { label: 'Telefone', value: formatPhoneBR(member.phone) },
    { label: 'WhatsApp', value: formatPhoneBR(member.whatsapp) },
  ]);

  const questionnaire = buildQuestionnairePairs(member);
  if (questionnaire.length > 0) {
    drawSectionTitle(ctx, 'Informações Eclesiásticas');
    drawKeyValueGrid(ctx, questionnaire);
  }

  drawSectionTitle(ctx, 'Processo de Integração');
  const mentorContact = [member.mentor?.phone, member.mentor?.whatsapp]
    .filter(Boolean)
    .map((p: string) => formatPhoneBR(p))
    .join('  |  ');

  drawKeyValueGrid(ctx, [
    {
      label: 'Tipo de Recebimento Previsto',
      value: member.expected_admission_type
        ? integrationAdmissionLabels[member.expected_admission_type] ??
          member.expected_admission_type
        : '—',
      fullWidth: true,
    },
    {
      label: 'Congregação Prevista',
      value: member.expected_congregation?.name || '—',
      fullWidth: true,
    },
    { label: 'Responsável / Discipulador', value: dash(member.mentor?.name), fullWidth: true },
    { label: 'Contato do Responsável', value: mentorContact || '—', fullWidth: true },
    { label: 'Status', value: statusLabel },
    { label: 'Criado em', value: formatDateSafe(member.created_at) },
  ]);

  if (member.notes) {
    drawSectionTitle(ctx, 'Observações');
    drawKeyValueGrid(
      ctx,
      [{ label: 'Notas', value: String(member.notes), fullWidth: true }],
      { columns: 1 }
    );
  }

  endPdfResponse(ctx);
}

function isFilled(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function buildQuestionnairePairs(
  member: any
): Array<{ label: string; value: string; fullWidth?: boolean }> {
  const pairs: Array<{ label: string; value: string; fullWidth?: boolean }> = [];

  if (isFilled(member.years_evangelical)) {
    const yearsLabel = member.years_evangelical === '1' ? 'ano' : 'anos';
    pairs.push({
      label: 'Cristão evangélico há',
      value: `${member.years_evangelical} ${yearsLabel}`,
    });
  }
  if (member.evangelical_family !== undefined && member.evangelical_family !== null) {
    pairs.push({
      label: 'Família cristã evangélica',
      value: member.evangelical_family ? 'Sim' : 'Não',
    });
  }
  if (member.is_baptized !== undefined && member.is_baptized !== null) {
    let baptizedText = member.is_baptized ? 'Sim' : 'Não';
    if (member.is_baptized && member.baptism_type) {
      baptizedText += ` — ${baptismTypeLabels[member.baptism_type] || member.baptism_type}`;
    }
    pairs.push({ label: 'Batizado(a)', value: baptizedText, fullWidth: true });
  }
  if (isFilled(member.baptism_other_church_name)) {
    pairs.push({
      label: 'Igreja em que foi batizado(a)',
      value: member.baptism_other_church_name,
      fullWidth: true,
    });
  }
  if (isFilled(member.previous_religion)) {
    pairs.push({
      label: 'Religião anterior',
      value: member.previous_religion,
      fullWidth: true,
    });
  }
  if (member.previous_church_active !== undefined && member.previous_church_active !== null) {
    pairs.push({
      label: 'Era membro ativo da igreja anterior',
      value: member.previous_church_active ? 'Sim' : 'Não',
      fullWidth: true,
    });
  }
  if (isFilled(member.time_attending)) {
    pairs.push({ label: 'Frequenta a igreja há', value: member.time_attending });
  }
  if (isFilled(member.sunday_attendance)) {
    pairs.push({
      label: 'Cultos',
      value: sundayAttendanceLabels[member.sunday_attendance] || member.sunday_attendance,
    });
  }
  if (member.weekly_activities !== undefined && member.weekly_activities !== null) {
    pairs.push({
      label: 'Atividades semanais',
      value: member.weekly_activities
        ? `Sim${member.weekly_activities_which ? ` — ${member.weekly_activities_which}` : ''}`
        : 'Não',
      fullWidth: true,
    });
  }
  if (isFilled(member.reason_joining)) {
    pairs.push({
      label: 'Motivo de tornar-se membro',
      value: member.reason_joining,
      fullWidth: true,
    });
  }

  return pairs;
}

