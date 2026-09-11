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

const STATUS_BADGE_STYLES: Record<TeachingClassStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  open: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  in_progress: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  closed: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  archived: 'bg-gray-50 text-gray-500 ring-gray-400/20',
};

export function StatusBadge({ status }: { status: TeachingClassStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
