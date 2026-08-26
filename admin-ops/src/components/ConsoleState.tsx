export function LoadingState({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted" role="status">
      {label}
    </p>
  );
}

export function ErrorState({
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

import type { ReactNode } from "react";

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
