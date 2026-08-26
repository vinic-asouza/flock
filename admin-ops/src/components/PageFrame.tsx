import type { ReactNode } from "react";

export function PageFrame({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Panel({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      {title ? (
        <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-primary">
          {title}
        </h2>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}
