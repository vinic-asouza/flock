export const MEMBER_SITUATIONS = [
  'ativo',
  'inativo',
  'transferido',
  'desligado',
  'falecido',
] as const;

export type MemberSituation = (typeof MEMBER_SITUATIONS)[number];

export const MEMBER_SITUATION_LABELS: Record<MemberSituation, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  transferido: 'Transferido',
  desligado: 'Desligado',
  falecido: 'Falecido',
};

export type MemberSituationFilter = 'all' | MemberSituation;

export function isMemberSituation(value: unknown): value is MemberSituation {
  return typeof value === 'string' && (MEMBER_SITUATIONS as readonly string[]).includes(value);
}

export function situationToActive(situation: MemberSituation): boolean {
  return situation === 'ativo';
}

export function resolveMemberSituation(
  situation?: string | null,
  active?: boolean | null
): MemberSituation {
  if (isMemberSituation(situation)) return situation;
  return active === false ? 'inativo' : 'ativo';
}

export function memberSituationLabel(
  situation?: string | null,
  active?: boolean | null
): string {
  return MEMBER_SITUATION_LABELS[resolveMemberSituation(situation, active)];
}

/** Badge variant mapping for StatusBadge / chips. */
export function memberSituationBadgeVariant(
  situation: MemberSituation
): 'active' | 'inactive' | 'warning' | 'error' | 'info' {
  switch (situation) {
    case 'ativo':
      return 'active';
    case 'inativo':
      return 'inactive';
    case 'transferido':
      return 'info';
    case 'desligado':
      return 'warning';
    case 'falecido':
      return 'error';
    default:
      return 'inactive';
  }
}

/** URL/legacy: active|inactive|all → situation filter. */
export function normalizeSituationFilter(raw: string | null | undefined): MemberSituationFilter {
  if (!raw) return 'ativo';
  if (raw === 'all') return 'all';
  if (raw === 'active') return 'ativo';
  if (raw === 'inactive') return 'inativo';
  if (isMemberSituation(raw)) return raw;
  return 'ativo';
}
