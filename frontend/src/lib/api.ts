import type {
  Application,
  AppStatus,
  DailyDashboard,
  FitScore,
  Job,
  JobInput,
  JobScrapeRequest,
  JobScrapeResult,
  LegitimacyReport,
  LegitimacyRequest,
  MessageRequest,
  ResumeProfile,
  ScoreRequest,
  TailorRequest,
  TailorResult,
} from "@/types";
import {
  mockApplications,
  mockDashboard,
  mockJobs,
  mockLegit,
  mockMessage,
  mockResumes,
  mockTailor,
} from "./mock";

const envApiBase = import.meta.env.VITE_API_BASE as string | undefined;

export const API_BASE: string =
  envApiBase !== undefined
    ? envApiBase
    : import.meta.env.PROD
      ? ""
      : "http://localhost:8000";

/** True after the first failed request, so the UI can surface "demo mode". */
export const apiState = { usingMock: false };

type FetchOpts = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  isForm?: boolean;
  disableFallback?: boolean;
};

async function request<T>(
  path: string,
  fallback: () => T,
  opts: FetchOpts = {},
): Promise<T> {
  const url = `${API_BASE}/api${path}`;
  try {
    const init: RequestInit = {
      method: opts.method ?? "GET",
      signal: opts.signal,
    };
    if (opts.body !== undefined) {
      if (opts.isForm) {
        init.body = opts.body as FormData;
      } else {
        init.headers = { "Content-Type": "application/json" };
        init.body = JSON.stringify(opts.body);
      }
    }
    const res = await fetch(url, init);
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        if (contentType.includes("application/json")) {
          const body = (await res.json()) as { detail?: unknown };
          if (typeof body.detail === "string") message = body.detail;
        } else {
          const text = await res.text();
          if (text.trim().startsWith("<")) {
            message = `Backend route ${path} returned an HTML page instead of JSON. Check VITE_API_BASE or start the API server.`;
          } else if (text.trim()) {
            message = text.trim().slice(0, 240);
          }
        }
      } catch {
        // Keep the HTTP status when the backend did not return JSON.
      }
      throw new Error(message);
    }
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      const looksLikeHtml = text.trim().startsWith("<");
      throw new Error(
        looksLikeHtml
          ? `Backend route ${path} returned the app HTML instead of JSON. The frontend is not connected to the API. Set VITE_API_BASE to your backend URL or run the backend locally.`
          : `Backend route ${path} returned ${contentType || "unknown content"} instead of JSON.`,
      );
    }
    // DELETE endpoints may return {ok:true}; callers handle shape.
    return (await res.json()) as T;
  } catch (error) {
    if (opts.disableFallback) throw error;
    apiState.usingMock = true;
    // Simulate a little latency so loading states are visible in demo mode.
    await new Promise((r) => setTimeout(r, 350));
    return fallback();
  }
}

// ---- Resume ----------------------------------------------------------------
export const resumeApi = {
  list: () => request<ResumeProfile[]>("/resume", () => mockResumes),
  get: (id: number) =>
    request<ResumeProfile>(
      `/resume/${id}`,
      () => mockResumes.find((r) => r.id === id) ?? mockResumes[0],
    ),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ResumeProfile>("/resume/upload", () => {
      const next: ResumeProfile = {
        ...mockResumes[0],
        id: Math.floor(Math.random() * 9000) + 1000,
        filename: file.name,
        created_at: new Date().toISOString(),
      };
      return next;
    }, { method: "POST", body: form, isForm: true });
  },
  remove: (id: number) =>
    request<{ ok: true }>(`/resume/${id}`, () => ({ ok: true }), {
      method: "DELETE",
    }),
};

