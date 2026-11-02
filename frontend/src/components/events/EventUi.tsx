'use client';

import type { ReactNode } from 'react';
import { Building2, Church } from 'lucide-react';
import type { EventStatus } from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';
import { EVENT_STATUS_LABELS } from './constants';

export function EventEmptyState({
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

const STATUS_BADGE_STYLES: Record<EventStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  open: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  in_progress: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  closed: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  archived: 'bg-gray-50 text-gray-500 ring-gray-400/20',
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE_STYLES[status]}`}
    >
      {EVENT_STATUS_LABELS[status]}
    </span>
  );
}

export function CongregationBadge({
  congregation,
  allCongregations = false,
}: {
  congregation?: { name?: string | null; abbreviation?: string | null } | null;
  allCongregations?: boolean;
}) {
  if (allCongregations) {
    return (
      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
        <Building2 size={12} className="shrink-0 text-slate-600" aria-hidden />
        <span className="truncate">Todas as congregações</span>
      </span>
    );
  }

  const label = getCongregationDisplayName(congregation) || 'Congregação';
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      <Church size={12} className="shrink-0 text-gray-600" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function formatEventDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDateTimeLocalValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatSpots(event: {
  capacity?: number | null;
  registration_count?: number;
  spots_remaining?: number | null;
}) {
  if (event.capacity == null) return 'Ilimitado';
  const used = event.registration_count ?? 0;
  return `${used} / ${event.capacity}`;
}
