import * as React from "react";
import type { Application, AppStatus, FitScore, Job, JobInput } from "@/types";
import { applicationsApi, jobsApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Spinner } from "@/components/common";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/JobCard";
import { ScoreRing } from "@/components/ScoreRing";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { RedFlags } from "@/components/RedFlags";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  CloudLightning,
  ListFilter,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

const ACCURACY_FIRST_SEARCHES = [
  "Software Engineer I",
  "New Grad Software Engineer",
  "Junior Software Engineer",
  "Associate Software Engineer",
  "Full Stack Developer",
  "React Developer",
  "Python Developer",
  "Flutter Developer",
  "Mobile App Developer",
  "AI ML Engineer Entry Level",
  "Backend Developer Entry Level",
];

const RECOMMENDATION_LIMIT = 12;
const LAST_JOB_OUTPUT_KEY = "apply4k-last-job-output-v1";

const RECO_STYLE: Record<string, string> = {
  Apply: "bg-emerald-500 text-white",
  Maybe: "bg-amber-500 text-white",
  Skip: "bg-rose-500 text-white",
};

function norm(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function urlKey(value: string | null | undefined) {
  try {
    const url = new URL(value ?? "");
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return "";
  }
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function jobOutputKey(job: Job) {
  return urlKey(job.url) || `${norm(job.company)}::${norm(job.title)}`;
}

function readLastOutputKeys() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_JOB_OUTPUT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

function writeLastOutputKeys(jobs: Job[]) {
  localStorage.setItem(
    LAST_JOB_OUTPUT_KEY,
    JSON.stringify(jobs.map(jobOutputKey).filter(Boolean)),
  );
}

export default function Jobs() {
  const { activeResume, loading: storeLoading } = useStore();
  const { toast } = useToast();
  const [form, setForm] = React.useState<JobInput>({
    title: "",
    company: "",
    location: "",
    url: "",
    description: "",
    easy_apply: false,
  });
  const [scoring, setScoring] = React.useState(false);
  const [result, setResult] = React.useState<FitScore | null>(null);
  const [recs, setRecs] = React.useState<Job[]>([]);
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [loadingRecs, setLoadingRecs] = React.useState(true);
  const [scraping, setScraping] = React.useState(false);
  const [scrapeSummary, setScrapeSummary] = React.useState<string | null>(null);
  const [updatingAppId, setUpdatingAppId] = React.useState<number | null>(null);
  const [analysisMinimized, setAnalysisMinimized] = React.useState(false);
  const [scoreSectionMinimized, setScoreSectionMinimized] = React.useState(false);

  React.useEffect(() => {
    if (storeLoading) return;
    if (!activeResume) {
      setRecs([]);
      setApplications([]);
      setLoadingRecs(false);
      return;
    }
    setLoadingRecs(true);
    Promise.all([
      jobsApi.recommendations(activeResume.id, RECOMMENDATION_LIMIT),
      applicationsApi.list(),
    ]).then(([jobs, apps]) => {
      setRecs(jobs);
      writeLastOutputKeys(jobs);
      setApplications(apps);
      setLoadingRecs(false);
    }).catch((error) => {
      setLoadingRecs(false);
      toast({
        kind: "error",
        title: "Could not load jobs",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    });
  }, [activeResume, storeLoading, toast]);

  const update = (patch: Partial<JobInput>) =>
    setForm((f) => ({ ...f, ...patch }));

  const score = async () => {
    if (!activeResume) return;
    if (!form.title || !form.company || !form.description) {
      toast({ kind: "error", title: "Missing fields", description: "Title, company and description are required." });
      return;
    }
    setScoring(true);
    setResult(null);
    setAnalysisMinimized(false);
    const res = await jobsApi.score({ resume_id: activeResume.id, job: form });
    setResult(res);
    setScoring(false);
  };

  const saveScored = async () => {
    await jobsApi.save({ job: form, score: result ?? undefined });
    toast({ kind: "success", title: "Job saved", description: `${form.title} at ${form.company}` });
  };

  const applicationForJob = React.useCallback(
    (job: Job) => {
      const jobUrl = urlKey(job.url);
      return applications.find((app) => {
        if (app.job_id === job.id) return true;
        if (jobUrl && urlKey(app.job_link) === jobUrl) return true;
        return norm(app.company) === norm(job.company) && norm(app.job_title) === norm(job.title);
      });
    },
    [applications],
  );

  const updateJobStatus = async (job: Job, status: AppStatus) => {
    const app = applicationForJob(job);
    if (!app) {
      toast({
        kind: "error",
        title: "Tracker row missing",
        description: "Scrape this job into Tracker before changing status.",
      });
      return;
    }
    const previous = app.status;
    setUpdatingAppId(app.id);
    setApplications((prev) =>
      prev.map((item) => (item.id === app.id ? { ...item, status } : item)),
    );
    try {
      const updated = await applicationsApi.update(app.id, {
        status,
        date_applied: status === "Applied" && !app.date_applied ? todayDate() : app.date_applied,
      });
      setApplications((prev) =>
        prev.map((item) => (item.id === app.id ? updated : item)),
      );
      toast({ kind: "success", title: `${job.company}: ${status}` });
    } catch (error) {
      setApplications((prev) =>
        prev.map((item) => (item.id === app.id ? { ...item, status: previous } : item)),
      );
      toast({
        kind: "error",
        title: "Status not updated",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUpdatingAppId(null);
    }
  };

  const runScrape = async () => {
    if (!activeResume) {
      toast({ kind: "error", title: "No resume selected", description: "Upload or select a resume first." });
      return;
    }
    setScraping(true);
    setLoadingRecs(true);
    try {
      const currentOutputKeys = recs.map(jobOutputKey).filter(Boolean);
      const previousOutputKeys = new Set(
        currentOutputKeys.length ? currentOutputKeys : readLastOutputKeys(),
      );
      const result = await jobsApi.scrape({
        resume_id: activeResume.id,
        searches: ACCURACY_FIRST_SEARCHES,
        location: "United States",
        count: 100,
        posted_hours: 72,
        max_age_days: 3,
        accuracy_first: true,
        min_score: 85,
        limit: RECOMMENDATION_LIMIT,
      });
      const apps = await applicationsApi.list();
      setApplications(apps);
      const newJobs = result.jobs
        .filter((job) => !previousOutputKeys.has(jobOutputKey(job)))
        .slice(0, RECOMMENDATION_LIMIT);
      if (newJobs.length > 0) {
        setRecs(newJobs);
        writeLastOutputKeys(newJobs);
      } else {
        writeLastOutputKeys(recs);
      }
      setScrapeSummary(
        `${result.scraped} scraped · ${newJobs.length}/${RECOMMENDATION_LIMIT} new shown · ${result.jobs.length - newJobs.length} hidden from current output · ${result.saved} fresh saved · ${result.tracked} tracked · ${result.kept} passed ${result.min_score}+ · ${result.filtered_existing} already saved/tracked · ${result.filtered_low_score} below 85 · ${result.filtered_skip} hard-skip · ${result.filtered_duplicate} duplicate reposts · ${result.filtered_role} off-target · ${result.filtered_old} old · ${result.filtered_no_apply} without apply links · ${result.filtered_unverified} dead links`,
      );
      toast({
        kind: newJobs.length ? "success" : "info",
        title: newJobs.length ? `Showing ${newJobs.length} new matches` : "No unseen matches this run",
        description: newJobs.length
          ? `${result.tracked} added to Tracker as Saved. Previous output was filtered out.`
          : `I kept your current cards instead of replacing them with repeats or weak matches.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scrape failed.";
      setScrapeSummary(`Scrape failed: ${message}`);
      toast({
        kind: "error",
        title: "Scrape failed",
        description: message,
      });
    } finally {
      setScraping(false);
      setLoadingRecs(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Paste a job description to get an instant fit score, then browse recommendations."
      />

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Score a job</CardTitle>
            <CardDescription>
              Resume: {activeResume?.filename ?? "—"}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScoreSectionMinimized((value) => !value)}
            aria-expanded={!scoreSectionMinimized}
            aria-controls="score-job-section"
          >
            {scoreSectionMinimized ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            {scoreSectionMinimized ? "Expand" : "Minimize"}
          </Button>
        </CardHeader>
        <CardContent id="score-job-section">
          {scoreSectionMinimized ? (
            <div className="grid gap-3 rounded-2xl border border-border/70 bg-secondary/30 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-semibold">
                  {result ? `${result.total}/100 · ${result.recommendation}` : "Manual scoring hidden"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result
                    ? `${form.title || "Untitled role"} ${form.company ? `at ${form.company}` : ""}`
                    : "Use this when you want to paste a single job description. Fresh scrape results stay below."}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setScoreSectionMinimized(false)}>
                Open scorer
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={form.title}
                        onChange={(e) => update({ title: e.target.value })}
                        placeholder="Software Engineer, New Grad"
                      />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input
                        value={form.company}
                        onChange={(e) => update({ company: e.target.value })}
                        placeholder="Lumina Health"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={form.location}
                        onChange={(e) => update({ location: e.target.value })}
                        placeholder="Remote (US)"
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={form.url}
                        onChange={(e) => update({ url: e.target.value })}
                        placeholder="https://…"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Job description</Label>
                    <Textarea
                      rows={7}
                      value={form.description}
                      onChange={(e) => update({ description: e.target.value })}
                      placeholder="Paste the full job description here…"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.easy_apply}
                      onChange={(e) => update({ easy_apply: e.target.checked })}
                      className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
                    />
                    <Zap className="h-4 w-4 text-primary" />
                    Easy Apply
                  </label>
                  <Button onClick={score} disabled={scoring} className="w-full">
                    {scoring ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                    {scoring ? "Scoring…" : "Score this job"}
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-3">
                {!result && !scoring && (
                  <Card className="flex h-full min-h-[18rem] flex-col items-center justify-center border-dashed bg-secondary/20 p-8 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <p className="font-medium">Your fit score appears here</p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Fill in the job details and hit "Score this job" to see a
                      5-dimension breakdown, matched skills, and a recommendation.
                    </p>
                  </Card>
                )}

                {scoring && (
                  <Card className="flex h-full min-h-[18rem] items-center justify-center">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Spinner className="h-5 w-5" /> Analyzing fit…
                    </span>
                  </Card>
                )}

                {result && (
                  <Card className="animate-scale-in">
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Job analysis</CardTitle>
                  <CardDescription>
                    {form.title || "Untitled role"} {form.company ? `at ${form.company}` : ""}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAnalysisMinimized((value) => !value)}
                  aria-expanded={!analysisMinimized}
                  aria-controls="job-fit-analysis"
                >
                  {analysisMinimized ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                  {analysisMinimized ? "Expand" : "Minimize"}
                </Button>
              </CardHeader>
              <CardContent id="job-fit-analysis" className="px-6 pb-6">
                {analysisMinimized ? (
                  <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-secondary/35 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <ScoreRing score={result.total} size={72} stroke={7} label="fit" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-sm font-semibold",
                              RECO_STYLE[result.recommendation],
                            )}
                          >
                            {result.recommendation}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {result.matched_skills.length} matched · {result.missing_skills.length} missing
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {result.reasoning}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setAnalysisMinimized(false)}
                    >
                      View details
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <ScoreRing score={result.total} size={104} stroke={9} label="fit" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-sm font-semibold",
                              RECO_STYLE[result.recommendation],
                            )}
                          >
                            {result.recommendation}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {form.title || "Untitled role"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {result.reasoning}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <h4 className="mb-3 text-sm font-semibold">
                          Score breakdown
                        </h4>
                        <ScoreBreakdown breakdown={result.breakdown} />
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="mb-2 text-sm font-semibold">
                            Matched skills
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {result.matched_skills.length ? (
                              result.matched_skills.map((s) => (
                                <Badge key={s} variant="success">
                                  {s}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">None detected</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="mb-2 text-sm font-semibold">
                            Missing skills
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {result.missing_skills.length ? (
                              result.missing_skills.map((s) => (
                                <Badge key={s} variant="warning">
                                  {s}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">No gaps</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="mb-2 text-sm font-semibold">Red flags</h4>
                          <RedFlags flags={result.red_flags} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
                  <Button variant="success" onClick={saveScored}>
                    <Check className="h-4 w-4" /> Apply
                  </Button>
                  <Button variant="secondary" onClick={saveScored}>
                    <Bookmark className="h-4 w-4" /> Save / Maybe
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => toast({ kind: "info", title: "Skipped" })}
                  >
                    <X className="h-4 w-4" /> Skip
                  </Button>
                </div>
              </CardContent>
            </Card>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <div className="mt-10 mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Recommended for you
          </h2>
          <p className="text-sm text-muted-foreground">
            Accuracy-first: verified-looking direct links, 85+ score, 12 jobs at a time
          </p>
          {scrapeSummary && (
            <p className="mt-1 text-xs text-muted-foreground">{scrapeSummary}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={runScrape}
            disabled={scraping || storeLoading || !activeResume}
          >
            {scraping ? <Spinner className="h-4 w-4" /> : <CloudLightning className="h-4 w-4" />}
            {scraping ? "Scraping…" : "Scrape fresh jobs"}
          </Button>
          <Badge variant="outline">
            <ListFilter className="h-3.5 w-3.5" /> {recs.length} roles
          </Badge>
        </div>
      </div>

      {!activeResume && !storeLoading ? (
        <Card className="p-8 text-center">
          <p className="font-medium">Resume needed before scraping.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload or select your resume first, then this page can score and scrape matching jobs.
          </p>
        </Card>
      ) : loadingRecs ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Spinner className="mr-2 h-5 w-5" /> Loading recommendations…
        </div>
      ) : (
        recs.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recs.map((job) => (
              <JobCard
                key={jobOutputKey(job)}
                job={job}
                status={applicationForJob(job)?.status}
                updatingStatus={updatingAppId === applicationForJob(job)?.id}
                onStatusChange={updateJobStatus}
                onApply={(j) => updateJobStatus(j, "Applied")}
                onSave={(j) => updateJobStatus(j, "Saved")}
                onSkip={(j) => updateJobStatus(j, "Rejected")}
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="font-medium">No unseen jobs in this scrape.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              I filtered out jobs that were already shown so you do not waste time on repeats.
            </p>
          </Card>
        )
      )}
    </div>
  );
}
