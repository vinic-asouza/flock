'use client';

import React from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface InfoRowProps {
  icon?: LucideIcon;
  label?: string;
  value: React.ReactNode;
  className?: string;
  iconClassName?: string;
  valueClassName?: string;
  truncate?: boolean;
}

/**
 * Componente InfoRow para padronizar linhas de informação com ícone
 * Usado para exibir informações como endereço, telefone, líder, etc.
 */
export function InfoRow({
  icon: Icon,
  label,
  value,
  className,
  iconClassName,
  valueClassName,
  truncate = false,
}: InfoRowProps) {
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {Icon && (
        <Icon
          size={14}
          className={clsx('text-gray-400 flex-shrink-0', iconClassName)}
        />
      )}
      <span
        className={clsx(
          'text-sm text-gray-600',
          truncate && 'truncate',
          valueClassName
        )}
      >
        {label && <span className="font-medium">{label}: </span>}
        {value}
      </span>
    </div>
  );
}
