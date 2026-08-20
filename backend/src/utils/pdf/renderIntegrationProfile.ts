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
  integrationAdmissionLabels,
  integrationGenderLabels,
  integrationMaritalLabels,
  integrationStatusLabels,
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
