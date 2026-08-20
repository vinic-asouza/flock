import { PdfContext, ensureSpace, formatGeneratedAt } from './document';
import { PdfColor, PdfFont, PdfSpace, PdfType } from './tokens';

export function drawDocumentHeader(ctx: PdfContext): void {
  const { doc, left, contentWidth, top } = ctx;

  doc.y = top;

  // Accent bar
  doc
    .save()
    .rect(0, 0, doc.page.width, PdfSpace.headerBar)
    .fill(PdfColor.accent)
    .restore();

  doc.y = top + 6;

  doc
    .font(PdfFont.bold)
    .fontSize(PdfType.churchName)
    .fillColor(PdfColor.accent)
    .text(ctx.churchName, left, doc.y, { width: contentWidth, align: 'left' });

  doc.moveDown(0.25);

  doc
    .font(PdfFont.bold)
    .fontSize(PdfType.docTitle)
    .fillColor(PdfColor.ink)
    .text(ctx.title, left, doc.y, { width: contentWidth, align: 'left' });

  if (ctx.subtitle) {
    doc.moveDown(0.15);
    doc
      .font(PdfFont.regular)
      .fontSize(PdfType.meta)
      .fillColor(PdfColor.muted)
      .text(ctx.subtitle, left, doc.y, { width: contentWidth, align: 'left' });
  }

  const meta = [formatGeneratedAt(ctx.generatedAt), ...ctx.metaLines].filter(Boolean);
  if (meta.length) {
    doc.moveDown(0.2);
    doc
      .font(PdfFont.regular)
      .fontSize(PdfType.meta)
      .fillColor(PdfColor.muted)
      .text(meta.join('  ·  '), left, doc.y, { width: contentWidth, align: 'left' });
  }

  doc.moveDown(0.45);
  const lineY = doc.y;
  doc
    .strokeColor(PdfColor.border)
    .lineWidth(1)
    .moveTo(left, lineY)
    .lineTo(left + contentWidth, lineY)
    .stroke();
  doc.y = lineY + 12;
  doc.fillColor(PdfColor.ink);
}

export function drawDocumentFooters(ctx: PdfContext): void {
  const { doc, left, contentWidth } = ctx;
  const range = doc.bufferedPageRange();
  const total = range.count;
  const generated = formatGeneratedAt(ctx.generatedAt);

  for (let i = 0; i < total; i += 1) {
    doc.switchToPage(range.start + i);

    // Zero margins while drawing footer so PDFKit does not auto-add blank pages
    // when text is painted in the reserved footer band.
    const savedMargins = { ...doc.page.margins };
    doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

    const footerY = doc.page.height - 20;
    const lineY = footerY - 8;

    doc
      .strokeColor(PdfColor.border)
      .lineWidth(0.6)
      .moveTo(left, lineY)
      .lineTo(left + contentWidth, lineY)
      .stroke();

    doc
      .font(PdfFont.regular)
      .fontSize(PdfType.footer)
      .fillColor(PdfColor.muted)
      .text(`${generated}  ·  Flock`, left, footerY, {
        width: contentWidth * 0.65,
        align: 'left',
        lineBreak: false,
      });

    doc.text(`Página ${i + 1} de ${total}`, left + contentWidth * 0.65, footerY, {
      width: contentWidth * 0.35,
      align: 'right',
      lineBreak: false,
    });

    doc.page.margins = savedMargins;
  }

  doc.fillColor(PdfColor.ink);
}

export function drawSectionTitle(ctx: PdfContext, title: string): void {
  ensureSpace(ctx, 36);
  const { doc, left, contentWidth } = ctx;

  doc.moveDown(0.35);
  doc
    .font(PdfFont.bold)
    .fontSize(PdfType.section)
    .fillColor(PdfColor.ink)
    .text(title, left, doc.y, { width: contentWidth });

  const y = doc.y + 2;
  doc
    .strokeColor(PdfColor.accent)
    .lineWidth(1.5)
    .moveTo(left, y)
    .lineTo(left + Math.min(120, contentWidth * 0.35), y)
    .stroke();

  doc
    .strokeColor(PdfColor.border)
    .lineWidth(0.5)
    .moveTo(left + Math.min(120, contentWidth * 0.35) + 4, y)
    .lineTo(left + contentWidth, y)
    .stroke();

  doc.y = y + 10;
  doc.fillColor(PdfColor.ink);
}

export function drawDivider(ctx: PdfContext): void {
  ensureSpace(ctx, 12);
  const { doc, left, contentWidth } = ctx;
  const y = doc.y + 2;
  doc
    .strokeColor(PdfColor.border)
    .lineWidth(0.7)
    .moveTo(left, y)
    .lineTo(left + contentWidth, y)
    .stroke();
  doc.y = y + 10;
}

