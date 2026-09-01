"use client";

import type { InputHTMLAttributes } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { Check, ChevronDown, Lock, Mail, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const fieldClass =
  "w-full rounded-md border border-gray-300 bg-white disabled:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

const fieldSizes = {
  md: "min-h-11 py-2 text-base md:text-sm",
  sm: "min-h-9 py-1.5 text-xs",
};

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
  density = "md",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  density?: keyof typeof fieldSizes;
}) {
  const inputId = id ?? props.name;
  const Icon = iconForInputType(type);
  const compact = density === "sm";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={inputId}
        className={cn(
          "font-medium text-primary",
          compact ? "text-[11px]" : "text-xs"
        )}
      >
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted",
              compact ? "left-2.5 h-3.5 w-3.5" : "left-3 h-4 w-4"
            )}
            aria-hidden
          />
        ) : null}
        <input
          id={inputId}
          type={type}
          className={cn(
            fieldClass,
            fieldSizes[density],
            Icon ? (compact ? "pl-8 pr-2.5" : "pl-10 pr-3") : compact ? "px-2.5" : "px-3"
          )}
          {...props}
        />
      </div>
      {error ? (
        <span className="text-xs font-normal text-red-600">{error}</span>
      ) : null}
    </div>
  );
}

export type OpsSelectOption = {
  value: string;
  label: string;
};

export function OpsSelect({
  label,
  value,
  onChange,
  options,
  className,
  disabled,
  error,
  density = "md",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: OpsSelectOption[];
  className?: string;
  disabled?: boolean;
  error?: string;
  density?: keyof typeof fieldSizes;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];
  const compact = density === "sm";

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <span
          className={cn(
            "truncate font-medium text-primary",
            compact ? "text-[11px]" : "text-xs"
          )}
        >
          {label}
        </span>
        <div className="relative">
          <ListboxButton
            type="button"
            className={cn(
              fieldClass,
              fieldSizes[density],
              "flex items-center justify-between gap-1.5 text-left",
              compact ? "px-2.5" : "px-3"
            )}
          >
            <span className="truncate">{selected?.label}</span>
            <ChevronDown
              className={cn(
                "shrink-0 text-muted",
                compact ? "h-3.5 w-3.5" : "h-4 w-4"
              )}
              aria-hidden
            />
          </ListboxButton>
          <ListboxOptions
            anchor={{ to: "bottom start", gap: "4px" }}
            className="z-50 max-h-60 w-[var(--button-width)] overflow-auto rounded-md border border-gray-200 bg-white py-1 text-xs shadow-lg outline-none"
          >
            {options.map((option) => (
              <ListboxOption
                key={option.value || "__empty"}
                value={option.value}
                className="flex cursor-pointer items-center justify-between gap-3 px-2.5 py-1.5 text-xs text-foreground data-[focus]:bg-gray-50 data-[selected]:font-medium"
              >
                {({ selected: isSelected }) => (
                  <>
                    <span className="truncate">{option.label}</span>
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    ) : null}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
      {error ? (
        <span className="text-xs font-normal text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
