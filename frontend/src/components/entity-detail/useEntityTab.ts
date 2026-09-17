'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useEntityTab<T extends string>(
  tabs: readonly T[],
  defaultTab: T
) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  const hasValidTab = rawTab !== null && tabs.includes(rawTab as T);
  const activeTab: T = hasValidTab ? (rawTab as T) : defaultTab;

  useEffect(() => {
    if (rawTab === null || hasValidTab) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete('tab');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [rawTab, hasValidTab, pathname, router, searchParams]);

  const setActiveTab = (nextTab: T) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextTab === defaultTab) {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return { activeTab, setActiveTab };
}
