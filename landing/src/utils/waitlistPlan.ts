const PLAN_MAP: Record<string, '200' | '500' | '800' | 'personalizado'> = {
  '200': '200',
  '500': '500',
  '800': '800',
  personalizado: 'personalizado',
};

export function parseWaitlistPlanParam(value: string | null | undefined) {
  if (!value) return null;
  return PLAN_MAP[value] ?? null;
}

export function readPlanFromLocation(search?: string, hash?: string) {
  if (typeof window !== 'undefined') {
    const fromSearch = parseWaitlistPlanParam(
      new URLSearchParams(window.location.search).get('plan')
    );
    if (fromSearch) return fromSearch;

    const currentHash = hash ?? window.location.hash;
    const hashQuery = currentHash.split('?')[1];
    if (hashQuery) {
      const fromHash = parseWaitlistPlanParam(new URLSearchParams(hashQuery).get('plan'));
      if (fromHash) return fromHash;
    }
  }

  if (search) {
    const fromProp = parseWaitlistPlanParam(new URLSearchParams(search).get('plan'));
    if (fromProp) return fromProp;
  }

  return null;
}
