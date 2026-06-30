import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Score band per SCORING_RULES.md: green >=85, amber 70-84, red <70. */
export type ScoreBand = "high" | "mid" | "low";

export function scoreBand(score: number | null | undefined): ScoreBand {
  if (score == null) return "low";
  if (score >= 85) return "high";
  if (score >= 70) return "mid";
  return "low";
}

/** Tailwind text color for a score. */
export function scoreColor(score: number | null | undefined): string {
  const band = scoreBand(score);
  return band === "high"
    ? "text-emerald-500"
    : band === "mid"
      ? "text-amber-500"
      : "text-rose-500";
}

/** Hex/HSL stroke color for SVG rings. */
export function scoreStroke(score: number | null | undefined): string {
  const band = scoreBand(score);
  return band === "high" ? "#10b981" : band === "mid" ? "#f59e0b" : "#f43f5e";
}

/** Background + ring tint chips for scores. */
export function scoreChip(score: number | null | undefined): string {
  const band = scoreBand(score);
  return band === "high"
    ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20"
    : band === "mid"
      ? "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20"
      : "bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round(
    (d.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / 86400000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return `in ${diff}d`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
