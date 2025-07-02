import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  clickable?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, clickable, ...props }, ref) => {
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
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-[15px] text-[#222] placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none transition-colors',
            clickable && 'cursor-pointer',
            props.error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          {...props}
        />
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