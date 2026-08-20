import { PdfContext, ensureSpace } from './document';
import { PdfColor, PdfFont, PdfType } from './tokens';

export function drawUnderlineField(
  ctx: PdfContext,
  label: string,
  opts?: { width?: number }
): void {
  ensureSpace(ctx, 28);
  const { doc, left, contentWidth } = ctx;
  const width = opts?.width ?? contentWidth;
  const y = doc.y;

  doc
    .font(PdfFont.bold)
    .fontSize(PdfType.label)
    .fillColor(PdfColor.muted)
    .text(label, left, y, { width });

  const lineY = y + 16;
  doc
    .strokeColor('#9CA3AF')
    .lineWidth(0.6)
    .moveTo(left, lineY)
    .lineTo(left + width, lineY)
    .stroke();

  doc.y = lineY + 10;
  doc.fillColor(PdfColor.ink);
}

export function drawCheckboxGroup(
  ctx: PdfContext,
  label: string | undefined,
  options: string[],
  columns = 2
): void {
  const { doc, left, contentWidth } = ctx;
  const rows = Math.ceil(options.length / columns);
  ensureSpace(ctx, (label ? 16 : 0) + rows * 16 + 8);

  if (label) {
    doc
      .font(PdfFont.bold)
      .fontSize(PdfType.label)
      .fillColor(PdfColor.muted)
      .text(label, left, doc.y, { width: contentWidth });
    doc.moveDown(0.25);
  }

  const startY = doc.y;
  const colWidth = contentWidth / columns;

  options.forEach((option, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = left + col * colWidth;
    const y = startY + row * 16;

    doc
      .rect(x, y + 1, 9, 9)
      .strokeColor(PdfColor.muted)
      .lineWidth(0.8)
      .stroke();

    doc
      .font(PdfFont.regular)
      .fontSize(9)
      .fillColor(PdfColor.ink)
      .text(option, x + 14, y, { width: colWidth - 18 });
  });

  doc.y = startY + rows * 16 + 6;
}

export function drawTextAreaLines(
  ctx: PdfContext,
  label: string,
  lines = 3
): void {
  ensureSpace(ctx, 18 + lines * 16);
  const { doc, left, contentWidth } = ctx;

  doc
    .font(PdfFont.bold)
    .fontSize(PdfType.label)
    .fillColor(PdfColor.muted)
    .text(label, left, doc.y, { width: contentWidth });
  doc.moveDown(0.25);

  for (let i = 0; i < lines; i += 1) {
    const y = doc.y;
    doc
      .strokeColor('#9CA3AF')
      .lineWidth(0.5)
      .moveTo(left, y + 12)
      .lineTo(left + contentWidth, y + 12)
      .stroke();
    doc.y = y + 16;
  }
  doc.moveDown(0.2);
  doc.fillColor(PdfColor.ink);
}

export function drawFieldRow(
  ctx: PdfContext,
  fields: Array<{ label: string; flex?: number }>
): void {
  const { doc, left, contentWidth } = ctx;
  ensureSpace(ctx, 30);
  const totalFlex = fields.reduce((s, f) => s + (f.flex ?? 1), 0);
  const gutter = 12;
  const usable = contentWidth - gutter * (fields.length - 1);
  let x = left;
  const y = doc.y;

  fields.forEach((field, i) => {
    const w = (usable * (field.flex ?? 1)) / totalFlex;
    doc
      .font(PdfFont.bold)
      .fontSize(PdfType.label)
      .fillColor(PdfColor.muted)
      .text(field.label, x, y, { width: w });
    doc
      .strokeColor('#9CA3AF')
      .lineWidth(0.6)
      .moveTo(x, y + 16)
      .lineTo(x + w, y + 16)
      .stroke();
    x += w + (i < fields.length - 1 ? gutter : 0);
  });

  doc.y = y + 26;
  doc.fillColor(PdfColor.ink);
}
