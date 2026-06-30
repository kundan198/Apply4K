// Typed client for the Apply4K backend (see /docs/API_CONTRACT.md).
// Used inside the service worker (host_permissions cover localhost:8000).

import type {
  FitScore,
  Job,
  MessageType,
  ResumeProfile,
  ResumeSummary,
  ScrapedJob
} from "./types";

export class ApiOfflineError extends Error {
  constructor(message = "Backend offline") {
    super(message);
    this.name = "ApiOfflineError";
  }
}

async function request<T>(
  apiBase: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const base = apiBase.replace(/\/+$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {})
      }
    });
  } catch {
    // Network failure / connection refused => backend not running.
    throw new ApiOfflineError();
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && typeof body.detail === "string") detail = body.detail;
    } catch {
      /* ignore body parse errors */
    }
    throw new Error(detail);
  }
  // Some endpoints may return empty body.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  async scoreJob(
    apiBase: string,
    resumeId: number,
    job: ScrapedJob
  ): Promise<FitScore> {
    return request<FitScore>(apiBase, "/api/jobs/score", {
      method: "POST",
      body: JSON.stringify({
        resume_id: resumeId,
        job: {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          url: job.url,
          easy_apply: job.easy_apply
        }
      })
    });
  },

  async saveJob(
    apiBase: string,
    job: ScrapedJob,
    score: FitScore | null
  ): Promise<Job> {
    return request<Job>(apiBase, "/api/jobs", {
      method: "POST",
      body: JSON.stringify({
        title: job.title,
        company: job.company,
        location: job.location ?? null,
        description: job.description,
        url: job.url ?? null,
        source: job.source ?? null,
        easy_apply: !!job.easy_apply,
        score: score?.total ?? null,
        recommendation: score?.recommendation ?? null,
        red_flags: score?.red_flags ?? []
      })
    });
  },

  // Also record it in the application tracker as "Saved".
  async saveApplication(
    apiBase: string,
    job: ScrapedJob,
    score: FitScore | null
  ): Promise<void> {
    try {
      await request(apiBase, "/api/applications", {
        method: "POST",
        body: JSON.stringify({
          company: job.company,
          job_title: job.title,
          location: job.location ?? null,
          job_link: job.url ?? null,
          fit_score: score?.total ?? null,
          status: "Saved",
          notes: null
        })
      });
    } catch {
      // The /api/jobs save is the source of truth; tracker is best-effort.
    }
  },

  async generateMessage(
    apiBase: string,
    resumeId: number,
    job: ScrapedJob,
    type: MessageType,
    recruiterName?: string
  ): Promise<{ content: string }> {
    return request<{ content: string }>(apiBase, "/api/messages", {
      method: "POST",
      body: JSON.stringify({
        type,
        resume_id: resumeId,
        job: {
          title: job.title,
          company: job.company,
          description: job.description
        },
        recruiter_name: recruiterName,
        tone: "professional"
      })
    });
  },

  async listResumes(apiBase: string): Promise<ResumeSummary[]> {
    const all = await request<ResumeProfile[]>(apiBase, "/api/resume");
    return (all || []).map((r) => ({
      id: r.id,
      filename: r.filename,
      candidate_name: r.candidate_name
    }));
  },

  async getResume(apiBase: string, id: number): Promise<ResumeProfile> {
    return request<ResumeProfile>(apiBase, `/api/resume/${id}`);
  }
};
