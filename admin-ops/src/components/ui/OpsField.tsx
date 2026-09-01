import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const fieldClass =
  "min-h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-base md:text-sm disabled:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function OpsInput({
  label,
  error,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  const inputId = id ?? props.name;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={inputId} className="text-xs font-medium text-primary">
        {label}
      </label>
      <input id={inputId} className={fieldClass} {...props} />
      {error ? (
        <span className="text-xs font-normal text-red-600">{error}</span>
      ) : null}
    </div>
  );
}

export function OpsSelect({
  label,
  error,
  className,
  id,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const selectId = id ?? props.name;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={selectId} className="text-xs font-medium text-primary">
        {label}
      </label>
      <select id={selectId} className={fieldClass} {...props}>
        {children}
      </select>
      {error ? (
        <span className="text-xs font-normal text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
