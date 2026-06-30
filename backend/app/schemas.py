"""Pydantic v2 schemas matching API_CONTRACT.md exactly.

Python 3.9 compatible: uses Optional[X]/List[X] from typing rather than `X | None`.
"""
from datetime import date, datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Resume
# ---------------------------------------------------------------------------
class Project(BaseModel):
    name: str
    description: str
    tech: List[str] = Field(default_factory=list)


class Education(BaseModel):
    school: str
    degree: str
    year: str


class Experience(BaseModel):
    title: str
    company: str
    duration: str
    highlights: List[str] = Field(default_factory=list)


class ResumeLinks(BaseModel):
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None


class ResumeProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    candidate_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    links: ResumeLinks = Field(default_factory=ResumeLinks)
    skills: List[str] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    best_fit_roles: List[str] = Field(default_factory=list)
    missing_keywords: List[str] = Field(default_factory=list)
    raw_text: str = ""
    created_at: datetime


# ---------------------------------------------------------------------------
# Job scoring
# ---------------------------------------------------------------------------
class JobInput(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    description: str
    url: Optional[str] = None
    easy_apply: Optional[bool] = False


class ScoreRequest(BaseModel):
    resume_id: int
    job: JobInput


class FitBreakdown(BaseModel):
    technical_skill_match: float  # /40
    experience_match: float  # /20
    project_match: float  # /20
    entry_level_friendliness: float  # /10
    location_work_auth_match: float  # /10


class FitScore(BaseModel):
    total: int = Field(ge=0, le=100)
    recommendation: Literal["Apply", "Maybe", "Skip"]
    breakdown: FitBreakdown
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    reasoning: str = ""


# ---------------------------------------------------------------------------
# Jobs (saved)
# ---------------------------------------------------------------------------
class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    company: str
    location: Optional[str] = None
    description: str
    url: Optional[str] = None
    source: Optional[str] = None
    easy_apply: bool = False
    score: Optional[int] = None
    recommendation: Optional[str] = None
    red_flags: List[str] = Field(default_factory=list)
    created_at: datetime


class JobCreate(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    description: str = ""
    url: Optional[str] = None
    source: Optional[str] = None
    easy_apply: bool = False
    # Optional score block (lets the client persist a score computed elsewhere).
    score: Optional[int] = None
    recommendation: Optional[str] = None
    red_flags: Optional[List[str]] = None
    score_breakdown: Optional[Dict[str, float]] = None


class JobScrapeRequest(BaseModel):
    resume_id: int
    searches: Optional[List[str]] = None
    location: str = "United States"
    count: int = Field(default=50, ge=10, le=100)
    posted_hours: int = Field(default=24, ge=1, le=168)
    max_age_days: int = Field(default=3, ge=1, le=7)
    accuracy_first: bool = True
    min_score: int = Field(default=85, ge=0, le=100)
    limit: int = Field(default=12, ge=5, le=12)


class JobScrapeResult(BaseModel):
    scraped: int
    kept: int
    saved: int
    tracked: int = 0
    filtered_closed: int = 0
    filtered_old: int = 0
    filtered_duplicate: int = 0
    filtered_existing: int = 0
    filtered_role: int = 0
    filtered_skip: int = 0
    filtered_low_score: int = 0
    filtered_no_apply: int = 0
    filtered_unverified: int = 0
    min_score: int = 85
    limit: int = 12
    jobs: List[JobOut] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Resume tailoring
# ---------------------------------------------------------------------------
class TailorRequest(BaseModel):
    resume_id: int
    job_description: str
    job_title: Optional[str] = None
    company: Optional[str] = None


class ReorderedProject(BaseModel):
    name: str
    reason: str


class TailorResult(BaseModel):
    suggested_keywords: List[str] = Field(default_factory=list)
    rewritten_summary: str = ""
    reordered_projects: List[ReorderedProject] = Field(default_factory=list)
    ats_resume_markdown: str = ""
    warnings: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------
class MessageJob(BaseModel):
    title: str
    company: str
    description: Optional[str] = None


class MessageRequest(BaseModel):
    type: Literal[
        "linkedin_note",
        "recruiter_message",
        "hr_email",
        "cover_letter",
        "follow_up",
        "thank_you",
    ]
    resume_id: int
    job: MessageJob
    recruiter_name: Optional[str] = None
    tone: Optional[Literal["professional", "friendly", "concise"]] = "professional"


class MessageResult(BaseModel):
    content: str


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
AppStatus = Literal[
    "Saved", "Applied", "HR Contacted", "Interview", "Rejected", "Offer"
]


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: Optional[int] = None
    resume_id: Optional[int] = None
    company: str
    job_title: str
    location: Optional[str] = None
    job_link: Optional[str] = None
    fit_score: Optional[int] = None
    resume_version: Optional[str] = None
    date_applied: Optional[date] = None
    status: AppStatus
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime


class ApplicationCreate(BaseModel):
    company: str
    job_title: str
    location: Optional[str] = None
    job_link: Optional[str] = None
    fit_score: Optional[int] = None
    resume_version: Optional[str] = None
    resume_id: Optional[int] = None
    job_id: Optional[int] = None
    date_applied: Optional[date] = None
    status: AppStatus = "Saved"
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None


class ApplicationUpdate(BaseModel):
    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    job_link: Optional[str] = None
    fit_score: Optional[int] = None
    resume_version: Optional[str] = None
    date_applied: Optional[date] = None
    status: Optional[AppStatus] = None
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None


# ---------------------------------------------------------------------------
# Legitimacy
# ---------------------------------------------------------------------------
class LegitimacyRequest(BaseModel):
    company: str
    url: Optional[str] = None
    recruiter_email: Optional[str] = None


class LegitimacyCheck(BaseModel):
    label: str
    passed: bool
    detail: str


class LegitimacyReport(BaseModel):
    score: int = Field(ge=0, le=100)
    verdict: Literal["Legit", "Caution", "Likely Scam"]
    checks: List[LegitimacyCheck] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class RoleAvgScore(BaseModel):
    role: str
    avg_score: float


class WeeklyStat(BaseModel):
    day: str
    applied: int


class DailyDashboard(BaseModel):
    top_jobs: List[JobOut] = Field(default_factory=list)
    applications_today: int = 0
    follow_ups_due: List[ApplicationOut] = Field(default_factory=list)
    best_roles_by_score: List[RoleAvgScore] = Field(default_factory=list)
    resume_tips: List[str] = Field(default_factory=list)
    weekly_stats: List[WeeklyStat] = Field(default_factory=list)


class OkResponse(BaseModel):
    ok: bool = True
