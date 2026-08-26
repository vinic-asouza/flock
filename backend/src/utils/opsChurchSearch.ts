import { cleanCNPJ } from '../validators/cnpjValidator';
import { toIlikeContains } from './postgrestFilter';

function quotePostgrestValue(value: string): string {
  return `"${value.replace(/"/g, '')}"`;
}

/** Name ilike and/or CNPJ digits. Null when q has no usable term. */
export function buildChurchSearchOrFilter(q: string): string | null {
  const namePattern = toIlikeContains(q);
  const digits = cleanCNPJ(q);
  const clauses: string[] = [];

  if (namePattern) {
    clauses.push(`name.ilike.${quotePostgrestValue(namePattern)}`);
  }
  if (digits.length >= 2) {
    clauses.push(`cnpj.ilike.${quotePostgrestValue(`%${digits}%`)}`);
  }

  if (clauses.length === 0) {
    return null;
  }
  return clauses.join(',');
}
