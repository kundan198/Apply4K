import type {
  Application,
  DailyDashboard,
  FitScore,
  Job,
  LegitimacyReport,
  MessageRequest,
  ResumeProfile,
  TailorResult,
} from "@/types";

const now = new Date("2026-06-18T09:00:00Z");
const iso = (offsetDays = 0) =>
  new Date(now.getTime() + offsetDays * 86400000).toISOString();
const dateOnly = (offsetDays = 0) => iso(offsetDays).slice(0, 10);

export const mockResumes: ResumeProfile[] = [
  {
    id: 1,
    filename: "Kundan_Srinivas_SWE_2026.pdf",
    candidate_name: "Kundan Srinivas Sakkuru",
    email: "kundan@skillsgit.io",
    phone: "+1 (813) 555-0142",
    links: {
      linkedin: "linkedin.com/in/kundansrinivas",
      github: "github.com/kundansrinivas",
      portfolio: "kundan.dev",
    },
    skills: [
      "React",
      "TypeScript",
      "Python",
      "FastAPI",
      "Node.js",
      "Flutter",
      "Dart",
      "PostgreSQL",
      "Tailwind CSS",
      "Docker",
      "AWS",
      "REST APIs",
      "Git",
      "Redis",
      "GraphQL",
    ],
    projects: [
      {
        name: "SkillsGit — Dev portfolio builder",
        description:
          "Full-stack platform that turns a GitHub profile into a recruiter-ready portfolio with auto-generated project summaries.",
        tech: ["React", "TypeScript", "FastAPI", "PostgreSQL", "Docker"],
      },
      {
        name: "TrackMate — Job application tracker",
        description:
          "Cross-platform mobile app to track applications, interviews and follow-ups with reminders.",
        tech: ["Flutter", "Dart", "Firebase"],
      },
      {
        name: "InsightLens — Resume keyword analyzer",
        description:
          "NLP tool that extracts and ranks ATS keywords from job descriptions and scores resume coverage.",
        tech: ["Python", "spaCy", "FastAPI", "React"],
      },
    ],
    education: [
      {
        school: "University of South Florida",
        degree: "M.S. Computer Science",
        year: "2024–2026",
      },
      {
        school: "VIT University",
        degree: "B.Tech, Information Technology",
        year: "2019–2023",
      },
    ],
    experience: [
      {
        title: "Software Engineer Intern",
        company: "Brightwave Labs",
        duration: "Summer 2025",
        highlights: [
          "Built a React + FastAPI internal analytics dashboard used by 40+ staff.",
          "Cut API p95 latency 38% by adding Redis caching and query indexing.",
          "Shipped CI pipeline that reduced deploy time from 22 to 6 minutes.",
        ],
      },
      {
        title: "Teaching Assistant — Data Structures",
        company: "University of South Florida",
        duration: "2024–2025",
        highlights: [
          "Led weekly labs for 60 students on algorithms and complexity.",
          "Authored auto-graded assignments in Python.",
        ],
      },
    ],
    best_fit_roles: [
      "Entry-Level Software Engineer",
      "Full-Stack Developer",
      "React Developer",
      "Python Developer",
    ],
    missing_keywords: ["Kubernetes", "CI/CD", "TypeScript testing", "Kafka"],
    raw_text: "Kundan Srinivas Sakkuru — Software Engineer ...",
    created_at: iso(-12),
  },
  {
    id: 2,
    filename: "Kundan_Frontend_Focused.pdf",
    candidate_name: "Kundan Srinivas Sakkuru",
    email: "kundan@skillsgit.io",
    phone: "+1 (813) 555-0142",
    links: {
      linkedin: "linkedin.com/in/kundansrinivas",
      github: "github.com/kundansrinivas",
    },
    skills: [
      "React",
      "TypeScript",
      "Next.js",
      "Tailwind CSS",
      "Redux",
      "Vite",
      "Jest",
      "Playwright",
      "Figma",
    ],
    projects: [
      {
        name: "SkillsGit — Dev portfolio builder",
        description: "Design-system-driven frontend with 60+ components.",
        tech: ["React", "TypeScript", "Tailwind CSS"],
      },
    ],
    education: [
      {
        school: "University of South Florida",
        degree: "M.S. Computer Science",
        year: "2024–2026",
      },
    ],
    experience: [
      {
        title: "Frontend Engineer Intern",
        company: "Brightwave Labs",
        duration: "Summer 2025",
        highlights: [
          "Owned the component library and accessibility pass (WCAG AA).",
        ],
      },
    ],
    best_fit_roles: ["React Developer", "Frontend Engineer"],
    missing_keywords: ["Vue", "SSR caching", "Storybook"],
    raw_text: "Kundan Srinivas Sakkuru — Frontend Engineer ...",
    created_at: iso(-4),
  },
];

