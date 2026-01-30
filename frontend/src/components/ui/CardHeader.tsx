'use client';

import React from 'react';
import { clsx } from 'clsx';

interface CardHeaderProps {
  title: string;
  badges?: React.ReactNode[];
  className?: string;
  titleClassName?: string;
}

/**
 * Componente CardHeader para padronizar headers de cards
 * Usado para título e badges em cards de membros, grupos, congregações, etc.
 */
export function CardHeader({
  title,
  badges = [],
  className,
  titleClassName,
}: CardHeaderProps) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-2 mb-1', className)}>
      <span
        className={clsx(
          'font-semibold text-gray-900 text-sm truncate max-w-xs md:max-w-sm uppercase',
          titleClassName
        )}
        title={title}
      >
        {title}
      </span>
      {badges.map((badge, index) => (
        <React.Fragment key={index}>{badge}</React.Fragment>
      ))}
    </div>
  );
}
