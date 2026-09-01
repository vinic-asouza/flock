import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { OpsButton } from "@/components/ui/OpsButton";

export function OpsPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-gray-200 bg-white", className)}>
      {title ? (
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-primary">
          {title}
        </h2>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function OpsPage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      {children}
    </div>
  );
}

export function OpsPageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-2xl font-semibold text-primary">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function OpsFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      <OpsPanel>{children}</OpsPanel>
    </div>
  );
}

export function OpsTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function OpsTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-muted">
      {children}
    </thead>
  );
}

export function OpsTh({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>
  );
}

export function OpsTd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3", className)}>{children}</td>;
}

export function OpsPagination({
  page,
  totalPages,
  total,
  noun,
  hasPrevPage,
  hasNextPage,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  noun: { one: string; other: string };
  hasPrevPage: boolean;
  hasNextPage: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const label = `${total} ${total === 1 ? noun.one : noun.other}`;

  if (totalPages <= 1) {
    return <p className="text-sm text-muted">{label}</p>;
  }

  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <p className="text-muted">
        Página {page} de {totalPages} · {label}
      </p>
      <div className="flex gap-2">
        <OpsButton
          type="button"
          variant="secondary"
          disabled={!hasPrevPage}
          onClick={onPrev}
        >
          Anterior
        </OpsButton>
        <OpsButton
          type="button"
          variant="secondary"
          disabled={!hasNextPage}
          onClick={onNext}
        >
          Próxima
        </OpsButton>
      </div>
    </div>
  );
}
