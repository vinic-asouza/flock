import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary:
    "bg-primary text-white hover:opacity-90 disabled:opacity-50",
  secondary:
    "border border-gray-300 bg-white text-primary hover:bg-gray-50 disabled:opacity-50",
  ghost:
    "text-primary hover:bg-gray-100 disabled:opacity-50",
};

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
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
