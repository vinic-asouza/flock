"use client";

import type { ReactNode } from "react";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function OpsListCard({ children }: { children: ReactNode }) {
  return (
    <article className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {children}
    </article>
  );
}

export function OpsListCardHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
      {children}
    </div>
  );
}

export function OpsListCardAccordion({ children }: { children: ReactNode }) {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <DisclosureButton className="flex w-full items-center justify-between border-t border-gray-100 bg-gray-50 px-3 py-1.5 text-left text-xs font-medium text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
            {open ? "Menos informações" : "Mais informações"}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted transition-transform",
                open && "rotate-180"
              )}
              aria-hidden
            />
          </DisclosureButton>
          <DisclosurePanel className="border-t border-gray-100 px-3 py-3">
            {children}
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  );
}

export function OpsDetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>;
}

export function OpsDetailItem({
  icon: Icon,
  label,
  children,
  wide,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("flex gap-2", wide && "sm:col-span-2")}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
      </div>
    </div>
  );
}
