const NAME_PARTICLES = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);

export type TeachingMatchSignals = { N: boolean; W: boolean; D: boolean };

export type TeachingMatchCandidate = {
  id: string;
  signals: TeachingMatchSignals;
};

export type TeachingMatchMemberInput = {
  id: string;
  name: string;
  whatsapp?: string | null;
  phone?: string | null;
  birth?: Date | string | null;
};

export type TeachingMatchResult = {
  kind: 'member' | 'guest' | 'possible_member';
  memberId?: string;
  candidates: TeachingMatchCandidate[];
  signals: TeachingMatchSignals;
};

/**
 * Normaliza nome para tokens de match (min. 2 palavras após filtrar partículas).
 */
export function normalizeTeachingName(name: string): string[] {
  const normalized = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return [];

  const tokens = normalized
    .split(' ')
    .filter((token) => token.length > 0 && !NAME_PARTICLES.has(token));

  if (tokens.length < 2) return [];
  return tokens;
}

/**
 * Match parcial: o conjunto mais curto ⊆ o mais longo.
 */
export function nameMatches(aTokens: string[], bTokens: string[]): boolean {
  if (aTokens.length === 0 || bTokens.length === 0) return false;
  const [shorter, longer] =
    aTokens.length <= bTokens.length ? [aTokens, bTokens] : [bTokens, aTokens];
  const longerSet = new Set(longer);
  return shorter.every((token) => longerSet.has(token));
}

export function normalizeWhatsAppDigits(phone: string | null | undefined): string {
  return String(phone || '').replace(/\D/g, '');
}

/**
 * Últimos 4 dígitos do número nacional (remove 55 inicial se length > 11).
 */
export function whatsappLast4National(digits: string): string | null {
  let national = digits;
  if (national.startsWith('55') && national.length > 11) {
    national = national.slice(2);
  }
  if (national.length < 4) return null;
  return national.slice(-4);
}

function toBirthDateString(birth: Date | string | null | undefined): string | null {
  if (birth == null || birth === '') return null;
  if (typeof birth === 'string') {
    const trimmed = birth.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }
  if (birth instanceof Date) {
    if (Number.isNaN(birth.getTime())) return null;
    return birth.toISOString().slice(0, 10);
  }
  return null;
}

function memberWhatsAppLast4(member: TeachingMatchMemberInput): string | null {
  const fromWhatsapp = whatsappLast4National(normalizeWhatsAppDigits(member.whatsapp));
  if (fromWhatsapp) return fromWhatsapp;
  return whatsappLast4National(normalizeWhatsAppDigits(member.phone));
}

/**
 * Aplica matriz N/W/D de inscrição pública do módulo Ensino.
 */
export function matchEnrollment(
  input: { fullName: string; whatsapp: string; birthDate: string },
  members: TeachingMatchMemberInput[]
): TeachingMatchResult {
  const inputNameTokens = normalizeTeachingName(input.fullName);
  const inputLast4 = whatsappLast4National(normalizeWhatsAppDigits(input.whatsapp));
  const inputBirth = toBirthDateString(input.birthDate);

  const scored: TeachingMatchCandidate[] = members.map((member) => {
    const memberTokens = normalizeTeachingName(member.name);
    const N =
      inputNameTokens.length >= 2 &&
      memberTokens.length >= 2 &&
      nameMatches(inputNameTokens, memberTokens);

    const memberLast4 = memberWhatsAppLast4(member);
    const W = Boolean(inputLast4 && memberLast4 && inputLast4 === memberLast4);

    const memberBirth = toBirthDateString(member.birth);
    const D = Boolean(inputBirth && memberBirth && inputBirth === memberBirth);

    return { id: member.id, signals: { N, W, D } };
  });

  const withN = scored.filter((c) => c.signals.N);

  if (withN.length === 0) {
    return {
      kind: 'guest',
      candidates: [],
      signals: { N: false, W: false, D: false },
    };
  }

  const strong = withN.filter((c) => c.signals.W && c.signals.D);
  if (strong.length === 1) {
    return {
      kind: 'member',
      memberId: strong[0].id,
      candidates: strong,
      signals: strong[0].signals,
    };
  }
  if (strong.length > 1) {
    return {
      kind: 'possible_member',
      candidates: strong,
      signals: { N: true, W: true, D: true },
    };
  }

  const partial = withN.filter((c) => c.signals.W || c.signals.D);
  if (partial.length > 0) {
    const anyW = partial.some((c) => c.signals.W);
    const anyD = partial.some((c) => c.signals.D);
    return {
      kind: 'possible_member',
      candidates: partial,
      signals: { N: true, W: anyW, D: anyD },
    };
  }

  return {
    kind: 'guest',
    candidates: [],
    signals: { N: true, W: false, D: false },
  };
}
