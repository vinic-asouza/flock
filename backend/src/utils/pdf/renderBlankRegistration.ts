import { Response } from 'express';
import {
  beginPdfResponse,
  drawCheckboxGroup,
  drawFieldRow,
  drawSectionTitle,
  drawTextAreaLines,
  drawUnderlineField,
  endPdfResponse,
  ensureSpace,
} from './index';
import { PdfColor, PdfFont } from './tokens';

export function renderBlankRegistrationPdf(res: Response, churchName: string): void {
  const churchSlug = (churchName || 'igreja')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const exportDate = new Date().toISOString().split('T')[0];
  const filename = `ficha-cadastro-membro-${churchSlug}-${exportDate}.pdf`;

  const ctx = beginPdfResponse(res, filename, {
    orientation: 'portrait',
    churchName,
    title: 'Ficha de Cadastro de Membro',
    subtitle: 'Preencha com caneta. Os dados serão cadastrados posteriormente no sistema.',
  });

  drawUnderlineField(ctx, 'Data do preenchimento');

  drawSectionTitle(ctx, 'Informações Básicas');
  drawUnderlineField(ctx, 'Nome completo');
  drawFieldRow(ctx, [
    { label: 'Data de nascimento (DD/MM/AAAA)', flex: 1 },
    { label: 'Natural de', flex: 1 },
  ]);
  drawCheckboxGroup(ctx, 'Gênero', ['Masculino', 'Feminino'], 2);
  drawUnderlineField(ctx, 'Profissão');
  drawCheckboxGroup(
    ctx,
    'Estado civil',
    ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)', 'Outro'],
    3
  );
  drawUnderlineField(ctx, 'Data do casamento / união (DD/MM/AAAA)');
  drawUnderlineField(ctx, 'Nome do cônjuge');
  drawCheckboxGroup(ctx, 'Cônjuge é membro da igreja?', ['Sim', 'Não'], 2);

  drawSectionTitle(ctx, 'Família');
  drawUnderlineField(ctx, 'Nome do pai');
  drawCheckboxGroup(ctx, 'Pai é membro da igreja?', ['Sim', 'Não', 'Falecido'], 3);
  drawUnderlineField(ctx, 'Nome da mãe');
  drawCheckboxGroup(ctx, 'Mãe é membro da igreja?', ['Sim', 'Não', 'Falecida'], 3);

  ensureSpace(ctx, 24);
  ctx.doc
    .font(PdfFont.bold)
    .fontSize(9)
    .fillColor(PdfColor.muted)
    .text('Filhos (preencha quantos forem necessários):', ctx.left, ctx.doc.y);
  ctx.doc.moveDown(0.35);

  for (let i = 1; i <= 3; i += 1) {
    ensureSpace(ctx, 70);
    ctx.doc
      .font(PdfFont.bold)
      .fontSize(8)
      .fillColor(PdfColor.accent)
      .text(`Filho ${i}`, ctx.left, ctx.doc.y);
    ctx.doc.moveDown(0.15);
    drawUnderlineField(ctx, 'Nome');
    drawFieldRow(ctx, [
      { label: 'Data de nascimento (DD/MM/AAAA)', flex: 1 },
      { label: 'Reside com você? ( ) Sim  ( ) Não', flex: 1 },
    ]);
  }

  ensureSpace(ctx, 18);
  ctx.doc
    .font('Helvetica-Oblique')
    .fontSize(8)
    .fillColor(PdfColor.muted)
    .text(
      'Se houver mais filhos, utilize folha adicional com os mesmos campos acima.',
      ctx.left,
      ctx.doc.y,
      { width: ctx.contentWidth }
    );
  ctx.doc.moveDown(0.4);

  drawSectionTitle(ctx, 'Contato e Endereço');
  drawUnderlineField(ctx, 'E-mail');
  drawFieldRow(ctx, [
    { label: 'Telefone', flex: 1 },
    { label: 'WhatsApp', flex: 1 },
  ]);
  drawFieldRow(ctx, [
    { label: 'CEP', flex: 1 },
    { label: 'Estado', flex: 0.6 },
    { label: 'Cidade', flex: 1.4 },
  ]);
  drawUnderlineField(ctx, 'Endereço');
  drawFieldRow(ctx, [
    { label: 'Número', flex: 0.6 },
    { label: 'Bairro', flex: 1.2 },
    { label: 'Complemento', flex: 1.2 },
  ]);

  drawSectionTitle(ctx, 'Informações Eclesiásticas');
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

  drawSectionTitle(ctx, 'Informações de Recebimento');
  drawCheckboxGroup(ctx, 'Membro infantil (criança / sem profissão de fé)', ['Sim', 'Não'], 2);
  drawCheckboxGroup(
    ctx,
    'Tipo de recebimento',
    [
      'Batismo',
      'Transferência',
      'Reconciliação',
      'Profissão de fé',
      'Batismo infantil',
      'Apresentação (sem batismo)',
      'Outro',
    ],
    2
  );
  drawFieldRow(ctx, [
    { label: 'Data de recebimento (DD/MM/AAAA)', flex: 1 },
    { label: 'Congregação', flex: 1 },
  ]);
  drawTextAreaLines(ctx, 'Grupos / Ministérios de interesse', 2);

  endPdfResponse(ctx);
}
