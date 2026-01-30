'use client';

import React from 'react';
import { clsx } from 'clsx';

export type StatusVariant = 'active' | 'inactive' | 'pending' | 'success' | 'error' | 'warning' | 'info';

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const variantStyles: Record<StatusVariant, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-200 text-gray-500',
  pending: 'bg-blue-100 text-blue-700',
  success: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
  warning: 'bg-yellow-100 text-yellow-700',
  info: 'bg-blue-100 text-blue-700',
};

const defaultLabels: Record<StatusVariant, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  pending: 'Pendente',
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Aviso',
  info: 'Info',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

/**
 * Componente StatusBadge genérico para exibir status padronizados
 * Substitui badges inline e padroniza cores e estilos
 */
export function StatusBadge({
  variant,
  label,
  className,
  size = 'md',
}: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {label || defaultLabels[variant]}
    </span>
  );
}
