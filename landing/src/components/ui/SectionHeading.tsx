import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Reveal } from '@/components/motion/Reveal';

interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  tone?: 'light' | 'dark';
  className?: string;
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  tone = 'light',
  className,
  id,
}: SectionHeadingProps) {
  const dark = tone === 'dark';
  return (
    <Reveal
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'mx-auto max-w-3xl items-center text-center' : 'max-w-2xl items-start',
        className
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase',
            dark
              ? 'bg-white/8 text-accent-200 ring-1 ring-white/10'
              : 'bg-accent-100 text-accent-500 ring-1 ring-accent-200/60'
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        id={id}
        className={cn(
          'text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl md:text-[2.75rem] md:leading-[1.1]',
          dark ? 'text-white' : 'text-primary'
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'text-base text-pretty sm:text-lg',
            dark ? 'text-white/70' : 'text-gray-600'
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}
