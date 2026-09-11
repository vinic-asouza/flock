/** Extrai YYYY-MM-DD de DATE/ISO sem deslocar fuso. */
export function toDateInputValue(value?: string | Date | null): string {
  if (!value) return '';
  const raw = typeof value === 'string' ? value : value.toISOString();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

export function formatDateOnly(value?: string | Date | null): string {
  const iso = toDateInputValue(value);
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

export function formatClassPeriod(
  start?: string | Date | null,
  end?: string | Date | null
): string {
  const startLabel = formatDateOnly(start);
  if (!startLabel) return '';
  const endLabel = formatDateOnly(end);
  return endLabel ? `${startLabel} – ${endLabel}` : startLabel;
}