export type BadgeTone = 'success' | 'muted' | 'info' | 'danger' | 'accent';

const badgeColors: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: '#ECFDF5', fg: PdfColor.success },
  muted: { bg: '#F3F4F6', fg: PdfColor.muted },
  info: { bg: '#EFF6FF', fg: PdfColor.info },
  danger: { bg: '#FEF2F2', fg: PdfColor.danger },
  accent: { bg: PdfColor.accentSoft, fg: PdfColor.accent },
};

export function drawStatusBadge(
  ctx: PdfContext,
  label: string,
  tone: BadgeTone = 'muted',
  opts?: { align?: 'left' | 'center' }
): void {
  ensureSpace(ctx, 22);
  const { doc, left, contentWidth } = ctx;
  const colors = badgeColors[tone];
  const padX = 10;
  const padY = 4;
  doc.font(PdfFont.bold).fontSize(8);
  const textW = doc.widthOfString(label.toUpperCase());
  const boxW = textW + padX * 2;
  const boxH = 16;
  const align = opts?.align ?? 'left';
  const x =
    align === 'center' ? left + (contentWidth - boxW) / 2 : left;
  const y = doc.y;

  doc
    .roundedRect(x, y, boxW, boxH, 3)
    .fill(colors.bg);

  doc
    .fillColor(colors.fg)
    .text(label.toUpperCase(), x + padX, y + padY, {
      width: textW + 2,
      lineBreak: false,
    });

  doc.y = y + boxH + 8;
  doc.fillColor(PdfColor.ink);
}

export function drawHeroName(ctx: PdfContext, name: string): void {
  ensureSpace(ctx, 28);
  const { doc, left, contentWidth } = ctx;
  doc
    .font(PdfFont.bold)
    .fontSize(PdfType.heroName)
    .fillColor(PdfColor.ink)
    .text(name.toUpperCase(), left, doc.y, {
      width: contentWidth,
      align: 'center',
    });
  doc.moveDown(0.5);
}

export interface KeyValuePair {
  label: string;
  value: string;
  fullWidth?: boolean;
}

export function drawKeyValueGrid(
  ctx: PdfContext,
  pairs: KeyValuePair[],
  opts?: { columns?: 1 | 2 }
): void {
  const columns = opts?.columns ?? 2;
  const { doc, left, contentWidth } = ctx;
  const gutter = 14;
  const colWidth = columns === 1 ? contentWidth : (contentWidth - gutter) / 2;

  const items = pairs.filter((p) => p.value && p.value !== '');
  let index = 0;

  while (index < items.length) {
    const remaining = items.slice(index);
    const rowItems: KeyValuePair[] = [];

    if (remaining[0]?.fullWidth || columns === 1) {
      rowItems.push(remaining[0]);
      index += 1;
    } else if (remaining[1] && !remaining[1].fullWidth) {
      rowItems.push(remaining[0], remaining[1]);
      index += 2;
    } else {
      rowItems.push(remaining[0]);
      index += 1;
    }

    const heights = rowItems.map((item) => {
      doc.font(PdfFont.bold).fontSize(PdfType.label);
      const labelH = doc.heightOfString(item.label, { width: colWidth });
      doc.font(PdfFont.regular).fontSize(PdfType.value);
      const valueH = doc.heightOfString(item.value || '—', {
        width: rowItems.length === 1 && item.fullWidth ? contentWidth : colWidth,
      });
      return labelH + valueH + 6;
    });
    const rowH = Math.max(...heights, 28);
    ensureSpace(ctx, rowH + 4);

    const startY = doc.y;
    rowItems.forEach((item, i) => {
      const width =
        rowItems.length === 1 && (item.fullWidth || columns === 1)
          ? contentWidth
          : colWidth;
      const x = left + i * (colWidth + gutter);

      doc
        .font(PdfFont.bold)
        .fontSize(PdfType.label)
        .fillColor(PdfColor.muted)
        .text(item.label, x, startY, {
          width,
          height: PdfType.label + 2,
          lineBreak: false,
          ellipsis: true,
        });

      const valueY = startY + PdfType.label + 3;
      doc
        .font(PdfFont.regular)
        .fontSize(PdfType.value)
        .fillColor(PdfColor.ink)
        .text(item.value || '—', x, valueY, {
          width,
          height: Math.max(12, rowH - (PdfType.label + 6)),
          ellipsis: true,
        });
    });

    doc.y = startY + rowH;
  }
}

