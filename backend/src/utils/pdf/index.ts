import { Response } from 'express';
import { CreatePdfOptions, PdfContext, createPdfDoc } from './document';
import { drawDocumentFooters, drawDocumentHeader } from './sections';

export function beginPdfResponse(
  res: Response,
  filename: string,
  options: CreatePdfOptions
): PdfContext {
  const ctx = createPdfDoc(options);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  ctx.doc.pipe(res);
  ctx.doc.on('error', (err) => {
    console.error('Erro no stream do PDF:', err);
  });

  drawDocumentHeader(ctx);
  return ctx;
}

export function endPdfResponse(ctx: PdfContext): void {
  drawDocumentFooters(ctx);
  ctx.doc.end();
}

export * from './tokens';
export * from './document';
export * from './sections';
export * from './table';
export * from './formFields';
