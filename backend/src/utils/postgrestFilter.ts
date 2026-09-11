/**
 * Sanitize values used in PostgREST `or` / `ilike` filters.
 * Commas and parentheses split OR clauses; `%` and `_` are LIKE wildcards.
 */
export function sanitizePostgrestOrValue(raw: string): string {
  return raw.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function toIlikeContains(raw: string): string | null {
  const sanitized = sanitizePostgrestOrValue(raw);
  if (!sanitized) {
    return null;
  }
  return `%${escapeIlikePattern(sanitized)}%`;
}

function quotePostgrestValue(value: string): string {
  return `"${value.replace(/"/g, '')}"`;
}

/** `col.ilike."%term%",col2.ilike."%term%"` — null when the term is unusable. */
export function buildIlikeContainsOrFilter(columns: string[], raw: string): string | null {
  const pattern = toIlikeContains(raw);
  if (!pattern || columns.length === 0) {
    return null;
  }
  const quoted = quotePostgrestValue(pattern);
  return columns.map((column) => `${column}.ilike.${quoted}`).join(',');
}