// ---- Jobs & scoring --------------------------------------------------------
export const jobsApi = {
  list: () => request<Job[]>("/jobs", () => mockJobs),
  score: (payload: ScoreRequest) =>
    request<FitScore>("/jobs/score", () => deriveScore(payload.job), {
      method: "POST",
      body: payload,
    }),
  save: (payload: { job: JobInput; score?: FitScore }) =>
    request<Job>(
      "/jobs",
      () => ({
        id: Math.floor(Math.random() * 9000) + 1000,
        title: payload.job.title,
        company: payload.job.company,
        location: payload.job.location ?? null,
        description: payload.job.description,
        url: payload.job.url ?? null,
        source: null,
        easy_apply: payload.job.easy_apply ?? false,
        score: payload.score?.total ?? null,
        recommendation: payload.score?.recommendation ?? null,
        red_flags: payload.score?.red_flags ?? [],
        created_at: new Date().toISOString(),
      }),
      { method: "POST", body: payload, disableFallback: true },
    ),
  recommendations: (resumeId: number, limit = 12) =>
    request<Job[]>(
      `/jobs/recommendations?resume_id=${resumeId}&limit=${limit}`,
      () => mockJobs,
    ),
  scrape: (payload: JobScrapeRequest) =>
    request<JobScrapeResult>(
      "/jobs/scrape",
      () => ({
        scraped: mockJobs.length,
        kept: mockJobs.length,
        saved: 0,
        tracked: 0,
        filtered_closed: 0,
        filtered_old: 0,
        filtered_duplicate: 0,
        filtered_existing: 0,
        filtered_role: 0,
        filtered_skip: 0,
        filtered_low_score: 0,
        filtered_no_apply: 0,
        filtered_unverified: 0,
        min_score: payload.min_score ?? 85,
        limit: payload.limit ?? 12,
        jobs: mockJobs,
      }),
      { method: "POST", body: payload, disableFallback: true },
    ),
};

// ---- Tailor ----------------------------------------------------------------
export const tailorApi = {
  run: (payload: TailorRequest) =>
    request<TailorResult>("/tailor", () => mockTailor, {
      method: "POST",
      body: payload,
    }),
};

// ---- Messages --------------------------------------------------------------
export const messagesApi = {
  generate: (payload: MessageRequest) =>
    request<{ content: string }>("/messages", () => mockMessage(payload), {
      method: "POST",
      body: payload,
    }),
};

// ---- Applications ----------------------------------------------------------
export const applicationsApi = {
  list: () => request<Application[]>("/applications", () => mockApplications),
  create: (payload: Partial<Application>) =>
    request<Application>(
      "/applications",
      () => newApplication(payload),
      { method: "POST", body: payload },
    ),
  update: (id: number, payload: Partial<Application>) =>
    request<Application>(
      `/applications/${id}`,
      () => {
        const base =
          mockApplications.find((a) => a.id === id) ?? mockApplications[0];
        return { ...base, ...payload, id, updated_at: new Date().toISOString() };
      },
      { method: "PATCH", body: payload, disableFallback: true },
    ),
  remove: (id: number) =>
    request<{ ok: true }>(`/applications/${id}`, () => ({ ok: true }), {
      method: "DELETE",
      disableFallback: true,
    }),
};

// ---- Legitimacy ------------------------------------------------------------
export const legitimacyApi = {
  check: (payload: LegitimacyRequest) =>
    request<LegitimacyReport>("/legitimacy/check", () => mockLegit, {
      method: "POST",
      body: payload,
    }),
};

// ---- Dashboard -------------------------------------------------------------
export const dashboardApi = {
  daily: (resumeId: number) =>
    request<DailyDashboard>(
      `/dashboard/daily?resume_id=${resumeId}`,
      () => mockDashboard,
    ),
};

// ---- Local helpers ---------------------------------------------------------

function newApplication(p: Partial<Application>): Application {
  const ts = new Date().toISOString();
  return {
    id: Math.floor(Math.random() * 9000) + 1000,
    job_id: p.job_id ?? null,
    resume_id: p.resume_id ?? null,
    company: p.company ?? "",
    job_title: p.job_title ?? "",
    location: p.location ?? null,
    job_link: p.job_link ?? null,
    fit_score: p.fit_score ?? null,
    resume_version: p.resume_version ?? null,
    date_applied: p.date_applied ?? null,
    status: (p.status as AppStatus) ?? "Saved",
    notes: p.notes ?? null,
    follow_up_date: p.follow_up_date ?? null,
    created_at: ts,
    updated_at: ts,
  };
}

/**
 * Lightweight client-side scorer used only as the mock fallback.
 * Mirrors the bands & red-flag rules in docs/SCORING_RULES.md so the demo
 * stays internally consistent even without a backend.
 */
