import { PdfContext, PdfDoc, ensureSpace } from './document';
import { PdfColor, PdfFont, PdfSpace, PdfType } from './tokens';

export interface PdfTableColumn {
  key: string;
  label: string;
  /** Relative weight; default 1 */
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface DrawTableOptions {
  columns: PdfTableColumn[];
  rows: Array<Record<string, string>>;
  repeatHeader?: boolean;
}

function truncateToWidth(doc: PdfDoc, text: string, width: number): string {
  const value = text || '—';
  if (doc.widthOfString(value) <= width) return value;
  let truncated = value;
  while (truncated.length > 1 && doc.widthOfString(`${truncated}…`) > width) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

export function drawTable(ctx: PdfContext, options: DrawTableOptions): void {
  const { doc, left, contentWidth, pageBottom, top } = ctx;
  const { columns, rows } = options;
  const repeatHeader = options.repeatHeader !== false;

  const totalWeight = columns.reduce((sum, col) => sum + (col.width ?? 1), 0);
  const widths = columns.map((col) => ((col.width ?? 1) / totalWeight) * contentWidth);
  const headerH = 22;
  const minRowH = 18;

  const drawHeader = (y: number): number => {
    let x = left;
    columns.forEach((col, i) => {
      const w = widths[i];
      doc.rect(x, y, w, headerH).fill(PdfColor.accent);
      doc
        .font(PdfFont.bold)
        .fontSize(PdfType.tableHead)
        .fillColor(PdfColor.white)
        .text(col.label, x + PdfSpace.cellPadX, y + 6, {
          width: w - PdfSpace.cellPadX * 2,
          align: col.align ?? 'left',
          lineBreak: false,
        });
      x += w;
    });
    doc.fillColor(PdfColor.ink);
    return y + headerH;
  };

  ensureSpace(ctx, headerH + minRowH + 8);
  let y = drawHeader(doc.y);

  rows.forEach((row, rowIndex) => {
    doc.font(PdfFont.regular).fontSize(PdfType.tableCell);
    const cellTexts = columns.map((col, i) => {
      const raw = row[col.key] ?? '—';
      const w = widths[i] - PdfSpace.cellPadX * 2;
      return truncateToWidth(doc, raw, w);
    });

    const heights = cellTexts.map((text, i) =>
      doc.heightOfString(text, {
        width: widths[i] - PdfSpace.cellPadX * 2,
      })
    );
    const rowH = Math.max(minRowH, Math.max(...heights) + PdfSpace.cellPadY * 2);

    if (y + rowH > pageBottom) {
      doc.addPage();
      doc.y = top;
      y = repeatHeader ? drawHeader(top) : top;
    }

    let x = left;
    const bg = rowIndex % 2 === 0 ? PdfColor.white : PdfColor.zebra;
    columns.forEach((col, i) => {
      const w = widths[i];
      doc.rect(x, y, w, rowH).fill(bg);
      doc
        .strokeColor(PdfColor.border)
        .lineWidth(0.4)
        .rect(x, y, w, rowH)
        .stroke();

      doc
        .font(PdfFont.regular)
        .fontSize(PdfType.tableCell)
        .fillColor(PdfColor.ink)
        .text(cellTexts[i], x + PdfSpace.cellPadX, y + PdfSpace.cellPadY, {
          width: w - PdfSpace.cellPadX * 2,
          height: rowH - PdfSpace.cellPadY * 2,
          align: col.align ?? 'left',
          lineBreak: false,
          ellipsis: true,
        });
      x += w;
    });

    y += rowH;
    doc.y = y;
  });

  doc.fillColor(PdfColor.ink);
}
