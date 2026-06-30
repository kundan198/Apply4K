"""Job endpoints: score, list/save, recommendations."""
import re
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Application, Job, Resume
from ..schemas import FitScore, JobCreate, JobOut, JobScrapeRequest, JobScrapeResult, ScoreRequest
from ..services import ai
from ..services.apify_jobs import ApifyJobError, discover_jobs
from ..services.profile import DEFAULT_SKILLS
from ..services.scorer import projects_from_resume_text

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

DEMO_USER_ID = 1


def _resume_or_404(db: Session, resume_id: int) -> Resume:
    resume = db.get(Resume, resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return resume


@router.post("/score", response_model=FitScore)
def score_job(req: ScoreRequest, db: Session = Depends(get_db)) -> dict:
    """Score a job against a resume.

    If the referenced resume does not exist yet (e.g. the extension scores a
    LinkedIn job before any PDF has been uploaded), fall back to the candidate's
    default skill profile so scoring always works.
    """
    resume = db.get(Resume, req.resume_id)
    resume_skills = (resume.skills if resume else None) or DEFAULT_SKILLS
    resume_projects = (resume.projects if resume else None) or projects_from_resume_text(
        getattr(resume, "raw_text", "")
    )
    return ai.score_job(
        job=req.job.model_dump(),
        resume_skills=resume_skills,
        resume_projects=resume_projects,
    )


@router.get("", response_model=List[JobOut])
def list_jobs(db: Session = Depends(get_db)) -> List[Job]:
    return list(
        db.scalars(
            select(Job)
            .where(Job.user_id == DEMO_USER_ID)
            .order_by(Job.created_at.desc())
        )
    )


@router.post("", response_model=JobOut)
def create_job(payload: JobCreate, db: Session = Depends(get_db)) -> Job:
    """Persist a job, optionally with a precomputed score block."""
    job = Job(
        user_id=DEMO_USER_ID,
        title=payload.title,
        company=payload.company,
        location=payload.location,
        description=payload.description,
        url=payload.url,
        source=payload.source,
        easy_apply=payload.easy_apply,
        score=payload.score,
        recommendation=payload.recommendation,
        red_flags=payload.red_flags or [],
        score_breakdown=payload.score_breakdown,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _existing_job_keys(db: Session) -> set:
    rows = db.scalars(select(Job).where(Job.user_id == DEMO_USER_ID)).all()
    return {(_norm(job.company), _norm(job.title)) for job in rows}


def _existing_application_keys(db: Session) -> set:
    rows = db.scalars(select(Application).where(Application.user_id == DEMO_USER_ID)).all()
    return {(_norm(app.company), _norm(app.job_title)) for app in rows}


def _url_key(url: Optional[str]) -> str:
    parsed = urlparse(url or "")
    if not parsed.netloc:
        return ""
    return f"{parsed.netloc.lower()}{parsed.path.rstrip('/')}"


def _existing_job_urls(db: Session) -> set:
    rows = db.scalars(select(Job).where(Job.user_id == DEMO_USER_ID)).all()
    return {key for key in (_url_key(job.url) for job in rows) if key}


def _existing_application_urls(db: Session) -> set:
    rows = db.scalars(select(Application).where(Application.user_id == DEMO_USER_ID)).all()
    return {key for key in (_url_key(app.job_link) for app in rows) if key}


@router.post("/scrape", response_model=JobScrapeResult)
def scrape_jobs(payload: JobScrapeRequest, db: Session = Depends(get_db)) -> dict:
    """Run the Apify LinkedIn scraper, score matches, and save recommendations."""
    resume = _resume_or_404(db, payload.resume_id)
    existing = _existing_job_keys(db) | _existing_application_keys(db)
    existing_urls = _existing_job_urls(db) | _existing_application_urls(db)
    try:
        result = discover_jobs(
            resume=resume,
            searches=payload.searches,
            location=payload.location,
            count=payload.count,
            posted_hours=payload.posted_hours,
            max_age_days=payload.max_age_days,
            min_score=payload.min_score,
            limit=payload.limit,
            accuracy_first=payload.accuracy_first,
            excluded_company_titles=existing,
            excluded_url_keys=existing_urls,
        )
    except ApifyJobError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    saved: List[Job] = []
    tracked = 0
    for item in result["jobs"]:
        key = (_norm(item["company"]), _norm(item["title"]))
        url_key = _url_key(item.get("url"))
        if key in existing or (url_key and url_key in existing_urls):
            continue
        job = Job(
            user_id=DEMO_USER_ID,
            title=item["title"],
            company=item["company"],
            location=item.get("location"),
            description=item.get("description") or "",
            url=item.get("url"),
            source=item.get("source") or "linkedin",
            easy_apply=bool(item.get("easy_apply")),
            score=item.get("score"),
            recommendation=item.get("recommendation"),
            red_flags=item.get("red_flags") or [],
            score_breakdown=item.get("score_breakdown"),
        )
        db.add(job)
        db.flush()
        db.add(
            Application(
                user_id=DEMO_USER_ID,
                resume_id=resume.id,
                job_id=job.id,
                company=item["company"],
                job_title=item["title"],
                location=item.get("location"),
                job_link=item.get("url"),
                fit_score=item.get("score"),
                resume_version=resume.filename,
                status="Saved",
                notes="Auto-saved by accuracy-first scraper.",
            )
        )
        tracked += 1
        saved.append(job)
        existing.add(key)
        if url_key:
            existing_urls.add(url_key)

    db.commit()
    for job in saved:
        db.refresh(job)

    return {
        "scraped": result["scraped"],
        "kept": result["kept"],
        "saved": len(saved),
        "tracked": tracked,
        "filtered_closed": result["filtered_closed"],
        "filtered_old": result["filtered_old"],
        "filtered_duplicate": result["filtered_duplicate"],
        "filtered_existing": result["filtered_existing"],
        "filtered_role": result["filtered_role"],
        "filtered_skip": result["filtered_skip"],
        "filtered_low_score": result["filtered_low_score"],
        "filtered_no_apply": result["filtered_no_apply"],
        "filtered_unverified": result["filtered_unverified"],
        "min_score": result["min_score"],
        "limit": result["limit"],
        "jobs": saved,
    }


@router.get("/recommendations", response_model=List[JobOut])
def recommendations(
    resume_id: Optional[int] = Query(default=None),
    limit: int = Query(default=12, ge=5, le=12),
    min_score: int = Query(default=85, ge=0, le=100),
    db: Session = Depends(get_db),
) -> List[Job]:
    """Top scored saved jobs, deduped and filtered to accuracy-first matches."""
    if resume_id is not None:
        _resume_or_404(db, resume_id)

    jobs = list(
        db.scalars(
            select(Job)
            .where(Job.user_id == DEMO_USER_ID)
            .order_by(Job.created_at.desc(), Job.score.desc().nullslast())
        )
    )

    seen = set()
    result: List[Job] = []
    for job in jobs:
        if job.recommendation == "Skip":
            continue
        if (job.score or 0) < min_score:
            continue
        key = (_norm(job.company), _norm(job.title))
        if key in seen:
            continue
        seen.add(key)
        result.append(job)
    return result[:limit]
