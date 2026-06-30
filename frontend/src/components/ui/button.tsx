import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  default:
    "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:shadow-glow",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/70",
  outline:
    "border border-border bg-transparent hover:bg-secondary/60 text-foreground",
  ghost: "hover:bg-secondary/60 text-foreground",
  destructive:
    "bg-rose-500 text-white hover:bg-rose-600 shadow-soft",
  success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-sm gap-2",
  icon: "h-9 w-9",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
