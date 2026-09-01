import type { ReactNode } from "react";
import { Mail, Phone, type LucideIcon } from "lucide-react";
import { formatPhone } from "@/lib/opsFormat";
import { mailtoHref, whatsappHref } from "@/lib/opsContact";
import { cn } from "@/lib/cn";

const linkClass =
  "break-all text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function OpsMailtoLink({
  email,
  className,
}: {
  email: string | null | undefined;
  className?: string;
}) {
  const href = mailtoHref(email);
  if (!href || !email) {
    return <span className={cn("text-sm text-muted", className)}>—</span>;
  }

  return (
    <a href={href} className={cn(linkClass, className)}>
      {email.trim()}
    </a>
  );
}

export function OpsWhatsAppLink({
  phone,
  className,
}: {
  phone: string | null | undefined;
  className?: string;
}) {
  const href = whatsappHref(phone);
  const label = formatPhone(phone);
  if (!href) {
    return <span className={cn("text-sm text-muted", className)}>{label}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(linkClass, className)}
    >
      {label}
    </a>
  );
}

export function OpsContactField({
  kind,
  label,
  value,
}: {
  kind: "email" | "phone";
  label: string;
  value: string | null | undefined;
}) {
  const Icon = kind === "email" ? Mail : Phone;

  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {label}
        </dt>
        <dd className="mt-0.5">
          {kind === "email" ? (
            <OpsMailtoLink email={value} />
          ) : (
            <OpsWhatsAppLink phone={value} />
          )}
        </dd>
      </div>
    </div>
  );
}

export function OpsMetaItem({
  icon: Icon,
  children,
  title,
}: {
  icon: LucideIcon;
  children: ReactNode;
  title?: string;
}) {
  return (
    <li className="flex min-w-0 items-center gap-1.5" title={title}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
    </li>
  );
}
