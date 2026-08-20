import { Response } from 'express';
import {
  beginPdfResponse,
  drawDivider,
  drawSectionTitle,
  endPdfResponse,
  ensureSpace,
} from './index';
import { PdfColor, PdfFont, PdfType } from './tokens';

export interface CalendarPdfItem {
  title?: string | null;
  type?: string | null;
  start_date: Date | string;
  end_date?: Date | string | null;
  congregation?: { name?: string | null } | null;
  group?: { name?: string | null } | null;
  responsible_member?: { name?: string | null } | null;
  location?: string | null;
  description?: string | null;
  is_recurring?: boolean;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function renderCalendarMonthPdf(
  res: Response,
  options: {
    churchName: string;
    month?: number;
    year: number;
    items: CalendarPdfItem[];
    filterSummary?: string;
    /** When true, export covers the full year (Listas tab). */
    period?: 'month' | 'year';
  }
): void {
  const period = options.period ?? 'month';
  const isYear = period === 'year';
  const filename = isYear
    ? `calendario-${options.year}.pdf`
    : `calendario-${options.year}-${String(options.month).padStart(2, '0')}.pdf`;
  const title = isYear
    ? `Calendário — ${options.year}`
    : `Calendário — ${String(options.month).padStart(2, '0')}/${options.year}`;

  const ctx = beginPdfResponse(res, filename, {
    orientation: 'landscape',
    churchName: options.churchName,
    title,
    subtitle: options.filterSummary,
    metaLines: [`Total de ocorrências: ${options.items.length}`],
  });

  if (!options.items.length) {
    ensureSpace(ctx, 40);
    ctx.doc
      .font(PdfFont.regular)
      .fontSize(PdfType.value)
      .fillColor(PdfColor.muted)
      .text(
        'Nenhum item encontrado para o período e filtros selecionados.',
        ctx.left,
        ctx.doc.y,
        { width: ctx.contentWidth, align: 'center' }
      );
    endPdfResponse(ctx);
    return;
  }

  const grouped = new Map<string, { date: Date; items: CalendarPdfItem[] }>();
  options.items.forEach((item) => {
    const start = new Date(item.start_date);
    const key = dayKey(start);
    if (!grouped.has(key)) grouped.set(key, { date: start, items: [] });
    grouped.get(key)!.items.push(item);
  });

  const days = [...grouped.values()].sort((a, b) => a.date.getTime() - b.date.getTime());

  days.forEach((day, dayIndex) => {
    if (dayIndex > 0) {
      ctx.doc.moveDown(0.85);
    }

    drawSectionTitle(ctx, dayLabel(day.date));
    ctx.doc.moveDown(0.15);

    day.items.forEach((item, index) => {
      ensureSpace(ctx, 48);
      const start = new Date(item.start_date);
      const end = item.end_date ? new Date(item.end_date) : null;
      const startTime = start.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const endTime = end
        ? end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : null;

      const timeLabel = endTime ? `${startTime} – ${endTime}` : startTime;
      const startY = ctx.doc.y;

      ctx.doc
        .font(PdfFont.bold)
        .fontSize(PdfType.value)
        .fillColor(PdfColor.accent)
        .text(timeLabel, ctx.left, startY, {
          width: 72,
          lineBreak: false,
        });

      ctx.doc
        .font(PdfFont.bold)
        .fontSize(PdfType.value)
        .fillColor(PdfColor.ink)
        .text(item.title || '(Sem título)', ctx.left + 78, startY, {
          width: ctx.contentWidth - 78,
        });

      const meta = [
        item.type ? `Tipo: ${item.type}` : null,
        item.congregation?.name ? `Congregação: ${item.congregation.name}` : null,
        item.group?.name ? `Grupo: ${item.group.name}` : null,
        item.responsible_member?.name
          ? `Responsável: ${item.responsible_member.name}`
          : null,
        item.location ? `Local: ${item.location}` : null,
        item.is_recurring ? 'Recorrente' : null,
      ]
        .filter(Boolean)
        .join('  ·  ');

      if (meta) {
        ctx.doc
          .font(PdfFont.regular)
          .fontSize(PdfType.meta)
          .fillColor(PdfColor.muted)
          .text(meta, ctx.left + 78, ctx.doc.y, { width: ctx.contentWidth - 78 });
      }

      if (item.description) {
        ctx.doc
          .font(PdfFont.regular)
          .fontSize(PdfType.meta)
          .fillColor(PdfColor.ink)
          .text(item.description, ctx.left + 78, ctx.doc.y, {
            width: ctx.contentWidth - 78,
          });
      }

      ctx.doc.moveDown(0.45);
      if (index < day.items.length - 1) {
        drawDivider(ctx);
        ctx.doc.moveDown(0.2);
      }
    });
  });

  endPdfResponse(ctx);
}
