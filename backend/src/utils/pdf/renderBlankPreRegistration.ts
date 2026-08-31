import { Response } from 'express';
import {
  beginPdfResponse,
  drawCheckboxGroup,
  drawFieldRow,
  drawSectionTitle,
  drawTextAreaLines,
  drawUnderlineField,
  endPdfResponse,
} from './index';

export const PRE_REGISTRATION_PDF_TITLE = 'Ficha de pré-cadastro';

export function slugifyChurchName(churchName: string): string {
  return (churchName || 'igreja')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function buildPreRegistrationFilename(
  churchName: string,
  date: Date = new Date()
): string {
  const churchSlug = slugifyChurchName(churchName);
  const exportDate = date.toISOString().split('T')[0];
  return `ficha-pre-cadastro-${churchSlug}-${exportDate}.pdf`;
}

export function renderBlankPreRegistrationPdf(res: Response, churchName: string): void {
  const filename = buildPreRegistrationFilename(churchName);

  const ctx = beginPdfResponse(res, filename, {
    orientation: 'portrait',
    churchName,
    title: PRE_REGISTRATION_PDF_TITLE,
    subtitle: 'Preencha com caneta. Os dados serão cadastrados posteriormente no sistema.',
  });

  drawUnderlineField(ctx, 'Data do preenchimento');

  drawSectionTitle(ctx, 'Informações pessoais');
  drawUnderlineField(ctx, 'Nome completo');
  drawUnderlineField(ctx, 'Data de nascimento (DD/MM/AAAA)');
  drawCheckboxGroup(ctx, 'Gênero', ['Masculino', 'Feminino'], 2);
  drawCheckboxGroup(
    ctx,
    'Estado civil',
    ['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro'],
    3
  );
  drawFieldRow(ctx, [
    { label: 'Telefone', flex: 1 },
    { label: 'WhatsApp', flex: 1 },
  ]);

  drawSectionTitle(ctx, 'Informações eclesiásticas');
  drawCheckboxGroup(
    ctx,
    'Tipo de recebimento previsto',
    ['Batismo', 'Transferência', 'Profissão de Fé', 'Outro'],
    2
  );
  drawUnderlineField(ctx, 'Congregação prevista');

  drawUnderlineField(ctx, 'É cristão evangélico há quantos anos?');
  drawCheckboxGroup(ctx, 'Vem de família cristã evangélica?', ['Sim', 'Não'], 2);
  drawCheckboxGroup(ctx, 'Já é batizado(a)?', ['Sim', 'Não'], 2);
  drawCheckboxGroup(
    ctx,
    'Se batizado(a), marque uma opção',
    [
      'Fui batizado(a) na igreja católica',
      'Fui batizado(a) quando adulto — nesta igreja',
      'Fui batizado(a) quando adulto — em outra igreja evangélica',
      'Fui batizado(a) quando criança — nesta igreja',
      'Fui batizado(a) quando criança — em outra igreja evangélica',
      'Sou novo(a) convertido(a) — minha religião anterior era:',
      'Sou novo(a) convertido(a) — não tinha religião anterior',
    ],
    1
  );
  drawUnderlineField(ctx, 'Nome da igreja em que foi batizado(a)');
  drawUnderlineField(ctx, 'Qual era sua religião anterior?');
  drawCheckboxGroup(
    ctx,
    'Atualmente é ou era membro ativo da igreja anterior?',
    ['Sim', 'Não'],
    2
  );
  drawTextAreaLines(
    ctx,
    'Descreva o(s) motivo(s) de ter decidido tornar-se membro de nossa igreja',
    3
  );
  drawUnderlineField(ctx, 'Há quanto tempo frequenta a igreja?');
  drawCheckboxGroup(ctx, 'Frequenta nossos cultos?', ['Regularmente', 'Às vezes', 'Não'], 3);
  drawCheckboxGroup(ctx, 'Participa de alguma outra atividade semanal?', ['Sim', 'Não'], 2);
  drawUnderlineField(ctx, 'Quais atividades?');

  endPdfResponse(ctx);
}
