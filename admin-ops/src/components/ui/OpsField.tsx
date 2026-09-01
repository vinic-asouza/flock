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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: OpsSelectOption[];
  className?: string;
  disabled?: boolean;
  error?: string;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <span className="text-xs font-medium text-primary">{label}</span>
        <div className="relative">
          <ListboxButton
            type="button"
            className={cn(
              fieldClass,
              "flex items-center justify-between gap-2 px-3 pr-3 text-left"
            )}
          >
            <span className="truncate">{selected?.label}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          </ListboxButton>
          <ListboxOptions
            anchor={{ to: "bottom start", gap: "4px" }}
            className="z-50 max-h-60 w-[var(--button-width)] overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg outline-none"
          >
            {options.map((option) => (
              <ListboxOption
                key={option.value || "__empty"}
                value={option.value}
                className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm text-foreground data-[focus]:bg-gray-50 data-[selected]:font-medium"
              >
                {({ selected: isSelected }) => (
                  <>
                    <span className="truncate">{option.label}</span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
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
