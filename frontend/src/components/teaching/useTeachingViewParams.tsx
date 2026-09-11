'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ViewSelector, type ViewMode } from '@/components/reports/ViewSelector';

export function useTeachingViewParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view: ViewMode =
    searchParams.get('view') === 'congregation' ? 'congregation' : 'all';
  const congregationId = searchParams.get('congregationId') || undefined;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (view === 'congregation' && congregationId) {
      params.set('view', 'congregation');
      params.set('congregationId', congregationId);
    } else {
      params.set('view', 'all');
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [view, congregationId]);

  const setView = (nextView: ViewMode, nextId?: string) => {
    const params = new URLSearchParams();
    if (nextView === 'congregation' && nextId) {
      params.set('view', 'congregation');
      params.set('congregationId', nextId);
    } else {
      params.set('view', 'all');
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return { view, congregationId, queryString, setView };
}

export function TeachingViewSelector() {
  const { view, congregationId, setView } = useTeachingViewParams();
  return (
    <ViewSelector
      selectedView={view}
      selectedCongregationId={congregationId}
      onViewChange={setView}
    />
  );
}
