// Mirrors docs/API_CONTRACT.md (v1)

export type ResumeProfile = {
  id: number;
  filename: string;
  candidate_name: string;
  email: string | null;
  phone: string | null;
  links: { linkedin?: string; github?: string; portfolio?: string };
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
  created_at: string; // ISO
};

export type Recommendation = "Apply" | "Maybe" | "Skip";

export type FitScoreBreakdown = {
  technical_skill_match: number; // /40
  experience_match: number; // /20
  project_match: number; // /20
  entry_level_friendliness: number; // /10
  location_work_auth_match: number; // /10
};

export type FitScore = {
  total: number; // 0..100
  recommendation: Recommendation;
  breakdown: FitScoreBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  red_flags: string[];
  reasoning: string;
};

export type JobInput = {
  title: string;
  company: string;
  location?: string;
  description: string;
  url?: string;
  easy_apply?: boolean;
};

export type ScoreRequest = {
  resume_id: number;
  job: JobInput;
};

export type Job = {
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
};

export type JobScrapeRequest = {
  resume_id: number;
  searches?: string[];
  location?: string;
  count?: number;
  posted_hours?: number;
  max_age_days?: number;
  accuracy_first?: boolean;
  min_score?: number;
  limit?: number;
};

export type JobScrapeResult = {
  scraped: number;
  kept: number;
  saved: number;
  tracked: number;
  filtered_closed: number;
  filtered_old: number;
  filtered_duplicate: number;
  filtered_existing: number;
  filtered_role: number;
  filtered_skip: number;
  filtered_low_score: number;
  filtered_no_apply: number;
  filtered_unverified: number;
  min_score: number;
  limit: number;
  jobs: Job[];
};

export type TailorRequest = {
  resume_id: number;
  job_description: string;
  job_title?: string;
  company?: string;
};

export type TailorResult = {
  suggested_keywords: string[];
  rewritten_summary: string;
  reordered_projects: { name: string; reason: string }[];
  ats_resume_markdown: string;
  warnings: string[];
};

export type MessageType =
  | "linkedin_note"
  | "recruiter_message"
  | "hr_email"
  | "cover_letter"
  | "follow_up"
  | "thank_you";

export type MessageTone = "professional" | "friendly" | "concise";

export type MessageRequest = {
  type: MessageType;
  resume_id: number;
  job: { title: string; company: string; description?: string };
  recruiter_name?: string;
  tone?: MessageTone;
};

export type AppStatus =
  | "Saved"
  | "Applied"
  | "HR Contacted"
  | "Interview"
  | "Rejected"
  | "Offer";

export type Application = {
  id: number;
  job_id: number | null;
  resume_id: number | null;
  company: string;
  job_title: string;
  location: string | null;
  job_link: string | null;
  fit_score: number | null;
  resume_version: string | null;
  date_applied: string | null; // ISO date
  status: AppStatus;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
};

export type LegitimacyRequest = {
  company: string;
  url?: string;
  recruiter_email?: string;
};

export type LegitimacyVerdict = "Legit" | "Caution" | "Likely Scam";

export type LegitimacyReport = {
  score: number; // 0..100 confidence it's legit
  verdict: LegitimacyVerdict;
  checks: { label: string; passed: boolean; detail: string }[];
};

export type DailyDashboard = {
  top_jobs: Job[];
  applications_today: number;
  follow_ups_due: Application[];
  best_roles_by_score: { role: string; avg_score: number }[];
  resume_tips: string[];
  weekly_stats: { day: string; applied: number }[];
};
