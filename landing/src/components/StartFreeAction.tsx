'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { buildFreeRegisterUrl } from '@/utils/planFunnel';
import { isClosedLaunch } from '@/utils/launchMode';
import { scrollToLandingSection } from '@/utils/landingScroll';

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';

interface StartFreeActionProps {
  className: string;
  children: ReactNode;
  onActivate?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function StartFreeAction({
  className,
  children,
  onActivate,
  onMouseEnter,
  onMouseLeave,
}: StartFreeActionProps) {
  if (isClosedLaunch()) {
    return (
      <button
        type="button"
        className={className}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={() => {
          onActivate?.();
          scrollToLandingSection('pricing');
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <Link
      href={buildFreeRegisterUrl(FRONTEND_URL)}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onActivate}
    >
      {children}
    </Link>
  );
}
