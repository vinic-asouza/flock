'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

export type AlertVariant = 'error' | 'success' | 'info' | 'warning';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const variantStyles: Record<AlertVariant, {
  container: string;
  border: string;
  text: string;
  icon: string;
  iconComponent: React.ComponentType<{ className?: string; size?: number }>;
}> = {
  error: {
    container: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-600',
    icon: 'text-red-600',
    iconComponent: AlertCircle,
  },
  success: {
    container: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-600',
    icon: 'text-green-600',
    iconComponent: CheckCircle2,
  },
  info: {
    container: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    icon: 'text-blue-600',
    iconComponent: Info,
  },
  warning: {
    container: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-600',
    icon: 'text-yellow-600',
    iconComponent: AlertTriangle,
  },
};

/**
 * Componente Alert padronizado para mensagens de erro, sucesso, info e warning
 * Substitui os múltiplos padrões de mensagens de erro encontrados no código
 */
export function Alert({
  variant = 'error',
  title,
  message,
  onClose,
  className,
  icon,
}: AlertProps) {
  const styles = variantStyles[variant];
  const IconComponent = icon || styles.iconComponent;

  return (
    <div
      className={clsx(
        'p-4 border rounded-md',
        styles.container,
        styles.border,
        className
      )}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className={clsx('h-5 w-5', styles.icon)} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={clsx('text-sm font-medium mb-1', styles.text)}>
              {title}
            </h3>
          )}
          <p className={clsx('text-sm', styles.text)}>
            {message}
          </p>
        </div>
        {onClose && (
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className={clsx(
                'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                styles.text,
                variant === 'error' && 'focus:ring-red-500',
                variant === 'success' && 'focus:ring-green-500',
                variant === 'info' && 'focus:ring-blue-500',
                variant === 'warning' && 'focus:ring-yellow-500'
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Alias para compatibilidade - ErrorMessage usa Alert com variant='error'
 */
export function ErrorMessage(props: Omit<AlertProps, 'variant'>) {
  return <Alert {...props} variant="error" />;
}
