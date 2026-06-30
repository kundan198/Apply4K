# Apply4K — Scoring & Filtering Rules (the "brain")

Shared by the backend scorer and the extension overlay so scores are consistent everywhere.

## Candidate profile (defaults)
```yaml
name: Kundan Srinivas Sakkuru
target_roles:
  - Entry-Level Software Engineer
  - Junior Software Developer
  - Full-Stack Developer
  - React Developer
  - Python Developer
  - Flutter Developer
  - Mobile App Developer
  - Backend Developer
  - Data Engineer
  - AI/ML Engineer
locations: [Remote US, Tampa FL, Florida, Hybrid US]
work_auth: International student; H-1B sponsorship NOT required
experience_level: New grad / 0 professional years required
```

## Fit score (out of 100)
| Dimension | Max | How |
|-----------|-----|-----|
| Technical skill match | 40 | overlap(job skills, resume skills) / job skills, weighted by must-haves |
| Experience match | 20 | full points for new-grad / no-experience / 0-year roles; hard skip when a posting explicitly requires prior professional years |
| Project match | 20 | resume projects' tech vs job stack |
| Entry-level friendliness | 10 | keywords: "entry", "junior", "new grad", "associate", "0-1 years", "0-2 years", internship-to-FT |
| Location / work auth | 10 | Remote US / FL / hybrid US match; penalize on-site outside FL |

**Recommend only when `total >= 85`.** UI bands: green ≥85, amber 70–84, red <70.

## Hard red flags (subtract heavily / force "Skip")
- Seniority in title: senior, staff, lead, principal, manager, director, "II"/"III", "Sr."
- Requires explicit prior professional experience such as **1+ years**, **2 years required**, **minimum 1 year**, etc., unless the same posting clearly says new grad / no experience / 0–1 / 0–2 years accepted
- Requires security **clearance** (TS/SCI, Secret, Public Trust)
- **U.S. citizenship only** / "must be US citizen" / ITAR
- Requires **PhD** (when not the candidate's level)
- Unrelated stack with zero overlap (e.g. pure Salesforce/SAP/COBOL/.NET-only with no transferable skills)
- Requires H-1B sponsorship to be unavailable AND role needs work auth the candidate lacks — note, don't hard-block (candidate doesn't need sponsorship)

## Source preferences (recommendation engine)
- **Prefer** direct-apply: Greenhouse, Lever, Ashby, Wellfound, YC, company career pages, LinkedIn Easy Apply
- **Avoid** Indeed reposts and aggregator duplicates
- Dedup by normalized `(company, title)` and by URL host+path
- Drop expired postings (no apply link / 404 / >45 days old when date known)

## Accuracy-first scraper mode
- Search priority: Software Engineer I, New Grad Software Engineer, Junior Software Engineer,
  Associate Software Engineer, Full Stack Developer, React Developer, Python Developer,
  Flutter Developer, Mobile App Developer, AI/ML Engineer - Entry Level,
  Backend Developer - Entry Level.
- Save/show only jobs with score `>=85`.
- Return 5-10 jobs per scrape run.
- Require a direct apply URL when available and verify non-LinkedIn ATS/company links
  with a lightweight live-link check.
- Keep this filter source-agnostic so LinkedIn, YC, Wellfound, Greenhouse, Lever,
  Ashby, company pages, BuiltIn, Otta/Welcome to the Jungle, SimplifyJobs, and
  future GitHub careers scrapers can all feed the same quality gate.
