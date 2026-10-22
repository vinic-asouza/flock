export type WaitlistPlanId = '100' | '200' | '500' | '800' | 'personalizado';

const PLAN_MAP: Record<string, WaitlistPlanId> = {
  '100': '100',
  '200': '200',
  '500': '500',
  '800': '800',
  personalizado: 'personalizado',
};

export function parseWaitlistPlanParam(
  value: string | null | undefined,
  options?: { allowFree?: boolean }
): WaitlistPlanId | null {
  if (!value) return null;
  const parsed = PLAN_MAP[value] ?? null;
  if (!parsed) return null;
  if (parsed === '100' && options?.allowFree === false) return null;
  return parsed;
}

export function readPlanFromLocation(
  search?: string,
  hash?: string,
  options?: { allowFree?: boolean }
): WaitlistPlanId | null {
  if (typeof window !== 'undefined') {
    const fromSearch = parseWaitlistPlanParam(
      new URLSearchParams(window.location.search).get('plan'),
      options
    );
    if (fromSearch) return fromSearch;

    const currentHash = hash ?? window.location.hash;
    const hashQuery = currentHash.split('?')[1];
    if (hashQuery) {
      const fromHash = parseWaitlistPlanParam(new URLSearchParams(hashQuery).get('plan'), options);
      if (fromHash) return fromHash;
    }
  }

  if (search) {
    const fromProp = parseWaitlistPlanParam(new URLSearchParams(search).get('plan'), options);
    if (fromProp) return fromProp;
  }

  return null;
}
