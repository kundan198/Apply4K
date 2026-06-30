import * as React from "react";
import { Link } from "react-router-dom";
import type { Application, AppStatus, DailyDashboard, Job } from "@/types";
import { applicationsApi, dashboardApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { PageHeader, Spinner } from "@/components/common";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ScoreRing";
import { StatusBadge, STATUSES } from "@/components/StatusBadge";
import { cn, relativeDay, scoreColor } from "@/lib/utils";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Crown,
  Flame,
  Flag,
  Gauge,
  Lightbulb,
  LineChart,
  Rocket,
  Send,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  Zap,
} from "lucide-react";

const TARGET_KEY = "apply4k-daily-application-target-v2";
const DEFAULT_DAILY_TARGET = 20;
const XP_PER_APPLICATION = 120;
const XP_PER_FOLLOW_UP = 35;
const XP_PER_STATUS_UPDATE = 20;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dayKey(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function statusCounts(apps: Application[]) {
  return STATUSES.reduce(
    (acc, status) => {
      acc[status] = apps.filter((app) => app.status === status).length;
      return acc;
    },
    {} as Record<AppStatus, number>,
  );
}

function currentStreak(weeklyStats: DailyDashboard["weekly_stats"]) {
  let streak = 0;
  for (let i = weeklyStats.length - 1; i >= 0; i -= 1) {
    if (weeklyStats[i].applied <= 0) break;
    streak += 1;
  }
  return streak;
}

function rankForXp(xp: number) {
  if (xp >= 900) return "Offer Hunter";
  if (xp >= 600) return "Interview Raider";
  if (xp >= 300) return "Pipeline Builder";
  return "New Grad Scout";
}

function matchApplication(job: Job, apps: Application[]) {
  return apps.find((app) => app.job_id === job.id);
}

function ProgressBar({
  value,
  className,
  tone = "quest",
}: {
  value: number;
  className?: string;
  tone?: "quest" | "success" | "neutral";
}) {
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-secondary shadow-inner", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700",
          tone === "success"
            ? "bg-emerald-500"
            : tone === "neutral"
              ? "bg-primary"
              : "bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500",
        )}
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}

