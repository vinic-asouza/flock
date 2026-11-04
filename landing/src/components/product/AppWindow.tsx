import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface AppWindowProps {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Moldura de janela usada nas prévias ilustrativas do produto. */
export function AppWindow({ title, children, className, bodyClassName }: AppWindowProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white/95 ring-1 ring-black/5 backdrop-blur',
        className
      )}
    >
      <div className="flex h-9 items-center gap-3 border-b border-gray-100 bg-gray-50/80 px-3.5">
        <div aria-hidden className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex h-5 min-w-0 items-center gap-1.5 rounded-md bg-white px-3 text-[10px] font-medium text-gray-500 ring-1 ring-gray-200/70">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          Flock · {title}
        </div>
        <span aria-hidden className="w-[42px]" />
      </div>
      <div className={cn('bg-canvas', bodyClassName)}>{children}</div>
    </div>
  );
}
