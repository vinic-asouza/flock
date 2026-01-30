'use client';

import React from 'react';
import { clsx } from 'clsx';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Componente PageHeader padronizado para títulos de páginas
 * Padroniza: text-2xl font-bold text-gray-900 para título
 * Padroniza: text-sm text-gray-600 mt-1 para subtítulo
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