function deriveScore(job: JobInput): FitScore {
  const text = `${job.title} ${job.description}`.toLowerCase();
  const resumeSkills = mockResumes[0].skills.map((s) => s.toLowerCase());

  const jobSkillUniverse = [
    "react",
    "typescript",
    "javascript",
    "python",
    "fastapi",
    "node.js",
    "node",
    "flutter",
    "dart",
    "postgresql",
    "sql",
    "tailwind",
    "docker",
    "aws",
    "graphql",
    "redis",
    "kubernetes",
    "kafka",
    "go",
    "rust",
    "java",
  ];
  const jobSkills = jobSkillUniverse.filter((s) => text.includes(s));
  const matched = jobSkills.filter((s) => resumeSkills.includes(s));
  const missing = jobSkills.filter((s) => !resumeSkills.includes(s));

  const red_flags: string[] = [];
  if (/\b(senior|staff|lead|principal|manager|director|sr\.?|ii|iii)\b/.test(text))
    red_flags.push("Seniority in title");
  const zeroYearOk =
    /\b(0\s*[-–to]+\s*[12]\s*years?|zero\s+years?|no\s+experience|required\s+experience:\s*none|new grad(uate)?|recent grad(uate)?|early career|entry[- ]level)\b/.test(
      text,
    );
  if (
    /\b((at least|minimum|required|requires?|must have|need(s|ed)?)\s*)?([1-9]|1\d)\+?\s*(years?|yrs?)\b/.test(
      text,
    ) &&
    !zeroYearOk
  )
    red_flags.push("Requires prior professional experience");
  if (/\b(clearance|ts\/sci|secret|public trust)\b/.test(text))
    red_flags.push("Requires security clearance");
  if (/(u\.?s\.? citizen|citizenship|itar)/.test(text))
    red_flags.push("U.S. citizenship only");
  if (/\bph\.?d\b/.test(text)) red_flags.push("Requires PhD");

  const skillRatio = jobSkills.length
    ? matched.length / jobSkills.length
    : 0.5;
  const technical_skill_match = Math.round(skillRatio * 40);
  const entryFriendly = /(entry|junior|new grad|associate|0-1 years|0-2 years|intern)/.test(
    text,
  );
  const entry_level_friendliness = entryFriendly ? 10 : 4;
  const experience_match = red_flags.includes("Requires prior professional experience")
    ? 0
    : 20;
  const project_match = Math.round(skillRatio * 18) + 2;
  const loc = (job.location ?? "").toLowerCase();
  const location_work_auth_match = /(remote|fl|florida|tampa|hybrid)/.test(loc)
    ? 10
    : loc
      ? 5
      : 7;

  let total =
    technical_skill_match +
    experience_match +
    project_match +
    entry_level_friendliness +
    location_work_auth_match;
  if (red_flags.length) total = Math.min(total, 55 - red_flags.length * 5);
  total = Math.max(0, Math.min(100, total));

  const recommendation =
    total >= 85 ? "Apply" : total >= 70 ? "Maybe" : "Skip";

  return {
    total,
    recommendation,
    breakdown: {
      technical_skill_match,
      experience_match,
      project_match,
      entry_level_friendliness,
      location_work_auth_match,
    },
    matched_skills: matched.map(titleCase),
    missing_skills: missing.map(titleCase),
    red_flags,
    reasoning: red_flags.length
      ? `This posting trips ${red_flags.length} hard red flag(s): ${red_flags.join(", ")}. Per the scoring rules these force a lower score. ${recommendation === "Skip" ? "Recommend Skip." : ""}`
      : `Matched ${matched.length}/${jobSkills.length || "?"} detected skills and the role looks ${entryFriendly ? "entry-level friendly" : "open"}. Recommend ${recommendation}.`,
  };
}

function titleCase(s: string): string {
  if (s === "fastapi") return "FastAPI";
  if (s === "postgresql") return "PostgreSQL";
  if (s === "aws") return "AWS";
  if (s === "sql") return "SQL";
  if (s === "graphql") return "GraphQL";
  if (s === "node" || s === "node.js") return "Node.js";
  if (s === "typescript") return "TypeScript";
  if (s === "javascript") return "JavaScript";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
