/**
 * Dedup in-memory de GET /church/member-limit (Header + Membros + Plano).
 * TTL curto: evita rajada no mount sem stale longo após criar/ativar membro.
 */

export type MemberLimitPayload = {
  currentCount: number;
  limit: number | null;
  remaining: number | null;
  planType?: string | null;
  subscriptionStatus?: string | null;
  hasActiveSubscription: boolean;
  isPastDue?: boolean;
  canAdd: boolean;
  message?: string;
  percentage: number;
};

const TTL_MS = 15_000;

type CacheEntry = {
  churchId: string | null;
  expiresAt: number;
  value: MemberLimitPayload;
};

let entry: CacheEntry | null = null;
let inflight: Promise<MemberLimitPayload> | null = null;
let inflightChurchId: string | null | undefined = undefined;

export function getCachedMemberLimit(
  churchId: string | null
): MemberLimitPayload | null {
  if (!entry) return null;
  if (entry.churchId !== churchId) return null;
  if (Date.now() >= entry.expiresAt) {
    entry = null;
    return null;
  }
  return entry.value;
}

export function setCachedMemberLimit(
  churchId: string | null,
  value: MemberLimitPayload
): void {
  entry = {
    churchId,
    value,
    expiresAt: Date.now() + TTL_MS,
  };
}

export function clearMemberLimitCache(): void {
  entry = null;
  inflight = null;
  inflightChurchId = undefined;
}

export function getMemberLimitInflight(
  churchId: string | null
): Promise<MemberLimitPayload> | null {
  if (!inflight) return null;
  if (inflightChurchId !== churchId) return null;
  return inflight;
}

export function setMemberLimitInflight(
  churchId: string | null,
  promise: Promise<MemberLimitPayload>
): void {
  inflightChurchId = churchId;
  inflight = promise;
  void promise.finally(() => {
    if (inflight === promise) {
      inflight = null;
      inflightChurchId = undefined;
    }
  });
}
