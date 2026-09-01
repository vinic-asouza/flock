import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-primary text-white hover:opacity-90 disabled:opacity-50",
  secondary:
    "border border-gray-300 bg-white text-primary hover:bg-gray-50 disabled:opacity-50",
  ghost: "text-primary hover:bg-gray-100 disabled:opacity-50",
};

const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export function OpsButton({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(buttonClass, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function OpsButtonLink({
  href,
  variant = "secondary",
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof variants;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(buttonClass, variants[variant], className)}>
      {children}
    </Link>
  );
}
