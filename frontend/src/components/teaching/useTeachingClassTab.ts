'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const TEACHING_CLASS_TABS = [
  'inscritos',
  'aulas',
  'materiais',
  'certificados',
] as const;

export type TeachingClassTab = (typeof TEACHING_CLASS_TABS)[number];

function isTeachingClassTab(value: string | null): value is TeachingClassTab {
  return TEACHING_CLASS_TABS.includes(value as TeachingClassTab);
}

export function useTeachingClassTab() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: TeachingClassTab = isTeachingClassTab(rawTab)
    ? rawTab
    : 'inscritos';

  const setActiveTab = (nextTab: TeachingClassTab) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextTab === 'inscritos') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return { activeTab, setActiveTab };
}
