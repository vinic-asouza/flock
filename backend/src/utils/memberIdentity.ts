export type DuplicateWarning = 'name_birth' | 'email';

export type MemberIdentityRow = {
  id: string;
  name: string;
  birth?: unknown;
  email?: string | null;
};

export function normalizeMemberName(name: string | null | undefined): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeMemberEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function birthKey(birth: unknown): string {
  if (!birth) return '';
  if (birth instanceof Date && !Number.isNaN(birth.getTime())) {
    return birth.toISOString().slice(0, 10);
  }
  const match = String(birth).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

export function hasAnyContact(member: {
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
}): boolean {
  return [member.phone, member.whatsapp, member.email].some(
    (value) => typeof value === 'string' && value.trim() !== ''
  );
}

export function collectDuplicateWarnings(
  candidate: { name?: string | null; birth?: unknown; email?: string | null },
  existing: MemberIdentityRow[],
  excludeId?: string
): DuplicateWarning[] {
  const warnings = new Set<DuplicateWarning>();
  const name = normalizeMemberName(candidate.name);
  const birth = birthKey(candidate.birth);
  const email = normalizeMemberEmail(candidate.email);

  for (const row of existing) {
    if (excludeId && row.id === excludeId) continue;

    if (
      name &&
      birth &&
      normalizeMemberName(row.name) === name &&
      birthKey(row.birth) === birth
    ) {
      warnings.add('name_birth');
    }

    const rowEmail = normalizeMemberEmail(row.email);
    if (email && rowEmail && rowEmail === email) {
      warnings.add('email');
    }
  }

  return Array.from(warnings);
}

export const DUPLICATE_WARNING_MESSAGES: Record<DuplicateWarning, string> = {
  name_birth: 'Possível duplicidade (mesmo nome e mesma data de nascimento).',
  email: 'E-mail já usado por outro membro.',
};

export const MISSING_CONTACT_WARNING = 'Sem telefone, WhatsApp ou e-mail.';

const MEMBER_CONTROL_FIELDS = ['groups', 'acknowledgeDuplicates', 'communication_consent'] as const;

export function omitMemberControlFields<T extends Record<string, unknown>>(data: T): Omit<T, (typeof MEMBER_CONTROL_FIELDS)[number]> {
  const copy = { ...data };
  for (const key of MEMBER_CONTROL_FIELDS) {
    delete copy[key];
  }
  return copy;
}

export type CommunicationConsentSource = 'internal' | 'public' | 'import';

export function resolveConsentForCreate(
  consent: boolean | undefined,
  source: CommunicationConsentSource,
  now: Date = new Date()
): {
  communication_consent_at: string | null;
  communication_consent_source: CommunicationConsentSource | null;
} {
  if (!consent) {
    return { communication_consent_at: null, communication_consent_source: null };
  }
  return {
    communication_consent_at: now.toISOString(),
    communication_consent_source: source,
  };
}

export function resolveConsentForUpdate(
  consent: boolean | undefined,
  existing: {
    communication_consent_at?: string | null;
    communication_consent_source?: CommunicationConsentSource | null;
  },
  now: Date = new Date()
): {
  communication_consent_at: string | null;
  communication_consent_source: CommunicationConsentSource | null;
} {
  if (consent === undefined) {
    return {
      communication_consent_at: existing.communication_consent_at ?? null,
      communication_consent_source: existing.communication_consent_source ?? null,
    };
  }
  if (!consent) {
    return { communication_consent_at: null, communication_consent_source: null };
  }
  if (existing.communication_consent_at && existing.communication_consent_source) {
    return {
      communication_consent_at: existing.communication_consent_at,
      communication_consent_source: existing.communication_consent_source,
    };
  }
  return {
    communication_consent_at: now.toISOString(),
    communication_consent_source: 'internal',
  };
}