export const mockJobs: Job[] = [
  {
    id: 101,
    title: "Software Engineer, New Grad",
    company: "Lumina Health",
    location: "Remote (US)",
    description:
      "Join our platform team building React + Python services. 0–2 years. We love new grads.",
    url: "https://boards.greenhouse.io/lumina/jobs/101",
    source: "Greenhouse",
    easy_apply: true,
    score: 92,
    recommendation: "Apply",
    red_flags: [],
    created_at: iso(-1),
  },
  {
    id: 102,
    title: "Full-Stack Developer (Entry Level)",
    company: "Northstar Analytics",
    location: "Tampa, FL",
    description:
      "TypeScript, React, FastAPI, PostgreSQL. Mentorship-first culture for junior devs.",
    url: "https://jobs.lever.co/northstar/102",
    source: "Lever",
    easy_apply: true,
    score: 88,
    recommendation: "Apply",
    red_flags: [],
    created_at: iso(-1),
  },
  {
    id: 103,
    title: "React Developer",
    company: "Cobalt Studio",
    location: "Hybrid (US)",
    description: "React, Tailwind, Vite. Build delightful product UIs.",
    url: "https://cobalt.studio/careers/103",
    source: "Company site",
    easy_apply: false,
    score: 81,
    recommendation: "Maybe",
    red_flags: [],
    created_at: iso(-2),
  },
  {
    id: 104,
    title: "Python Developer",
    company: "GridPoint AI",
    location: "Remote (US)",
    description: "Backend Python, data pipelines, some ML adjacent work.",
    url: "https://ashbyhq.com/gridpoint/104",
    source: "Ashby",
    easy_apply: true,
    score: 79,
    recommendation: "Maybe",
    red_flags: [],
    created_at: iso(-2),
  },
  {
    id: 105,
    title: "Senior Backend Engineer",
    company: "Vaultline",
    location: "On-site — Austin, TX",
    description: "Senior. 6+ years. US citizenship required, Secret clearance.",
    url: "https://vaultline.com/jobs/105",
    source: "Company site",
    easy_apply: false,
    score: 34,
    recommendation: "Skip",
    red_flags: [
      "Seniority in title (Senior)",
      "Requires 6+ years",
      "U.S. citizenship only",
      "Requires security clearance",
    ],
    created_at: iso(-3),
  },
  {
    id: 106,
    title: "Mobile App Developer (Flutter)",
    company: "Tideline Apps",
    location: "Remote (US)",
    description: "Flutter + Dart, Firebase. New grads welcome.",
    url: "https://wellfound.com/tideline/106",
    source: "Wellfound",
    easy_apply: true,
    score: 86,
    recommendation: "Apply",
    red_flags: [],
    created_at: iso(-3),
  },
];

export const mockFitScore: FitScore = {
  total: 88,
  recommendation: "Apply",
  breakdown: {
    technical_skill_match: 35,
    experience_match: 20,
    project_match: 17,
    entry_level_friendliness: 9,
    location_work_auth_match: 7,
  },
  matched_skills: [
    "React",
    "TypeScript",
    "Python",
    "FastAPI",
    "PostgreSQL",
    "Docker",
  ],
  missing_skills: ["Kubernetes", "Kafka"],
  red_flags: [],
  reasoning:
    "Strong technical overlap on the core stack (React/TypeScript/FastAPI/PostgreSQL) and the role is explicitly entry-level and remote-US, which matches your work-auth and location preferences. Minor gaps on Kubernetes/Kafka are learnable and not must-haves. Recommend Apply.",
};

