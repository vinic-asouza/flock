'use client';

import { useRef, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Card com brilho radial que acompanha o ponteiro (via CSS vars, sem re-render). */
export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || event.pointerType !== 'mouse') return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      className={cn(
        'group relative isolate overflow-hidden rounded-3xl border border-gray-200/80 bg-white transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:border-accent-200 hover:shadow-[0_30px_60px_-30px_rgb(83_70_240/0.45)]',
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 0%), rgb(83 70 240 / 0.10), transparent 65%)',
        }}
      />
      {children}
    </div>
  );
}
