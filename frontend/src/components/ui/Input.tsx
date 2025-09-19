import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  clickable?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, clickable, isLoading = false, icon, ...props }, ref) => {
    const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="space-y-2">
        {props.label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {props.label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'block w-full rounded-md border border-gray-300 bg-white py-2 text-[15px] text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-colors',
              icon ? 'pl-10 pr-3' : 'px-3',
              clickable && 'cursor-pointer',
              props.error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              isLoading && 'opacity-50 cursor-not-allowed',
              className
            )}
            disabled={isLoading || props.disabled}
            {...props}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        {props.error && (
          <p className="text-sm text-red-600">{props.error}</p>
        )}
        {props.helperText && !props.error && (
          <p className="text-sm text-gray-500">{props.helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input'; 