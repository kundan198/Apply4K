import type { AppStatus, Job } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ScoreRing } from "./ScoreRing";
import { STATUSES, StatusBadge } from "./StatusBadge";
import { Zap, MapPin, Bookmark, Check, X, ExternalLink } from "lucide-react";

const STATUS_OPTS = STATUSES.map((status) => ({ value: status, label: status }));

const STATUS_SURFACE: Record<AppStatus, string> = {
  Saved:
    "border-slate-400/35 bg-slate-500/[0.08] shadow-[0_0_0_1px_rgba(148,163,184,0.08)]",
  Applied:
    "border-primary/45 bg-primary/[0.10] shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]",
  "HR Contacted":
    "border-violet-400/45 bg-violet-500/[0.10] shadow-[0_0_0_1px_rgba(167,139,250,0.12)]",
  Interview:
    "border-amber-400/45 bg-amber-500/[0.11] shadow-[0_0_0_1px_rgba(245,158,11,0.12)]",
  Rejected:
    "border-rose-400/45 bg-rose-500/[0.10] opacity-90 shadow-[0_0_0_1px_rgba(244,63,94,0.10)]",
  Offer:
    "border-emerald-400/50 bg-emerald-500/[0.12] shadow-[0_0_28px_rgba(16,185,129,0.16)]",
};

const STATUS_BUTTON: Record<AppStatus, string> = {
  Saved: "bg-slate-500/15 text-slate-200 ring-slate-400/25",
  Applied: "bg-primary/15 text-primary ring-primary/30",
  "HR Contacted": "bg-violet-500/15 text-violet-300 ring-violet-400/30",
  Interview: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  Rejected: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  Offer: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
};

export function JobCard({
  job,
  onSave,
  onApply,
  onSkip,
  status,
  updatingStatus,
  onStatusChange,
}: {
  job: Job;
  onSave?: (j: Job) => void;
  onApply?: (j: Job) => void;
  onSkip?: (j: Job) => void;
  status?: AppStatus;
  updatingStatus?: boolean;
  onStatusChange?: (job: Job, status: AppStatus) => void;
}) {
  const surface = status ? STATUS_SURFACE[status] : "bg-card";
  return (
    <Card
      className={cn(
        "group flex min-h-[18rem] flex-col overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-glow",
        surface,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold leading-tight">{job.title}</h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {job.company}
          </p>
        </div>
        <ScoreRing score={job.score} size={56} stroke={5} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {status && <StatusBadge status={status} />}
        {job.location && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {job.location}
          </span>
        )}
        {job.easy_apply && (
          <Badge variant="default">
            <Zap className="h-3 w-3" />
            Easy Apply
          </Badge>
        )}
        {job.source && <Badge variant="outline">{job.source}</Badge>}
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
        {job.description}
      </p>

      {job.red_flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.red_flags.slice(0, 2).map((f) => (
            <Badge key={f} variant="danger">
              {f}
            </Badge>
          ))}
          {job.red_flags.length > 2 && (
            <Badge variant="danger">+{job.red_flags.length - 2}</Badge>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-4">
        <Button
          size="sm"
          variant="success"
          onClick={() => onApply?.(job)}
          className={cn(status === "Applied" && "ring-2 ring-emerald-300/40")}
        >
          <Check className="h-3.5 w-3.5" />
          Apply
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onSave?.(job)}
          className={cn(status === "Saved" && "ring-2 ring-slate-300/30")}
        >
          <Bookmark className="h-3.5 w-3.5" />
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onSkip?.(job)}
          className={cn(status === "Rejected" && "bg-rose-500/10 text-rose-300")}
        >
          <X className="h-3.5 w-3.5" />
          Skip
        </Button>
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Open posting"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      {status && onStatusChange && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-2 grid grid-cols-3 gap-1.5">
            {(["Saved", "Applied", "Interview"] as AppStatus[]).map((quickStatus) => (
              <button
                key={quickStatus}
                type="button"
                onClick={() => onStatusChange(job, quickStatus)}
                disabled={updatingStatus || status === quickStatus}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-[11px] font-semibold ring-1 transition-all hover:-translate-y-0.5 disabled:cursor-default disabled:opacity-100",
                  status === quickStatus
                    ? STATUS_BUTTON[quickStatus]
                    : "bg-background/60 text-muted-foreground ring-border hover:text-foreground",
                )}
              >
                {quickStatus === "HR Contacted" ? "HR" : quickStatus}
              </button>
            ))}
          </div>
          <Select
            value={status}
            onChange={(e) => onStatusChange(job, e.target.value as AppStatus)}
            options={STATUS_OPTS}
            disabled={updatingStatus}
            className="h-9 w-full text-xs"
          />
        </div>
      )}
    </Card>
  );
}
