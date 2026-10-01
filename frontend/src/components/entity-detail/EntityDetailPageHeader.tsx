'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';

export function EntityDetailPageHeader({
  backHref,
  backLabel = 'Voltar à lista',
  title,
  badge,
  subtitle,
  subtitleClassName = 'mt-1',
  actions,
  className,
}: {
  backHref: string;
  backLabel?: string;
  title: ReactNode;
  badge?: ReactNode;
  subtitle?: ReactNode;
  subtitleClassName?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('space-y-4', className)}>
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-2 text-sm text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {badge}
          </div>
          {subtitle ? (
            <div className={clsx('text-sm text-gray-600', subtitleClassName)}>{subtitle}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
