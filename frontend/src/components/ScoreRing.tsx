import { scoreStroke, scoreColor, cn } from "@/lib/utils";

export function ScoreRing({
  score,
  size = 64,
  stroke = 6,
  className,
  label,
  showText = true,
}: {
  score: number | null;
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
  showText?: boolean;
}) {
  const value = score ?? 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={scoreStroke(score)}
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-bold leading-none", scoreColor(score))}
            style={{ fontSize: size * 0.28 }}>
            {score == null ? "—" : value}
          </span>
          {label && (
            <span className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
