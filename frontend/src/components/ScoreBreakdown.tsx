import type { FitScoreBreakdown } from "@/types";
import { Progress } from "@/components/ui/progress";

const DIMENSIONS: {
  key: keyof FitScoreBreakdown;
  label: string;
  max: number;
}[] = [
  { key: "technical_skill_match", label: "Technical skill match", max: 40 },
  { key: "experience_match", label: "Experience match", max: 20 },
  { key: "project_match", label: "Project match", max: 20 },
  { key: "entry_level_friendliness", label: "Entry-level friendliness", max: 10 },
  { key: "location_work_auth_match", label: "Location / work auth", max: 10 },
];

export function ScoreBreakdown({ breakdown }: { breakdown: FitScoreBreakdown }) {
  return (
    <div className="space-y-3.5">
      {DIMENSIONS.map((d) => {
        const val = breakdown[d.key];
        const pct = (val / d.max) * 100;
        const tone =
          pct >= 80
            ? "bg-emerald-500"
            : pct >= 55
              ? "bg-amber-500"
              : "bg-rose-500";
        return (
          <div key={d.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-semibold tabular-nums">
                {val}
                <span className="text-muted-foreground">/{d.max}</span>
              </span>
            </div>
            <Progress value={pct} indicatorClassName={tone} />
          </div>
        );
      })}
    </div>
  );
}
