'use client';

import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export function EntityDetailLayout({
  aside,
  children,
  className,
}: {
  aside: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-4 md:flex-row md:items-start md:gap-6',
        className
      )}
    >
      <aside className="flex w-full shrink-0 flex-col gap-4 md:sticky md:top-4 md:w-[340px] lg:w-[360px]">
        {aside}
      </aside>
      <div className="min-w-0 flex-1 space-y-4">{children}</div>
    </div>
  );
}
