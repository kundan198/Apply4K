// Shared types for Apply4K extension.
// Shapes mirror /docs/API_CONTRACT.md and /docs/SCORING_RULES.md.

export interface ScrapedJob {
  title: string;
  company: string;
  location?: string;
  description: string;
  url?: string;
  easy_apply?: boolean;
  source?: string; // linkedin | greenhouse | lever | ashby | generic
}

export interface FitScoreBreakdown {
  technical_skill_match: number; // /40
  experience_match: number; // /20
  project_match: number; // /20
  entry_level_friendliness: number; // /10
  location_work_auth_match: number; // /10
}

export type Recommendation = "Apply" | "Maybe" | "Skip";

export interface FitScore {
  total: number; // 0..100
  recommendation: Recommendation;
  breakdown: FitScoreBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  red_flags: string[];
  reasoning: string;
}

export interface ResumeLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ResumeProfile {
  id: number;
  filename: string;
  candidate_name: string;
  email: string | null;
  phone: string | null;
  links: ResumeLinks;
  skills: string[];
  projects: { name: string; description: string; tech: string[] }[];
  education: { school: string; degree: string; year: string }[];
  experience: {
    title: string;
    company: string;
    duration: string;
    highlights: string[];
  }[];
  best_fit_roles: string[];
  missing_keywords: string[];
  raw_text: string;
  created_at: string;
}

export interface ResumeSummary {
  id: number;
  filename: string;
  candidate_name: string;
}

export interface Job {
  id: number;
  title: string;
  company: string;
  location: string | null;
  description: string;
  url: string | null;
  source: string | null;
  easy_apply: boolean;
  score: number | null;
  recommendation: string | null;
  red_flags: string[];
  created_at: string;
}

export type MessageType =
  | "linkedin_note"
  | "recruiter_message"
  | "hr_email"
  | "cover_letter"
  | "follow_up"
  | "thank_you";

// chrome.storage.local persisted settings.
export interface Settings {
  apiBase: string; // default http://localhost:8000
  resumeId: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  apiBase: "http://localhost:8000",
  resumeId: null
};

// UI score bands per SCORING_RULES.md: green >=85, amber 70-84, red <70.
export type ScoreBand = "good" | "warn" | "bad";
export function scoreBand(total: number): ScoreBand {
  if (total >= 85) return "good";
  if (total >= 70) return "warn";
  return "bad";
}

// ---- Messaging protocol between content / popup / background ----

export type BgRequest =
  | { type: "GET_SETTINGS" }
  | { type: "SET_SETTINGS"; settings: Partial<Settings> }
  | { type: "SCORE_JOB"; job: ScrapedJob }
  | { type: "SAVE_JOB"; job: ScrapedJob; score: FitScore | null }
  | {
      type: "GENERATE_MESSAGE";
      job: ScrapedJob;
      messageType: MessageType;
      recruiterName?: string;
    }
  | { type: "LIST_RESUMES" }
  | { type: "GET_PROFILE" }
  // popup -> active tab content script (relayed via background)
  | { type: "REQUEST_SCRAPE" }
  | { type: "REQUEST_AUTOFILL" };

export interface BgOk<T> {
  ok: true;
  data: T;
}
export interface BgErr {
  ok: false;
  error: string;
  offline?: boolean;
}
export type BgResponse<T> = BgOk<T> | BgErr;

// Messages content script accepts directly (from background relay).
export type ContentRequest =
  | { type: "REQUEST_SCRAPE" }
  | { type: "REQUEST_AUTOFILL" };

export interface AutofillResult {
  filled: number;
  fields: string[];
}
