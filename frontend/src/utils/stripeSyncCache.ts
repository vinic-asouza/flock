const SYNC_CACHE_PREFIX = 'stripe_sync_cache';
const SYNC_CACHE_DURATION = 5 * 60 * 1000;

export function getStripeSyncCacheKey(churchId: string | null | undefined): string {
  return churchId ? `${SYNC_CACHE_PREFIX}:${churchId}` : SYNC_CACHE_PREFIX;
}

export function getCachedStripeSync(churchId: string | null | undefined): boolean {
  try {
    const raw = localStorage.getItem(getStripeSyncCacheKey(churchId));
    if (!raw) return false;
    const { timestamp } = JSON.parse(raw) as { timestamp: number };
    if (Date.now() - timestamp >= SYNC_CACHE_DURATION) {
      localStorage.removeItem(getStripeSyncCacheKey(churchId));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function setCachedStripeSync(churchId: string | null | undefined): void {
  try {
    localStorage.setItem(
      getStripeSyncCacheKey(churchId),
      JSON.stringify({ timestamp: Date.now() })
    );
  } catch {
    // ignore
  }
}

export function clearStripeSyncCache(churchId?: string | null): void {
  try {
    if (churchId) {
      localStorage.removeItem(getStripeSyncCacheKey(churchId));
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${SYNC_CACHE_PREFIX}:`)) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
