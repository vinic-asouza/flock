import { Response } from 'express';
import {
  beginPdfResponse,
  drawBarList,
  drawDivider,
  drawKpiRow,
  drawSectionTitle,
  endPdfResponse,
  ensureSpace,
} from './index';
import { PdfColor, PdfFont, PdfType } from './tokens';

export function renderDashboardPdf(
  res: Response,
  options: {
    filename: string;
    churchName: string;
    reportTitle: string;
    reportSubtitle: string;
    reportsData: any;
    groupsByType?: Record<string, Array<{ name: string; count: number }>>;
    hideCongregations?: boolean;
  }
): void {
  const { reportsData } = options;
  const summary = reportsData?.summary || {};
  const demographics = reportsData?.demographics || {};
  const timeline = reportsData?.timeline || {};
  const currentYear = new Date().getFullYear();

  const ctx = beginPdfResponse(res, options.filename, {
    orientation: 'portrait',
    churchName: options.churchName,
    title: options.reportTitle,
    subtitle: options.reportSubtitle,
  });

  drawSectionTitle(ctx, 'Resumo Geral');
  drawKpiRow(ctx, [
    { label: 'Total de membros', value: String(summary.totalMembers ?? 0) },
    { label: 'Ativos', value: String(summary.activeMembers ?? 0) },
    { label: 'Inativos', value: String(summary.inactiveMembers ?? 0) },
    {
      label: '% ativos',
      value: `${Number(summary.activePercentage ?? 0).toFixed(0)}%`,
    },
  ]);

  drawSectionTitle(ctx, `Estatísticas de ${currentYear}`);
  drawKpiRow(ctx, [
    {
      label: 'Batismos no ano',
      value: String(timeline.baptismsByYear?.[currentYear] ?? 0),
    },
    {
      label: 'Recebimentos no ano',
      value: String(timeline.admissionsByYear?.[currentYear] ?? 0),
    },
  ]);

  const toBarRows = (obj: Record<string, number> | undefined) =>
    Object.entries(obj || {}).map(([label, count]) => ({
      label,
      count: Number(count) || 0,
    }));

  drawSectionTitle(ctx, 'Distribuição por Gênero');
  drawBarList(ctx, toBarRows(demographics.gender));

  drawSectionTitle(ctx, 'Estado Civil');
  drawBarList(ctx, toBarRows(demographics.maritalStatus));

  drawSectionTitle(ctx, 'Faixa Etária');
  const ageOrder = ['0-12', '13-17', '18-25', '26-35', '36-50', '51-64', '65+'];
  const ageRows = ageOrder
    .filter((k) => demographics.ageRanges?.[k] !== undefined)
    .map((k) => ({ label: k, count: Number(demographics.ageRanges[k]) || 0 }));
  drawBarList(ctx, ageRows.length ? ageRows : toBarRows(demographics.ageRanges));

  if (!options.hideCongregations && reportsData?.churchStructure?.congregations) {
    drawSectionTitle(ctx, 'Congregações');
    const congRows = Object.entries(reportsData.churchStructure.congregations).map(
      ([label, data]: [string, any]) => ({
        label,
        count: Number(data?.count ?? data ?? 0) || 0,
      })
    );
    drawBarList(ctx, congRows);
  }

  drawSectionTitle(ctx, 'Cidades (Top 10)');
  drawBarList(ctx, toBarRows(demographics.cities), { maxBars: 10 });

  drawSectionTitle(ctx, 'Estados');
  drawBarList(ctx, toBarRows(demographics.states));

  drawSectionTitle(ctx, 'Ocupações (Top 10)');
  const occupations = Array.isArray(reportsData?.topOccupations)
    ? reportsData.topOccupations.map((o: any) => ({
        label: o.occupation || '—',
        count: Number(o.count) || 0,
      }))
    : [];
  drawBarList(ctx, occupations, { maxBars: 10 });

  if (reportsData?.integration?.totals) {
    drawSectionTitle(ctx, 'Integração');
    const tot = reportsData.integration.totals;
    drawKpiRow(ctx, [
      { label: 'Em progresso', value: String(tot.em_progresso ?? tot.inProgress ?? 0) },
      { label: 'Integrados', value: String(tot.integrado ?? tot.integrated ?? 0) },
      { label: 'Descartados', value: String(tot.descartado ?? tot.discarded ?? 0) },
    ]);
  }

  if (options.groupsByType && Object.keys(options.groupsByType).length > 0) {
    drawSectionTitle(ctx, 'Grupos / Ministérios');
    Object.entries(options.groupsByType).forEach(([type, groups]) => {
      ensureSpace(ctx, 24);
      ctx.doc
        .font(PdfFont.bold)
        .fontSize(PdfType.value)
        .fillColor(PdfColor.accent)
        .text(type, ctx.left, ctx.doc.y);
      ctx.doc.moveDown(0.2);
      drawBarList(
        ctx,
        groups.map((g) => ({ label: g.name, count: g.count })),
        { maxBars: 20 }
      );
      drawDivider(ctx);
    });
  }

  endPdfResponse(ctx);
}