function QuestCard({
  title,
  detail,
  progress,
  icon,
  action,
  done,
}: {
  title: string;
  detail: string;
  progress: number;
  icon: React.ReactNode;
  action?: React.ReactNode;
  done?: boolean;
}) {
  return (
    <Card
      className={cn(
        "min-h-[7.25rem] p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-glow",
        done ? "border-emerald-500/35 bg-emerald-500/5" : "bg-card/95",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            done ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/10 text-primary",
          )}
        >
          {done ? <CheckCircle2 className="h-5 w-5" /> : icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{title}</p>
            <Badge variant={done ? "success" : "outline"}>{Math.round(Math.min(progress, 100))}%</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          <ProgressBar value={progress} tone={done ? "success" : "quest"} className="mt-2.5 h-1.5" />
          {action && <div className="mt-2.5">{action}</div>}
        </div>
      </div>
    </Card>
  );
}

function QuestCircle({
  applied,
  target,
  progress,
  complete,
  onDecrease,
  onIncrease,
}: {
  applied: number;
  target: number;
  progress: number;
  complete: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const displayProgress = Math.max(0, Math.min(progress, 100));
  const milestones = [25, 50, 75, 100];

  return (
    <div className="group relative flex h-40 w-40 items-center justify-center">
      <div className="quest-pulse absolute inset-3 rounded-full bg-primary/10 blur-xl" />
      <div className="absolute inset-0 rounded-full border border-border bg-background/60 shadow-soft transition-transform duration-300 group-hover:scale-[1.03]" />
      <div className="quest-orbit pointer-events-none absolute inset-2 rounded-full border border-dashed border-primary/25" />

      {milestones.map((milestone, index) => {
        const angle = (milestone / 100) * 360 - 90;
        const active = displayProgress >= milestone;
        return (
          <div
            key={milestone}
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2"
            style={{
              transform: `rotate(${angle}deg) translate(70px) rotate(${-angle}deg)`,
            }}
          >
            <span
              className={cn(
                "block h-2.5 w-2.5 rounded-full ring-4 ring-background transition-all",
                active ? "bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.75)]" : "bg-border",
                index === 3 && complete && "bg-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.85)]",
              )}
            />
          </div>
        );
      })}

      <button
        type="button"
        onClick={onDecrease}
        className="absolute -left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-sm font-bold shadow-soft transition-all hover:-translate-x-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Lower daily target"
      >
        -1
      </button>
      <button
        type="button"
        onClick={onIncrease}
        className="absolute -right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-sm font-bold shadow-soft transition-all hover:translate-x-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Raise daily target"
      >
        +1
      </button>

      <div className="relative transition-transform duration-300 group-hover:scale-[1.04]">
        <ScoreRing
          score={Math.round(displayProgress)}
          size={126}
          stroke={10}
          label={complete ? "cleared" : "quest"}
          showText={false}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[3.2rem] text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          applications
        </p>
        <p className="mt-1 text-2xl font-black tabular-nums tracking-tight">
          {applied}<span className="text-lg text-muted-foreground">/{target}</span>
        </p>
      </div>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/90 px-2.5 py-1 text-[11px] font-medium shadow-soft">
        <Target className="h-3 w-3 text-primary" />
        {Math.max(target - applied, 0)} left
      </div>
    </div>
  );
}

function ApplicationMomentumGraph({
  weeklyStats,
  target,
  appliedToday,
  targetProgress,
  weeklyApplied,
  pipelinePower,
  followUpsDue,
  counts,
}: {
  weeklyStats: DailyDashboard["weekly_stats"];
  target: number;
  appliedToday: number;
  targetProgress: number;
  weeklyApplied: number;
  pipelinePower: number;
  followUpsDue: number;
  counts: Record<AppStatus, number>;
}) {
  const [selectedDay, setSelectedDay] = React.useState(weeklyStats[weeklyStats.length - 1]?.day ?? "");
  const selected =
    weeklyStats.find((day) => day.day === selectedDay) ??
    weeklyStats[weeklyStats.length - 1] ??
    { day: todayKey(), applied: appliedToday };
  const maxValue = Math.max(...weeklyStats.map((day) => day.applied), target, 1);
  const points = weeklyStats.map((day, index) => {
    const x = 18 + index * (264 / Math.max(weeklyStats.length - 1, 1));
    const y = 128 - (day.applied / maxValue) * 104;
    return { x, y, day };
  });
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const targetY = 128 - (target / maxValue) * 104;
  const completion = Math.min(100, Math.round(targetProgress));
  const dailyMood =
    appliedToday >= target
      ? "Target reached"
      : appliedToday >= Math.ceil(target * 0.5)
        ? "Strong pace"
        : "Start with one";

  return (
    <div className="relative border-t border-border bg-background/70 p-3.5 backdrop-blur-sm xl:border-l xl:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LineChart className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Momentum graph
              </p>
              <p className="text-sm font-bold">{dailyMood}</p>
            </div>
          </div>
        </div>
        <Badge variant={appliedToday >= target ? "success" : "outline"}>
          {appliedToday}/{target} today
        </Badge>
      </div>

      <div className="mt-4 rounded-2xl border border-border/70 bg-card/75 p-3.5 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Application pace</p>
            <p className="hidden text-xs text-muted-foreground min-[560px]:block">
              Click a day to inspect your run.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black tabular-nums">{weeklyApplied}</p>
            <p className="text-xs text-muted-foreground">this week</p>
          </div>
        </div>

        <div className="relative">
          <svg
            viewBox="0 0 300 150"
            role="img"
            aria-label="Weekly application momentum"
            className="h-24 w-full overflow-visible min-[560px]:h-28"
          >
            <line
              x1="18"
              x2="282"
              y1={targetY}
              y2={targetY}
              stroke="currentColor"
              strokeDasharray="5 7"
              className="text-emerald-500/45"
              strokeWidth="2"
            />
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              className="text-primary drop-shadow-sm"
            />
            {points.map((point) => {
              const active = point.day.day === selected.day;
              const metTarget = point.day.applied >= target;
              return (
                <g key={point.day.day}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={active ? 8 : 5}
                    className={cn(
                      "cursor-pointer transition-all",
                      metTarget ? "fill-emerald-500" : active ? "fill-primary" : "fill-muted-foreground",
                    )}
                    onClick={() => setSelectedDay(point.day.day)}
                  />
                  {active && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary/30"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          <div className="grid grid-cols-7 gap-1">
            {weeklyStats.map((day) => {
              const active = day.day === selected.day;
              const height = Math.max((day.applied / maxValue) * 100, day.applied ? 18 : 6);
              const weekday = new Date(`${day.day}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
              return (
                <button
                  key={day.day}
                  type="button"
                  onClick={() => setSelectedDay(day.day)}
                  aria-label={`Select ${weekday}, ${day.applied} applications`}
                  className={cn(
                    "group flex min-w-0 flex-col items-center gap-1 rounded-lg border p-1 transition-all hover:-translate-y-0.5 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary bg-primary/10" : "border-border/70 bg-background/60",
                  )}
                >
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {weekday}
                  </span>
                  <span className="flex h-8 w-full items-end rounded-md bg-secondary/60 p-1 min-[560px]:h-10">
                    <span
                      className={cn(
                        "block w-full rounded-md transition-all duration-500",
                        day.applied >= target ? "bg-emerald-500" : day.applied > 0 ? "bg-primary" : "bg-border",
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </span>
                  <span className="text-xs font-bold tabular-nums">{day.applied}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 min-[560px]:grid-cols-4">
        <GraphStat
          icon={<Target className="h-4 w-4" />}
          label="Today"
          value={`${completion}%`}
          detail={`${Math.max(target - appliedToday, 0)} left`}
        />
        <GraphStat
          icon={<Activity className="h-4 w-4" />}
          label="Pipeline"
          value={`${pipelinePower}%`}
          detail={`${counts.Interview + counts.Offer} hot`}
        />
        <GraphStat
          icon={<TimerReset className="h-4 w-4" />}
          label="Follow-ups"
          value={followUpsDue}
          detail={followUpsDue ? "due now" : "clear"}
        />
        <GraphStat
          icon={<BarChart3 className="h-4 w-4" />}
          label="Selected"
          value={selected.applied}
          detail={new Date(`${selected.day}T00:00:00`).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { activeResume, loading: storeLoading } = useStore();
  const [data, setData] = React.useState<DailyDashboard | null>(null);
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [target, setTarget] = React.useState(() => {
    const stored = Number(localStorage.getItem(TARGET_KEY));
    return Number.isFinite(stored) && stored >= 1 ? stored : DEFAULT_DAILY_TARGET;
  });

  React.useEffect(() => {
    localStorage.setItem(TARGET_KEY, String(target));
  }, [target]);

  React.useEffect(() => {
    if (!activeResume) return;
    setLoading(true);
    Promise.all([
      dashboardApi.daily(activeResume.id),
      applicationsApi.list(),
    ]).then(([daily, apps]) => {
      setData(daily);
      setApplications(apps);
      setLoading(false);
    });
  }, [activeResume]);

  if (storeLoading || loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Spinner className="mr-2 h-5 w-5" /> Loading your mission board...
      </div>
    );
  }

  const today = todayKey();
  const counts = statusCounts(applications);
  const appliedToday = applications.filter((app) => dayKey(app.date_applied) === today).length;
  const updatedToday = applications.filter((app) => dayKey(app.updated_at) === today).length;
  const followUpsDue = data.follow_ups_due.length;
  const targetProgress = (appliedToday / target) * 100;
  const weeklyApplied = data.weekly_stats.reduce((sum, day) => sum + day.applied, 0);
  const streak = currentStreak(data.weekly_stats);
  const xpToday =
    appliedToday * XP_PER_APPLICATION +
    Math.min(followUpsDue, 3) * XP_PER_FOLLOW_UP +
    Math.min(updatedToday, 5) * XP_PER_STATUS_UPDATE;
  const nextJob =
    data.top_jobs.find((job) => matchApplication(job, applications)?.status === "Saved") ??
    data.top_jobs[0];
  const nextJobApp = nextJob ? matchApplication(nextJob, applications) : undefined;
  const pipelinePower = Math.min(
    100,
    counts.Applied * 12 + counts["HR Contacted"] * 18 + counts.Interview * 25 + counts.Offer * 35,
  );
  const dailyComplete = appliedToday >= target;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Mission Control, ${activeResume?.candidate_name.split(" ")[0] ?? "there"}`}
        description="Win today by turning strong matches into real applications."
        action={
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1 shadow-soft">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTarget((value) => Math.max(1, value - 1))}
              aria-label="Decrease daily target"
            >
              -1
            </Button>
            <Badge variant="default" className="h-8 min-w-28 justify-center px-3">
              <Target className="h-3.5 w-3.5" />
              Target {target}/day
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTarget((value) => Math.min(DEFAULT_DAILY_TARGET, value + 1))}
              aria-label="Increase daily target"
            >
              +1
            </Button>
          </div>
        }
      />

      <section className="mission-surface mission-grid overflow-hidden rounded-2xl border border-border shadow-card">
        <div className="grid gap-0 min-[560px]:grid-cols-[0.98fr_1.02fr]">
          <div className="relative bg-card/80 p-5 backdrop-blur-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={dailyComplete ? "success" : "default"}>
                <Activity className="h-3.5 w-3.5" />
                {dailyComplete ? "Daily pace complete" : "Daily pace active"}
              </Badge>
              <Badge variant="outline">
                <Flame className="h-3.5 w-3.5" />
                {streak} day streak
              </Badge>
              <Badge variant="outline">
                <Crown className="h-3.5 w-3.5" />
                {rankForXp(xpToday)}
              </Badge>
            </div>

            <div className="mt-5 grid gap-5 min-[920px]:grid-cols-[auto_1fr] min-[920px]:items-center">
              <QuestCircle
                applied={appliedToday}
                target={target}
                progress={targetProgress}
                complete={dailyComplete}
                onDecrease={() => setTarget((value) => Math.max(1, value - 1))}
                onIncrease={() => setTarget((value) => Math.min(DEFAULT_DAILY_TARGET, value + 1))}
              />
              <div>
                <h2 className="max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
                  {dailyComplete ? "You gave today real momentum." : "Each application lifts the graph."}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Keep the rhythm simple: find fresh matches, apply to the strongest ones, then update Tracker so your pipeline stays clear.
                </p>
                <div className="mt-4 grid gap-2.5 min-[420px]:grid-cols-3">
                  <MetricTile icon={<Zap className="h-4 w-4" />} label="XP today" value={xpToday} compact />
                  <MetricTile icon={<Gauge className="h-4 w-4" />} label="Pipeline power" value={`${pipelinePower}%`} compact />
                  <MetricTile icon={<Trophy className="h-4 w-4" />} label="This week" value={weeklyApplied} compact />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/jobs">
                    <Button>
                      <Rocket className="h-4 w-4" />
                      Find today's matches
                    </Button>
                  </Link>
                  <Link to="/tracker">
                    <Button variant="secondary">
                      <ClipboardCheck className="h-4 w-4" />
                      Update tracker
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <ApplicationMomentumGraph
            weeklyStats={data.weekly_stats}
            target={target}
            appliedToday={appliedToday}
            targetProgress={targetProgress}
            weeklyApplied={weeklyApplied}
            pipelinePower={pipelinePower}
            followUpsDue={followUpsDue}
            counts={counts}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 xl:grid-cols-4">
        <QuestCard
          title="Main quest"
          detail={`${Math.max(target - appliedToday, 0)} applications left today`}
          progress={targetProgress}
          icon={<Flag className="h-5 w-5" />}
          done={dailyComplete}
          action={
            <Link to="/jobs" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Go apply <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <QuestCard
          title="Follow-up raid"
          detail={followUpsDue ? `${followUpsDue} follow-up(s) due` : "No follow-ups due"}
          progress={followUpsDue ? 25 : 100}
          icon={<TimerReset className="h-5 w-5" />}
          done={followUpsDue === 0}
          action={
            <Link to="/tracker" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Open tracker <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <QuestCard
          title="Pipeline polish"
          detail={`${updatedToday} tracker update(s) today`}
          progress={Math.min(100, updatedToday * 25)}
          icon={<ClipboardCheck className="h-5 w-5" />}
          done={updatedToday >= 4}
        />
        <QuestCard
          title="Match hunt"
          detail={`${data.top_jobs.length} high-fit jobs ready`}
          progress={Math.min(100, data.top_jobs.length * 20)}
          icon={<Sparkles className="h-5 w-5" />}
          done={data.top_jobs.length >= 5}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden bg-card/95">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Boss Match</CardTitle>
              <CardDescription>The strongest next card to move today</CardDescription>
            </div>
            <Link to="/jobs" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View jobs <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {nextJob ? (
              <div className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
                <ScoreRing score={nextJob.score} size={92} stroke={8} label="fit" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold">{nextJob.title}</h3>
                    {nextJobApp && <StatusBadge status={nextJobApp.status} />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {nextJob.company} · {nextJob.location ?? "Location unknown"}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{nextJob.description}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Link to="/jobs">
                    <Button size="sm" className="w-full">
                      <Send className="h-3.5 w-3.5" />
                      Act now
                    </Button>
                  </Link>
                  {nextJob.url && (
                    <a href={nextJob.url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="w-full">
                        Posting
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No saved matches yet. Run the scraper to generate today's quest list.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/95">
          <CardHeader>
            <CardTitle>Status Map</CardTitle>
            <CardDescription>Your current application pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {STATUSES.map((status) => {
              const value = counts[status];
              const total = Math.max(applications.length, 1);
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <StatusBadge status={status} />
                    <span className="font-semibold tabular-nums">{value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        status === "Offer" ? "bg-emerald-500" :
                          status === "Interview" ? "bg-amber-500" :
                            status === "Rejected" ? "bg-rose-500" :
                              status === "HR Contacted" ? "bg-violet-500" :
                                status === "Applied" ? "bg-primary" : "bg-slate-500",
                      )}
                      style={{ width: `${(value / total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-3">
        <Card className="bg-card/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Power-ups
            </CardTitle>
            <CardDescription>Small upgrades that raise your odds</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.resume_tips.map((tip, index) => (
                <li key={tip} className="flex gap-3 text-sm">
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    index === 0 ? "bg-emerald-500/15 text-emerald-500" :
                      index === 1 ? "bg-sky-500/15 text-sky-500" : "bg-violet-500/15 text-violet-400",
                  )}>
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card/95">
          <CardHeader>
            <CardTitle>Follow-up Radar</CardTitle>
            <CardDescription>Keep warm leads from going cold</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.follow_ups_due.length === 0 && (
              <div className="rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
                Clear board. No follow-ups are due today.
              </div>
            )}
            {data.follow_ups_due.slice(0, 5).map((app) => (
              <div key={app.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{app.company}</p>
                  <p className="truncate text-xs text-muted-foreground">{app.job_title}</p>
                </div>
                <Badge variant="warning">{relativeDay(app.follow_up_date)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/95">
          <CardHeader>
            <CardTitle>Best Role Classes</CardTitle>
            <CardDescription>Where your score is strongest</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.best_roles_by_score.map((role) => (
              <div key={role.role}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{role.role}</span>
                  <span className={cn("font-semibold tabular-nums", scoreColor(role.avg_score))}>
                    {role.avg_score}
                  </span>
                </div>
                <ProgressBar value={role.avg_score} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-background/70 p-3 shadow-soft",
        compact && "p-2.5",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-xs">{label}</span>
      </div>
      <p className={cn("mt-1 font-bold tabular-nums", compact ? "text-xl" : "text-2xl")}>{value}</p>
    </div>
  );
}

function GraphStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-2.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/50">
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <p className="text-lg font-black leading-none tabular-nums">{value}</p>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="truncate font-semibold">{detail}</span>
      </div>
    </div>
  );
}