export function drawBulletList(
  ctx: PdfContext,
  lines: string[],
  label?: string
): void {
  if (!lines.length) return;
  const { doc, left, contentWidth } = ctx;

  if (label) {
    ensureSpace(ctx, 18);
    doc
      .font(PdfFont.bold)
      .fontSize(PdfType.label)
      .fillColor(PdfColor.muted)
      .text(label, left, doc.y, { width: contentWidth });
    doc.moveDown(0.2);
  }

  lines.forEach((line) => {
    ensureSpace(ctx, 16);
    doc
      .font(PdfFont.regular)
      .fontSize(PdfType.value)
      .fillColor(PdfColor.ink)
      .text(`•  ${line}`, left, doc.y, { width: contentWidth });
    doc.moveDown(0.15);
  });
}

export function drawChipRow(ctx: PdfContext, chips: string[]): void {
  if (!chips.length) return;
  ensureSpace(ctx, 28);
  const { doc, left, contentWidth } = ctx;
  let x = left;
  let y = doc.y;
  const maxX = left + contentWidth;
  const chipH = 16;
  const gap = 6;

  chips.forEach((chip) => {
    doc.font(PdfFont.regular).fontSize(8);
    const tw = doc.widthOfString(chip);
    const bw = tw + 12;
    if (x + bw > maxX) {
      x = left;
      y += chipH + gap;
      ensureSpace(ctx, chipH + gap + 8);
      if (doc.y > y) y = doc.y;
    }
    doc
      .roundedRect(x, y, bw, chipH, 3)
      .fillAndStroke(PdfColor.accentSoft, PdfColor.border);
    doc
      .fillColor(PdfColor.accent)
      .text(chip, x + 6, y + 4, { lineBreak: false });
    x += bw + gap;
  });

  doc.y = y + chipH + 10;
  doc.fillColor(PdfColor.ink);
}

export interface KpiItem {
  label: string;
  value: string;
  tone?: BadgeTone;
}

export function drawKpiRow(ctx: PdfContext, items: KpiItem[]): void {
  if (!items.length) return;
  const { doc, left, contentWidth } = ctx;
  const gap = 8;
  const cardW = (contentWidth - gap * (items.length - 1)) / items.length;
  const cardH = 48;
  ensureSpace(ctx, cardH + 12);
  const y = doc.y;

  items.forEach((item, i) => {
    const x = left + i * (cardW + gap);
    doc
      .roundedRect(x, y, cardW, cardH, 4)
      .fillAndStroke(PdfColor.surface, PdfColor.border);

    doc
      .font(PdfFont.regular)
      .fontSize(PdfType.kpiLabel)
      .fillColor(PdfColor.muted)
      .text(item.label, x + 8, y + 8, { width: cardW - 16 });

    doc
      .font(PdfFont.bold)
      .fontSize(PdfType.kpiValue)
      .fillColor(PdfColor.ink)
      .text(item.value, x + 8, y + 22, { width: cardW - 16 });
  });

  doc.y = y + cardH + 14;
  doc.fillColor(PdfColor.ink);
}

export function drawBarList(
  ctx: PdfContext,
  rows: Array<{ label: string; count: number }>,
  opts?: { maxBars?: number }
): void {
  const maxBars = opts?.maxBars ?? 12;
  const sorted = [...rows].sort((a, b) => b.count - a.count).slice(0, maxBars);
  if (!sorted.length) {
    ensureSpace(ctx, 16);
    ctx.doc
      .font(PdfFont.regular)
      .fontSize(PdfType.meta)
      .fillColor(PdfColor.muted)
      .text('Nenhum dado disponível', ctx.left, ctx.doc.y);
    ctx.doc.moveDown(0.4);
    ctx.doc.fillColor(PdfColor.ink);
    return;
  }

  const max = Math.max(...sorted.map((r) => r.count), 1);
  const { doc, left, contentWidth } = ctx;
  const labelW = Math.min(160, contentWidth * 0.32);
  const countW = 36;
  const barMax = contentWidth - labelW - countW - 12;

  sorted.forEach((row) => {
    ensureSpace(ctx, 16);
    const y = doc.y;
    doc
      .font(PdfFont.regular)
      .fontSize(PdfType.value)
      .fillColor(PdfColor.ink)
      .text(row.label, left, y, { width: labelW, lineBreak: false });

    const barW = Math.max(4, (row.count / max) * barMax);
    doc
      .roundedRect(left + labelW + 4, y + 2, barW, 9, 2)
      .fill(PdfColor.accentSoft);
    doc
      .roundedRect(left + labelW + 4, y + 2, barW, 9, 2)
      .stroke(PdfColor.border);

    doc
      .font(PdfFont.bold)
      .fontSize(PdfType.value)
      .fillColor(PdfColor.ink)
      .text(String(row.count), left + labelW + 8 + barMax, y, {
        width: countW,
        align: 'right',
        lineBreak: false,
      });

    doc.y = y + 15;
  });
  doc.moveDown(0.3);
}
