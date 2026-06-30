import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "danger";

const variants: Record<Variant, string> = {
  default: "bg-primary/10 text-primary ring-1 ring-primary/20",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-border text-muted-foreground",
  success: "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20",
  danger: "bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
