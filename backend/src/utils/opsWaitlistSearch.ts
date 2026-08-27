import { toIlikeContains } from './postgrestFilter';

function quotePostgrestValue(value: string): string {
  return `"${value.replace(/"/g, '')}"`;
}

const WAITLIST_SEARCH_COLUMNS = ['name', 'email', 'church_name'] as const;

/** Name, email and church_name ilike. Null when q has no usable term. */
export function buildWaitlistSearchOrFilter(q: string): string | null {
  const pattern = toIlikeContains(q);
  if (!pattern) {
    return null;
  }

  const quoted = quotePostgrestValue(pattern);
  return WAITLIST_SEARCH_COLUMNS.map((column) => `${column}.ilike.${quoted}`).join(',');
}
