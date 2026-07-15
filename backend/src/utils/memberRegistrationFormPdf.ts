import PDFDocument from 'pdfkit';

type PdfDoc = InstanceType<typeof PDFDocument>;

interface PdfHelpers {
  doc: PdfDoc;
  pageBottom: number;
  ensureSpace: (needed?: number) => void;
  writeSectionTitle: (title: string) => void;
  writeBlankField: (label: string, width?: number) => void;
  writeCheckboxGroup: (label: string, options: string[], columns?: number) => void;
  writeTextArea: (label: string, lines?: number) => void;
}

function createHelpers(doc: PdfDoc): PdfHelpers {
  const pageBottom = doc.page.height - 50;

  const ensureSpace = (needed = 40) => {
    if (doc.y + needed > pageBottom) {
      doc.addPage();
    }
  };

  const writeSectionTitle = (title: string) => {
    ensureSpace(50);
    doc.moveDown(0.4);
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(title);
    doc
      .strokeColor('#D1D5DB')
      .lineWidth(0.5)
      .moveTo(50, doc.y + 2)
      .lineTo(545, doc.y + 2)
      .stroke();
    doc.moveDown(0.6);
  };

  const writeBlankField = (label: string, width = 495) => {
    ensureSpace(28);
    const y = doc.y;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#374151')
      .text(`${label}:`, 50, y, { width: width - 50, continued: false });
    doc
      .strokeColor('#9CA3AF')
      .lineWidth(0.5)
      .moveTo(50, y + 16)
      .lineTo(50 + width, y + 16)
      .stroke();
    doc.y = y + 24;
  };

  const writeCheckboxGroup = (label: string, options: string[], columns = 2) => {
    ensureSpace(20 + Math.ceil(options.length / columns) * 16);
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#374151')
      .text(`${label}:`);
    doc.moveDown(0.2);

    const startY = doc.y;
    const colWidth = 240;
    options.forEach((option, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = 50 + col * colWidth;
      const y = startY + row * 16;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#111827')
        .text(`( ) ${option}`, x, y, { width: colWidth - 10 });
    });

    const rows = Math.ceil(options.length / columns);
    doc.y = startY + rows * 16 + 4;
  };

  const writeTextArea = (label: string, lines = 3) => {
    ensureSpace(20 + lines * 14);
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#374151')
      .text(label);
    doc.moveDown(0.2);

    for (let i = 0; i < lines; i += 1) {
      const y = doc.y;
      doc
        .strokeColor('#9CA3AF')
        .lineWidth(0.5)
        .moveTo(50, y + 10)
        .lineTo(545, y + 10)
        .stroke();
      doc.y = y + 16;
    }
    doc.moveDown(0.2);
  };

  return {
    doc,
    pageBottom,
    ensureSpace,
    writeSectionTitle,
    writeBlankField,
    writeCheckboxGroup,
    writeTextArea,
  };
}

