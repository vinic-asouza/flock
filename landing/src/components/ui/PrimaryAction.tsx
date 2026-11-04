'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { buildFreeRegisterUrl } from '@/utils/planFunnel';
import { isClosedLaunch } from '@/utils/launchMode';
import { landingAnchor } from '@/utils/landingLinks';
import { cn } from '@/utils/cn';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

export function primaryActionLabel(): string {
  return isClosedLaunch() ? 'Quero ser Igreja Parceira' : 'Começar grátis';
}

type Variant = 'light' | 'dark' | 'accent';

const VARIANTS: Record<Variant, string> = {
  light:
    'bg-white text-primary shadow-[0_8px_30px_-8px_rgb(83_70_240/0.55)] hover:bg-accent-50 focus-visible:ring-white focus-visible:ring-offset-brand-950',
  dark: 'bg-primary text-white shadow-[0_10px_30px_-10px_rgb(9_7_37/0.6)] hover:bg-brand-900 focus-visible:ring-primary',
  accent:
    'bg-accent-500 text-white shadow-[0_10px_30px_-10px_rgb(83_70_240/0.8)] hover:bg-accent-600 focus-visible:ring-accent-500',
};

interface PrimaryActionProps {
  variant?: Variant;
  size?: 'md' | 'lg';
  className?: string;
  onActivate?: () => void;
  withArrow?: boolean;
}

/**
 * CTA principal da landing. Modo aberto: cadastro grátis no app.
 * Modo Igrejas Parceiras: leva ao formulário de solicitação de acesso.
 */
export function PrimaryAction({
  variant = 'dark',
  size = 'md',
  className,
  onActivate,
  withArrow = true,
}: PrimaryActionProps) {
  const pathname = usePathname();
  const href = isClosedLaunch() ? landingAnchor('#waitlist', pathname) : buildFreeRegisterUrl(FRONTEND_URL);

  return (
    <Link
      href={href}
      onClick={onActivate}
      className={cn(
        'group relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl font-semibold transition-[background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-0',
        size === 'lg' ? 'px-7 py-3.5 text-base sm:text-lg' : 'px-5 py-2.5 text-sm sm:text-base',
        VARIANTS[variant],
        className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-[left,opacity] duration-700 group-hover:left-full group-hover:opacity-100"
      />
      <span className="relative">{primaryActionLabel()}</span>
      {withArrow && (
        <ArrowRight
          aria-hidden
          className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
        />
      )}
    </Link>
  );
}
