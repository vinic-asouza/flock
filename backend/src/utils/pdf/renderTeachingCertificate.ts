import { Response } from 'express';
import PDFDocument from 'pdfkit';
import {
  formatCertificateIssueDate,
  slugifyForFilename,
} from '../../services/teachingCertificateService';
import { PdfFont } from './tokens';

export type CertificateStudent = {
  display_name: string;
};

export type TeachingCertificatePdfInput = {
  churchName: string;
  programName: string;
  className: string;
  issuedAt?: Date;
  primaryColor: string;
  secondaryColor: string;
  churchLogo: Buffer;
  extraLogos?: Buffer[];
  students: CertificateStudent[];
};

function drawFittedImage(
  doc: InstanceType<typeof PDFDocument>,
  buffer: Buffer,
  x: number,
  y: number,
  maxW: number,
  maxH: number
) {
  try {
    doc.image(buffer, x, y, { fit: [maxW, maxH], align: 'center', valign: 'center' });
  } catch {
    // ignore invalid embedded image for a single slot
  }
}

function drawCertificatePage(
  doc: InstanceType<typeof PDFDocument>,
  input: TeachingCertificatePdfInput,
  student: CertificateStudent,
  issuedLabel: string
) {
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const margin = 36;
  const primary = input.primaryColor;
  const secondary = input.secondaryColor;

  // Outer frame
  doc
    .lineWidth(3)
    .strokeColor(primary)
    .rect(margin, margin, pageW - margin * 2, pageH - margin * 2)
    .stroke();

  doc
    .lineWidth(1)
    .strokeColor(secondary)
    .rect(margin + 10, margin + 10, pageW - margin * 2 - 20, pageH - margin * 2 - 20)
    .stroke();

  // Top accent bar
  doc
    .save()
    .rect(margin + 18, margin + 18, pageW - margin * 2 - 36, 8)
    .fill(primary)
    .restore();

  const logoY = margin + 40;
  const logoMaxH = 56;
  const logoMaxW = 120;
  const centerX = pageW / 2;

  drawFittedImage(doc, input.churchLogo, centerX - logoMaxW / 2, logoY, logoMaxW, logoMaxH);

  const extras = (input.extraLogos || []).slice(0, 2);
  if (extras[0]) {
    drawFittedImage(doc, extras[0], margin + 40, logoY + 4, 72, 48);
  }
  if (extras[1]) {
    drawFittedImage(doc, extras[1], pageW - margin - 112, logoY + 4, 72, 48);
  }

  let y = logoY + logoMaxH + 28;

  doc
    .font(PdfFont.bold)
    .fontSize(22)
    .fillColor(primary)
    .text('CERTIFICADO', margin + 40, y, {
      width: pageW - margin * 2 - 80,
      align: 'center',
    });

  y = doc.y + 18;

  doc
    .font(PdfFont.regular)
    .fontSize(12)
    .fillColor('#374151')
    .text('Certificamos que', margin + 40, y, {
      width: pageW - margin * 2 - 80,
      align: 'center',
    });

  y = doc.y + 10;

  doc
    .font(PdfFont.bold)
    .fontSize(20)
    .fillColor('#111827')
    .text(student.display_name.trim(), margin + 40, y, {
      width: pageW - margin * 2 - 80,
      align: 'center',
    });

  y = doc.y + 14;

  doc
    .font(PdfFont.regular)
    .fontSize(12)
    .fillColor('#374151')
    .text('concluiu com êxito a turma', margin + 40, y, {
      width: pageW - margin * 2 - 80,
      align: 'center',
    });

  y = doc.y + 8;

  doc
    .font(PdfFont.bold)
    .fontSize(14)
    .fillColor(primary)
    .text(input.className.trim(), margin + 40, y, {
      width: pageW - margin * 2 - 80,
      align: 'center',
    });

  y = doc.y + 4;

  doc
    .font(PdfFont.regular)
    .fontSize(11)
    .fillColor('#6B7280')
    .text(`Programa: ${input.programName.trim()}`, margin + 40, y, {
      width: pageW - margin * 2 - 80,
      align: 'center',
    });

  y = pageH - margin - 70;

  doc
    .moveTo(centerX - 140, y)
    .lineTo(centerX + 140, y)
    .strokeColor(secondary)
    .lineWidth(1)
    .stroke();

  y += 10;

  doc
    .font(PdfFont.bold)
    .fontSize(11)
    .fillColor('#111827')
    .text(input.churchName.trim(), margin + 40, y, {
      width: pageW - margin * 2 - 80,
      align: 'center',
    });

  y = doc.y + 4;

  doc
    .font(PdfFont.regular)
    .fontSize(10)
    .fillColor('#6B7280')
    .text(`Emitido em ${issuedLabel}`, margin + 40, y, {
      width: pageW - margin * 2 - 80,
      align: 'center',
    });
}

export function buildCertificateFilename(className: string, issuedAt = new Date()): string {
  const date = issuedAt.toISOString().slice(0, 10);
  return `certificados-${slugifyForFilename(className)}-${date}.pdf`;
}

export function renderTeachingCertificatePdf(
  res: Response,
  input: TeachingCertificatePdfInput
): void {
  if (!input.students.length) {
    throw new Error('Nenhum aluno para gerar certificado');
  }

  const issuedAt = input.issuedAt ?? new Date();
  const issuedLabel = formatCertificateIssueDate(issuedAt);
  const filename = buildCertificateFilename(input.className, issuedAt);

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: true,
    bufferPages: false,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  doc.pipe(res);
  doc.on('error', (err) => {
    console.error('Erro no stream do PDF de certificado:', err);
  });

  input.students.forEach((student, index) => {
    if (index > 0) doc.addPage();
    drawCertificatePage(doc, input, student, issuedLabel);
  });

  doc.end();
}