export function renderMemberRegistrationFormPdf(doc: PdfDoc, churchName: string): void {
  const h = createHelpers(doc);

  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .fillColor('#111827')
    .text(churchName, { align: 'center' });

  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('Ficha de Cadastro de Membro', { align: 'center' })
    .moveDown(0.3);

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#6B7280')
    .text('Preencha com caneta. Os dados serão cadastrados posteriormente no sistema.', { align: 'center' })
    .moveDown(0.8);

  h.writeBlankField('Data do preenchimento', 200);
  doc.moveDown(0.2);

  // ─── Informações Básicas ───
  h.writeSectionTitle('Informações Básicas');
  h.writeBlankField('Nome completo');
  h.writeBlankField('Data de nascimento (DD/MM/AAAA)');
  h.writeBlankField('Natural de (cidade de origem)');

  h.writeCheckboxGroup('Gênero', ['Masculino', 'Feminino'], 2);
  h.writeBlankField('Profissão');

  h.writeCheckboxGroup('Estado civil', [
    'Solteiro(a)',
    'Casado(a)',
    'União estável',
    'Divorciado(a)',
    'Viúvo(a)',
    'Outro',
  ], 3);

  h.writeBlankField('Data do casamento / união (DD/MM/AAAA)');
  h.writeBlankField('Nome do cônjuge');
  h.writeCheckboxGroup('Cônjuge é membro da igreja?', ['Sim', 'Não'], 2);

  // ─── Família ───
  h.writeSectionTitle('Família');
  h.writeBlankField('Nome do pai');
  h.writeCheckboxGroup('Pai é membro da igreja?', ['Sim', 'Não', 'Falecido'], 3);
  h.writeBlankField('Nome da mãe');
  h.writeCheckboxGroup('Mãe é membro da igreja?', ['Sim', 'Não', 'Falecida'], 3);

  h.ensureSpace(90);
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#374151')
    .text('Filhos (preencha quantos forem necessários):');
  doc.moveDown(0.4);

  for (let i = 1; i <= 2; i += 1) {
    h.ensureSpace(70);
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#6B7280')
      .text(`Filho ${i}`);
    h.writeBlankField('Nome');
    h.writeBlankField('Data de nascimento (DD/MM/AAAA)');
    h.writeCheckboxGroup('Reside com você?', ['Sim', 'Não'], 2);
    doc.moveDown(0.2);
  }

  // ─── Contato e Endereço ───
  h.writeSectionTitle('Contato e Endereço');
  h.writeBlankField('E-mail');
  h.writeBlankField('Telefone');
  h.writeBlankField('WhatsApp');
  h.writeBlankField('CEP');
  h.writeBlankField('Estado');
  h.writeBlankField('Cidade');
  h.writeBlankField('Endereço');
  h.writeBlankField('Número');
  h.writeBlankField('Bairro');
  h.writeBlankField('Complemento');

  // ─── Informações Eclesiásticas ───
  h.writeSectionTitle('Informações Eclesiásticas');
  h.writeBlankField('É cristão evangélico há quantos anos?');
  h.writeCheckboxGroup('Vem de família cristã evangélica?', ['Sim', 'Não'], 2);
  h.writeCheckboxGroup('Já é batizado(a)?', ['Sim', 'Não'], 2);

  h.ensureSpace(120);
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#374151')
    .text('Se batizado(a), marque uma opção:');
  doc.moveDown(0.2);

  h.writeCheckboxGroup('', [
    'Fui batizado(a) na igreja católica',
    'Fui batizado(a) quando adulto — nesta igreja',
    'Fui batizado(a) quando adulto — em outra igreja evangélica',
    'Fui batizado(a) quando criança — nesta igreja',
    'Fui batizado(a) quando criança — em outra igreja evangélica',
    'Sou novo(a) convertido(a) — minha religião anterior era:',
    'Sou novo(a) convertido(a) — não tinha religião anterior',
  ], 1);

  h.writeBlankField('Nome da igreja em que foi batizado(a)');
  h.writeBlankField('Qual era sua religião anterior?');
  h.writeCheckboxGroup('Atualmente é ou era membro ativo da igreja anterior?', ['Sim', 'Não'], 2);

  h.writeTextArea(
    'Descreva o(s) motivo(s) de ter decidido tornar-se membro de nossa igreja',
    3
  );
  h.writeBlankField('Há quanto tempo frequenta a igreja?');
  h.writeCheckboxGroup('Frequenta nossos cultos?', ['Regularmente', 'Às vezes', 'Não'], 3);
  h.writeCheckboxGroup('Participa de alguma outra atividade semanal?', ['Sim', 'Não'], 2);
  h.writeBlankField('Quais atividades?');

  // ─── Informações de Recebimento ───
  h.writeSectionTitle('Informações de Recebimento');
  h.writeCheckboxGroup('Membro infantil (criança / sem profissão de fé)', ['Sim', 'Não'], 2);

  h.writeCheckboxGroup('Tipo de recebimento', [
    'Batismo',
    'Transferência',
    'Reconciliação',
    'Profissão de fé',
    'Batismo infantil',
    'Apresentação (sem batismo)',
    'Outro',
  ], 2);

  h.writeBlankField('Data de recebimento (DD/MM/AAAA)');
  h.writeBlankField('Congregação');
  h.writeTextArea('Grupos / Ministérios de interesse', 2);

  h.ensureSpace(40);
  doc.moveDown(0.5);
  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#9CA3AF')
    .text('Documento gerado pelo Flock — ficha em branco para cadastro presencial.', { align: 'center' });
}

export function createMemberRegistrationFormPdf(churchName: string): PdfDoc {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    autoFirstPage: true,
  });

  renderMemberRegistrationFormPdf(doc, churchName);
  return doc;
}
