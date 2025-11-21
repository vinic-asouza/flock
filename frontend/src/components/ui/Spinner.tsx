import { LoaderCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 48, className }: SpinnerProps) {
  return (
    <LoaderCircle 
      className={clsx('animate-spin text-primary', className)} 
      size={size}
    />
  );
}
