# Apply4K — API Contract (v1)

Base URL: `http://localhost:8000`  ·  All routes prefixed `/api`.
JSON in/out unless noted. CORS open to `localhost:5173` and the extension origin.

A single demo user is assumed (`user_id = 1`) — no auth in the MVP. Auth is a Phase-6 concern.

---

## Resume

### `POST /api/resume/upload` — multipart/form-data
- field `file`: PDF resume
- **200** → `ResumeProfile`

### `GET /api/resume` → `ResumeProfile[]`
### `GET /api/resume/{id}` → `ResumeProfile`
### `DELETE /api/resume/{id}` → `{ "ok": true }`

```ts
ResumeProfile = {
  id: number
  filename: string
  candidate_name: string
  email: string | null
  phone: string | null
  links: { linkedin?: string; github?: string; portfolio?: string }
  skills: string[]
  projects: { name: string; description: string; tech: string[] }[]
  education: { school: string; degree: string; year: string }[]
  experience: { title: string; company: string; duration: string; highlights: string[] }[]
  best_fit_roles: string[]
  missing_keywords: string[]
  raw_text: string
  created_at: string  // ISO
}
```

---

## Job scoring

### `POST /api/jobs/score` → `FitScore`
```ts
// request
{
  resume_id: number
  job: {
    title: string
    company: string
    location?: string
    description: string
    url?: string
    easy_apply?: boolean
  }
}
// response
FitScore = {
  total: number                       // 0..100
  recommendation: "Apply" | "Maybe" | "Skip"
  breakdown: {
    technical_skill_match: number     // /40
    experience_match: number          // /20
    project_match: number             // /20
    entry_level_friendliness: number  // /10
    location_work_auth_match: number  // /10
  }
  matched_skills: string[]
  missing_skills: string[]
  red_flags: string[]                 // seniority, clearance, citizenship-only, 3+ yrs, PhD...
  reasoning: string
}
```
> Recommend threshold: `total >= 85` → "Apply".

---

## Jobs (saved)

### `GET /api/jobs` → `Job[]`
### `POST /api/jobs` (body: job + optional score) → `Job`
### `GET /api/jobs/recommendations?resume_id=` → `Job[]`  (top scored, dedup, filtered)

```ts
Job = {
  id: number
  title: string; company: string; location: string | null
  description: string; url: string | null; source: string | null
  easy_apply: boolean
  score: number | null
  recommendation: string | null
  red_flags: string[]
  created_at: string
}
```

---

## Resume tailoring

### `POST /api/tailor` → `TailorResult`
```ts
// request: { resume_id: number, job_description: string, job_title?: string, company?: string }
TailorResult = {
  suggested_keywords: string[]
  rewritten_summary: string
  reordered_projects: { name: string; reason: string }[]
  ats_resume_markdown: string         // ATS-friendly tailored resume
  warnings: string[]                  // e.g. "Do not claim X — not on your resume"
}
```

---

## Message / cover letter generation

### `POST /api/messages` → `{ content: string }`
```ts
// request
{
  type: "linkedin_note" | "recruiter_message" | "hr_email" | "cover_letter"
      | "follow_up" | "thank_you"
  resume_id: number
  job: { title: string; company: string; description?: string }
  recruiter_name?: string
  tone?: "professional" | "friendly" | "concise"
}
```

---

## Application tracker

### `GET /api/applications` → `Application[]`
### `POST /api/applications` → `Application`
### `PATCH /api/applications/{id}` → `Application`
### `DELETE /api/applications/{id}` → `{ ok: true }`

```ts
type AppStatus = "Saved" | "Applied" | "HR Contacted" | "Interview" | "Rejected" | "Offer"
Application = {
  id: number
  company: string; job_title: string; location: string | null
  job_link: string | null
  fit_score: number | null
  resume_version: string | null
  date_applied: string | null        // ISO date
  status: AppStatus
  notes: string | null
  follow_up_date: string | null
  created_at: string; updated_at: string
}
```

---

## Legitimacy / scam checker

### `POST /api/legitimacy/check` → `LegitimacyReport`
```ts
// request: { company: string, url?: string, recruiter_email?: string }
LegitimacyReport = {
  score: number               // 0..100 confidence it's legit
  verdict: "Legit" | "Caution" | "Likely Scam"
  checks: { label: string; passed: boolean; detail: string }[]
}
```

---

## Daily dashboard

### `GET /api/dashboard/daily?resume_id=` → `DailyDashboard`
```ts
DailyDashboard = {
  top_jobs: Job[]                     // top 5 by score
  applications_today: number
  follow_ups_due: Application[]
  best_roles_by_score: { role: string; avg_score: number }[]
  resume_tips: string[]
  weekly_stats: { day: string; applied: number }[]
}
```
