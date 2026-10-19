import { Congregation } from '@/types/congregation';

type CongregationNameSource = {
  name?: string | null;
  abbreviation?: string | null;
} | null | undefined;

/**
 * Retorna o id da congregação principal (is_primary), ou a primeira
 * da lista como fallback caso nenhuma esteja marcada como principal.
 */
export function getPrimaryCongregationId(congregations: Congregation[] | undefined | null): string {
  if (!congregations || congregations.length === 0) return '';
  const primary = congregations.find((c) => c.is_primary);
  return (primary || congregations[0]).id;
}

/**
 * Nome para selects, chips, filtros e cards.
 * Sempre inclui o nome completo; se houver sigla, anexa entre parênteses.
 */
export function getCongregationDisplayName(congregation: CongregationNameSource): string {
  if (!congregation) return '';
  const name = congregation.name?.trim() || '';
  const abbreviation = congregation.abbreviation?.trim();
  if (name && abbreviation) return `${name} (${abbreviation})`;
  return name || abbreviation || '';
}
