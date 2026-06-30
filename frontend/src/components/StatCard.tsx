import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = "primary",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: string;
  accent?: "primary" | "emerald" | "amber" | "violet";
}) {
  const tints: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
    violet: "bg-violet-500/10 text-violet-400",
  };
  return (
    <Card className="p-5 hover:shadow-glow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            tints[accent],
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}
