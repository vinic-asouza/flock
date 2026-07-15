import { Congregation } from '@/types/congregation';

/**
 * Retorna o id da congregação principal (is_primary), ou a primeira
 * da lista como fallback caso nenhuma esteja marcada como principal.
 */
export function getPrimaryCongregationId(congregations: Congregation[] | undefined | null): string {
  if (!congregations || congregations.length === 0) return '';
  const primary = congregations.find((c) => c.is_primary);
  return (primary || congregations[0]).id;
}
