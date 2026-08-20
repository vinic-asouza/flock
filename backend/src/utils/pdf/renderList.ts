import { Response } from 'express';
import {
  beginPdfResponse,
  drawTable,
  endPdfResponse,
  PdfTableColumn,
} from './index';

export function renderLandscapeListPdf(
  res: Response,
  options: {
    filename: string;
    churchName: string;
    title: string;
    subtitle?: string;
    metaLines?: string[];
    columns: PdfTableColumn[];
    rows: Array<Record<string, string>>;
  }
): void {
  const ctx = beginPdfResponse(res, options.filename, {
    orientation: 'landscape',
    churchName: options.churchName,
    title: options.title,
    subtitle: options.subtitle,
    metaLines: options.metaLines,
  });

  drawTable(ctx, {
    columns: options.columns,
    rows: options.rows,
    repeatHeader: true,
  });

  endPdfResponse(ctx);
}