export const mockApplications: Application[] = [
  {
    id: 201,
    job_id: null,
    resume_id: 1,
    company: "Lumina Health",
    job_title: "Software Engineer, New Grad",
    location: "Remote (US)",
    job_link: "https://boards.greenhouse.io/lumina/jobs/101",
    fit_score: 92,
    resume_version: "Kundan_Srinivas_SWE_2026.pdf",
    date_applied: dateOnly(-1),
    status: "Applied",
    notes: "Referral from USF alum. Recruiter: Dana.",
    follow_up_date: dateOnly(4),
    created_at: iso(-1),
    updated_at: iso(-1),
  },
  {
    id: 202,
    job_id: null,
    resume_id: 1,
    company: "Northstar Analytics",
    job_title: "Full-Stack Developer (Entry Level)",
    location: "Tampa, FL",
    job_link: "https://jobs.lever.co/northstar/102",
    fit_score: 88,
    resume_version: "Kundan_Srinivas_SWE_2026.pdf",
    date_applied: dateOnly(-3),
    status: "HR Contacted",
    notes: "HR screen scheduled.",
    follow_up_date: dateOnly(0),
    created_at: iso(-3),
    updated_at: iso(-1),
  },
  {
    id: 203,
    job_id: null,
    resume_id: 1,
    company: "Tideline Apps",
    job_title: "Mobile App Developer (Flutter)",
    location: "Remote (US)",
    job_link: "https://wellfound.com/tideline/106",
    fit_score: 86,
    resume_version: "Kundan_Srinivas_SWE_2026.pdf",
    date_applied: dateOnly(-6),
    status: "Interview",
    notes: "Tech screen next week — review Flutter state mgmt.",
    follow_up_date: dateOnly(2),
    created_at: iso(-6),
    updated_at: iso(-2),
  },
  {
    id: 204,
    job_id: null,
    resume_id: 1,
    company: "Cobalt Studio",
    job_title: "React Developer",
    location: "Hybrid (US)",
    job_link: "https://cobalt.studio/careers/103",
    fit_score: 81,
    resume_version: "Kundan_Frontend_Focused.pdf",
    date_applied: null,
    status: "Saved",
    notes: "Tailor frontend resume before applying.",
    follow_up_date: null,
    created_at: iso(-2),
    updated_at: iso(-2),
  },
  {
    id: 205,
    job_id: null,
    resume_id: 1,
    company: "GridPoint AI",
    job_title: "Python Developer",
    location: "Remote (US)",
    job_link: "https://ashbyhq.com/gridpoint/104",
    fit_score: 79,
    resume_version: "Kundan_Srinivas_SWE_2026.pdf",
    date_applied: dateOnly(-9),
    status: "Rejected",
    notes: "Auto-reject email. Likely too many applicants.",
    follow_up_date: null,
    created_at: iso(-9),
    updated_at: iso(-5),
  },
];

export const mockTailor: TailorResult = {
  suggested_keywords: [
    "React",
    "TypeScript",
    "FastAPI",
    "REST APIs",
    "PostgreSQL",
    "CI/CD",
    "unit testing",
    "Agile",
  ],
  rewritten_summary:
    "Entry-level full-stack engineer (M.S. CS) who ships production React + FastAPI applications. Internship experience cutting API latency 38% and building dashboards used by 40+ staff. Looking to contribute to a mentorship-first platform team.",
  reordered_projects: [
    {
      name: "SkillsGit — Dev portfolio builder",
      reason:
        "Directly demonstrates the React + FastAPI + PostgreSQL stack in the JD.",
    },
    {
      name: "InsightLens — Resume keyword analyzer",
      reason: "Shows Python + NLP depth relevant to the data-adjacent work.",
    },
    {
      name: "TrackMate — Job application tracker",
      reason: "Secondary; keep but de-emphasize (mobile, less relevant here).",
    },
  ],
  ats_resume_markdown: `# Kundan Srinivas Sakkuru
Remote (US) · kundan@skillsgit.io · linkedin.com/in/kundansrinivas · github.com/kundansrinivas

## Summary
Entry-level full-stack engineer (M.S. CS) shipping production **React + FastAPI** apps. Cut API latency 38% and built dashboards used by 40+ staff during a 2025 internship.

## Skills
React · TypeScript · Python · FastAPI · PostgreSQL · Docker · REST APIs · CI/CD · Git

## Experience
**Software Engineer Intern — Brightwave Labs** (Summer 2025)
- Built a React + FastAPI analytics dashboard used by 40+ staff.
- Cut API p95 latency 38% via Redis caching and query indexing.
- Shipped a CI pipeline reducing deploy time 22→6 minutes.

## Projects
**SkillsGit** — React/TypeScript/FastAPI/PostgreSQL portfolio platform.
**InsightLens** — Python/spaCy ATS keyword analyzer.

## Education
M.S. Computer Science — University of South Florida (2024–2026)
`,
  warnings: [
    "Do not claim Kubernetes experience — it is not on your resume.",
    "JD mentions Kafka; you have not used it. Frame as 'eager to learn' rather than experienced.",
  ],
};

