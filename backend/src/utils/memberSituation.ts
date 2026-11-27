/**
 * Situação do membro (DEV-179).
 * Valores canônicos no DB; labels PT na UI/export.
 * `active` é derivado: só `ativo` ⇒ true.
 */

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

export function isMemberSituation(value: unknown): value is MemberSituation {
  return typeof value === 'string' && (MEMBER_SITUATIONS as readonly string[]).includes(value);
}

export function situationToActive(situation: MemberSituation): boolean {
  return situation === 'ativo';
}

/** Compat: boolean active → situação Ativo/Inativo. */
export function activeToSituation(active: boolean): MemberSituation {
  return active ? 'ativo' : 'inativo';
}

/**
 * Resolve situation a partir do body do PATCH.
 * Prefere `situation`; se ausente, mapeia `active` booleano.
 */
export function resolveSituationFromStatusBody(body: {
  situation?: unknown;
  active?: unknown;
}): { ok: true; situation: MemberSituation } | { ok: false; details: string } {
  if (body.situation !== undefined && body.situation !== null) {
    if (!isMemberSituation(body.situation)) {
      return {
        ok: false,
        details: `Situação inválida. Use: ${MEMBER_SITUATIONS.join(', ')}`,
      };
    }
    return { ok: true, situation: body.situation };
  }

  if (typeof body.active === 'boolean') {
    return { ok: true, situation: activeToSituation(body.active) };
  }

  return {
    ok: false,
    details: 'Informe "situation" (ativo|inativo|transferido|desligado|falecido) ou "active" (boolean)',
  };
}

export function memberSituationLabel(
  situation: string | null | undefined,
  activeFallback?: boolean | null
): string {
  if (isMemberSituation(situation)) {
    return MEMBER_SITUATION_LABELS[situation];
  }
  if (activeFallback === true) return MEMBER_SITUATION_LABELS.ativo;
  if (activeFallback === false) return MEMBER_SITUATION_LABELS.inativo;
  return '—';
}

/** Payload de escrita para create/update/status. */
export function situationWriteFields(situation: MemberSituation, changedAt = new Date().toISOString()) {
  return {
    situation,
    active: situationToActive(situation),
    situation_changed_at: changedAt,
  };
}
