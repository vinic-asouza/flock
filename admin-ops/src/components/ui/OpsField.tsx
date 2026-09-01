import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import { ChevronDown, Lock, Mail, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const fieldClass =
  "min-h-11 w-full rounded-md border border-gray-300 bg-white py-2 text-base md:text-sm disabled:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function iconForInputType(type: string | undefined): LucideIcon | undefined {
  if (type === "search") {
    return Search;
  }
  if (type === "email") {
    return Mail;
  }
  if (type === "password") {
    return Lock;
  }
  return undefined;
}

export function OpsInput({
  label,
  error,
  className,
  id,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  const inputId = id ?? props.name;
  const Icon = iconForInputType(type);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={inputId} className="text-xs font-medium text-primary">
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
        ) : null}
        <input
          id={inputId}
          type={type}
          className={cn(fieldClass, Icon ? "pl-10 pr-3" : "px-3")}
          {...props}
        />
      </div>
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
      <div className="relative">
        <select
          id={selectId}
          className={cn(fieldClass, "appearance-none px-3 pr-10")}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
      {error ? (
        <span className="text-xs font-normal text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