export const mockLegit: LegitimacyReport = {
  score: 82,
  verdict: "Legit",
  checks: [
    {
      label: "Domain age & WHOIS",
      passed: true,
      detail: "Domain registered 8 years ago with consistent ownership.",
    },
    {
      label: "Corporate email domain",
      passed: true,
      detail: "Recruiter email matches the company domain (@lumina.com).",
    },
    {
      label: "Verified careers page",
      passed: true,
      detail: "Posting also appears on the official Greenhouse board.",
    },
    {
      label: "No upfront payment requested",
      passed: true,
      detail: "No mention of fees, gift cards, or equipment deposits.",
    },
    {
      label: "Glassdoor / LinkedIn presence",
      passed: true,
      detail: "1,200+ LinkedIn employees; 4.1 Glassdoor rating.",
    },
    {
      label: "Salary realism",
      passed: false,
      detail: "Listed range is ~25% above market for the title — verify.",
    },
  ],
};

export const mockDashboard: DailyDashboard = {
  top_jobs: mockJobs
    .filter((j) => (j.score ?? 0) >= 70)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5),
  applications_today: 2,
  follow_ups_due: mockApplications.filter(
    (a) => a.follow_up_date && a.follow_up_date <= dateOnly(0),
  ),
  best_roles_by_score: [
    { role: "Entry-Level Software Engineer", avg_score: 90 },
    { role: "Full-Stack Developer", avg_score: 86 },
    { role: "Mobile App Developer", avg_score: 86 },
    { role: "React Developer", avg_score: 81 },
    { role: "Python Developer", avg_score: 79 },
  ],
  resume_tips: [
    "Add a 'CI/CD' bullet — appears in 7 of your top-10 target JDs.",
    "Quantify the TrackMate project (users, retention) to strengthen impact.",
    "Surface TypeScript testing (Jest/Playwright) — frequently requested.",
    "Move SkillsGit to the top; it best matches your highest-scoring roles.",
  ],
  weekly_stats: [
    { day: "Mon", applied: 3 },
    { day: "Tue", applied: 5 },
    { day: "Wed", applied: 2 },
    { day: "Thu", applied: 6 },
    { day: "Fri", applied: 4 },
    { day: "Sat", applied: 1 },
    { day: "Sun", applied: 2 },
  ],
};

const MESSAGE_TEMPLATES: Record<string, (r: MessageRequest) => string> = {
  linkedin_note: (r) =>
    `Hi ${r.recruiter_name ?? "there"}, I just applied for the ${r.job.title} role at ${r.job.company} and would love to connect. I'm a new-grad engineer focused on React + Python and was drawn to your team's work. Happy to share more about my projects whenever helpful!`,
  recruiter_message: (r) =>
    `Hi ${r.recruiter_name ?? "there"} — I recently applied for the ${r.job.title} position at ${r.job.company}. With internship experience shipping React + FastAPI applications and a strong projects portfolio, I'd love a few minutes to discuss how I can contribute. Thank you for your time!`,
  hr_email: (r) =>
    `Subject: Following up — ${r.job.title} application\n\nDear ${r.recruiter_name ?? "Hiring Team"},\n\nI hope you're well. I'm writing to express my continued interest in the ${r.job.title} role at ${r.job.company}. My background in full-stack development (React, TypeScript, Python/FastAPI) aligns closely with the role, and I'd welcome the chance to interview.\n\nThank you for your consideration.\n\nBest regards,\nKundan Srinivas Sakkuru`,
  cover_letter: (r) =>
    `Dear Hiring Manager,\n\nI'm excited to apply for the ${r.job.title} role at ${r.job.company}. As a soon-to-graduate M.S. CS student, I've shipped production React + FastAPI applications, cut API latency 38% in a recent internship, and built a portfolio of full-stack and mobile projects.\n\nWhat draws me to ${r.job.company} is the opportunity to contribute on day one while learning from a strong engineering team. I'd be thrilled to bring my energy and curiosity to your platform.\n\nThank you for your consideration.\n\nSincerely,\nKundan Srinivas Sakkuru`,
  follow_up: (r) =>
    `Hi ${r.recruiter_name ?? "there"}, just following up on my application for the ${r.job.title} role at ${r.job.company} submitted last week. I'm very enthusiastic about the opportunity and happy to provide anything else that's helpful. Thanks so much!`,
  thank_you: (r) =>
    `Hi ${r.recruiter_name ?? "there"}, thank you for taking the time to speak with me about the ${r.job.title} role at ${r.job.company}. I really enjoyed learning about the team and came away even more excited about contributing. Please let me know if there's anything else you need from me!`,
};

export function mockMessage(req: MessageRequest): { content: string } {
  const tmpl = MESSAGE_TEMPLATES[req.type] ?? MESSAGE_TEMPLATES.recruiter_message;
  return { content: tmpl(req) };
}
