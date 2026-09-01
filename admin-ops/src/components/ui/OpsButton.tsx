import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-primary text-white hover:opacity-90 disabled:opacity-50",
  secondary:
    "border border-gray-300 bg-white text-primary hover:bg-gray-50 disabled:opacity-50",
  ghost: "text-primary hover:bg-gray-100 disabled:opacity-50",
};

const sizes = {
  md: "min-h-11 px-4 text-sm gap-2",
  sm: "min-h-8 px-2.5 text-xs gap-1.5",
};

const buttonClass =
  "inline-flex items-center justify-center rounded-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export function OpsButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(buttonClass, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function OpsButtonLink({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonClass, sizes[size], variants[variant], className)}
    >
      {children}
    </Link>
  );
}
