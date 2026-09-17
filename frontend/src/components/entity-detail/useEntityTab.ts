'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useEntityTab<T extends string>(
  tabs: readonly T[],
  defaultTab: T
) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: T = tabs.includes(rawTab as T) ? (rawTab as T) : defaultTab;

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
