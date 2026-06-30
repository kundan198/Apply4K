import type { AppStatus } from "@/types";
import { cn } from "@/lib/utils";

export const STATUSES: AppStatus[] = [
  "Saved",
  "Applied",
  "HR Contacted",
  "Interview",
  "Rejected",
  "Offer",
];

const styles: Record<AppStatus, string> = {
  Saved: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
  Applied: "bg-primary/10 text-primary ring-primary/20",
  "HR Contacted": "bg-violet-500/10 text-violet-400 ring-violet-500/20",
  Interview: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
  Rejected: "bg-rose-500/10 text-rose-500 ring-rose-500/20",
  Offer: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
};

export function StatusBadge({ status }: { status: AppStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

export function statusDotClass(status: AppStatus): string {
  return styles[status];
}
