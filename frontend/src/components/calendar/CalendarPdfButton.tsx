'use client';

import { Button } from '@/components/ui/Button';
import { Download, Loader2 } from 'lucide-react';

interface CalendarPdfButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  ariaLabel: string;
  title?: string;
  className?: string;
}

export function CalendarPdfButton({
  onClick,
  isLoading = false,
  ariaLabel,
  title,
  className = '',
}: CalendarPdfButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      disabled={isLoading}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={`flex min-h-11 shrink-0 items-center justify-center gap-2 ${className}`}
    >
      {isLoading ? (
        <Loader2 size={18} className="animate-spin" aria-hidden />
      ) : (
        <Download size={18} aria-hidden />
      )}
      <span className="sm:hidden">PDF</span>
      <span className="hidden sm:inline">Exportar PDF</span>
    </Button>
  );
}
