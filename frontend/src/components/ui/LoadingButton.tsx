'use client';

import React from 'react';
import { Button } from './Button';
import type { ButtonProps } from './Button';

interface LoadingButtonProps extends Omit<ButtonProps, 'isLoading'> {
  isLoading?: boolean;
  loadingText?: string;
}

/**
 * Componente Button com loading state padronizado
 * Alias para Button com isLoading - mantido para compatibilidade
 * O Button já suporta isLoading nativamente
 */
export function LoadingButton(props: LoadingButtonProps) {
  return <Button {...props} />;
}
