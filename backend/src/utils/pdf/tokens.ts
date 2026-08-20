/** Design tokens — Flock Print (PDFKit) */

export const PdfColor = {
  ink: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  surface: '#F8FAFC',
  zebra: '#F9FAFB',
  accent: '#1E3A5F',
  accentSoft: '#E8EEF5',
  white: '#FFFFFF',
  success: '#059669',
  inactive: '#6B7280',
  danger: '#B91C1C',
  info: '#2563EB',
} as const;

export const PdfType = {
  churchName: 14,
  docTitle: 12,
  heroName: 16,
  section: 11,
  label: 8,
  value: 9.5,
  tableHead: 8,
  tableCell: 8,
  footer: 8,
  meta: 8.5,
  kpiValue: 16,
  kpiLabel: 8,
} as const;

export const PdfSpace = {
  marginPortrait: 40,
  marginLandscape: 34,
  headerBar: 3,
  sectionGap: 14,
  rowGap: 5,
  cellPadX: 5,
  cellPadY: 4,
  footerReserve: 28,
  headerBlock: 72,
} as const;

export const PdfFont = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
} as const;
