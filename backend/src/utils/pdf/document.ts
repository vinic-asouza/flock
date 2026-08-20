import PDFDocument from 'pdfkit';
import { PdfSpace } from './tokens';

export type PdfDoc = InstanceType<typeof PDFDocument>;

export type PdfOrientation = 'portrait' | 'landscape';

export interface PdfContext {
  doc: PdfDoc;
  orientation: PdfOrientation;
  left: number;
  right: number;
  top: number;
  bottom: number;
  contentWidth: number;
  pageBottom: number;
  churchName: string;
  title: string;
  subtitle?: string;
  generatedAt: Date;
  metaLines: string[];
}

export interface CreatePdfOptions {
  orientation?: PdfOrientation;
  churchName: string;
  title: string;
  subtitle?: string;
  metaLines?: string[];
  generatedAt?: Date;
}

export function createPdfDoc(options: CreatePdfOptions): PdfContext {
  const orientation = options.orientation ?? 'portrait';
  const margin =
    orientation === 'landscape' ? PdfSpace.marginLandscape : PdfSpace.marginPortrait;

  const doc = new PDFDocument({
    size: 'A4',
    layout: orientation,
    margins: { top: margin, bottom: margin, left: margin, right: margin },
    bufferPages: true,
    autoFirstPage: true,
  });

  const left = margin;
  const right = margin;
  const top = margin;
  const bottom = margin;
  const contentWidth = doc.page.width - left - right;
  const pageBottom = doc.page.height - bottom - PdfSpace.footerReserve;

  return {
    doc,
    orientation,
    left,
    right,
    top,
    bottom,
    contentWidth,
    pageBottom,
    churchName: options.churchName || 'Igreja',
    title: options.title,
    subtitle: options.subtitle,
    generatedAt: options.generatedAt ?? new Date(),
    metaLines: options.metaLines ?? [],
  };
}

export function contentBox(ctx: PdfContext) {
  return {
    x: ctx.left,
    width: ctx.contentWidth,
    pageBottom: ctx.pageBottom,
  };
}

export function ensureSpace(ctx: PdfContext, needed: number): void {
  if (ctx.doc.y + needed > ctx.pageBottom) {
    ctx.doc.addPage();
    ctx.doc.y = ctx.top;
  }
}

export function formatGeneratedAt(date: Date): string {
  return `Gerado em ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR')}`;
}
