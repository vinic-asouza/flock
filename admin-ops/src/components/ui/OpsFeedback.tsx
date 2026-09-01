import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function OpsStatCard({
  href,
  label,
  value,
  hint,
  icon: Icon,
  valueClassName,
}: {
  href: string;
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  valueClassName?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-gray-200 bg-white p-5 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        ) : null}
      </div>
      <div
        className={cn(
          "mt-2 text-3xl font-semibold tabular-nums text-primary",
          valueClassName
        )}
      >
        {value}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </Link>
  );
}

export function OpsBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "neutral" | "warning" | "danger";
}) {
  const tones = {
    success: "bg-emerald-50 text-emerald-800",
    neutral: "bg-gray-100 text-gray-700",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function OpsEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
      <Inbox className="h-5 w-5 text-muted" aria-hidden />
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}

export function OpsError({
  title,
  details,
}: {
  title: string;
  details?: string;
}) {
  return (
    <div
      className="rounded-md border border-red-200 bg-red-50 p-4"
      role="alert"
    >
      <p className="text-sm font-medium text-red-700">{title}</p>
      {details ? <p className="mt-1 text-sm text-red-600">{details}</p> : null}
    </div>
  );
}

export function OpsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      aria-hidden
    />
  );
}

export function OpsOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Carregando visão geral">
      <div className="grid gap-4 sm:grid-cols-3">
        <OpsSkeleton className="h-24" />
        <OpsSkeleton className="h-24" />
        <OpsSkeleton className="h-24" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <OpsSkeleton className="h-28" />
        <OpsSkeleton className="h-28" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <OpsSkeleton className="h-48" />
        <OpsSkeleton className="h-48" />
      </div>
    </div>
  );
}

export function OpsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white px-4 py-2"
      role="status"
      aria-label="Carregando"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <OpsSkeleton key={index} className="my-3 h-8" />
      ))}
    </div>
  );
}

export function OpsDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Carregando ficha">
      <div className="grid gap-4 lg:grid-cols-2">
        <OpsSkeleton className="h-56" />
        <OpsSkeleton className="h-56" />
      </div>
      <OpsSkeleton className="h-28" />
      <div className="grid gap-4 lg:grid-cols-2">
        <OpsSkeleton className="h-40" />
        <OpsSkeleton className="h-40" />
      </div>
    </div>
  );
}

export function OpsHealthSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Carregando saúde dos sistemas">
      <OpsSkeleton className="h-16" />
      <div className="grid gap-4 sm:grid-cols-3">
        <OpsSkeleton className="h-28" />
        <OpsSkeleton className="h-28" />
        <OpsSkeleton className="h-28" />
      </div>
      <OpsSkeleton className="h-64" />
    </div>
  );
}

export function OpsShellSkeleton() {
  return (
    <div className="flex min-h-screen" role="status" aria-label="Verificando sessão">
      <div className="hidden w-60 shrink-0 bg-primary md:block" />
      <div className="flex-1 p-6">
        <OpsSkeleton className="mb-6 h-8 w-48" />
        <OpsTableSkeleton />
      </div>
    </div>
  );
}
