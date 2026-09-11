'use client';

import type { ReactNode } from 'react';
import type { TeachingClassStatus } from '@/types';
import { STATUS_LABELS } from './constants';

export function TeachingEmptyState({
  text,
  action,
}: {
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white/60 px-4 py-12 text-center space-y-4">
      <p className="text-sm text-gray-500 max-w-md mx-auto">{text}</p>
      {action ? <div className="flex justify-center">{action}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: TeachingClassStatus }) {
  return (
    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
      {STATUS_LABELS[status]}
    </span>
  );
}
