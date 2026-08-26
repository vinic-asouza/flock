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
