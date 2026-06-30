import { cn } from "@/lib/utils";

export interface ProgressProps {
  value: number; // 0..100
  className?: string;
  indicatorClassName?: string;
}

export function Progress({
  value,
  className,
  indicatorClassName,
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-all duration-500 ease-out",
          indicatorClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
