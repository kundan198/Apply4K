"""Daily dashboard aggregation endpoint."""
from collections import defaultdict
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Application, Job, Resume
from ..schemas import DailyDashboard

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

DEMO_USER_ID = 1


@router.get("/daily", response_model=DailyDashboard)
def daily(
    resume_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    today = date.today()

    jobs: List[Job] = list(
        db.scalars(select(Job).where(Job.user_id == DEMO_USER_ID))
    )
    apps: List[Application] = list(
        db.scalars(select(Application).where(Application.user_id == DEMO_USER_ID))
    )

    # Top 5 jobs by score (non-null first, descending).
    scored = sorted(
        [j for j in jobs if j.score is not None],
        key=lambda j: j.score,
        reverse=True,
    )
    top_jobs = scored[:5]

    applications_today = sum(1 for a in apps if a.date_applied == today)

    follow_ups_due = [
        a for a in apps if a.follow_up_date is not None and a.follow_up_date <= today
    ]

    # Best roles by average score, derived from saved jobs' titles.
    by_role: dict = defaultdict(list)
    for j in jobs:
        if j.score is not None:
            by_role[j.title].append(j.score)
    best_roles_by_score = sorted(
        [
            {"role": role, "avg_score": round(sum(scores) / len(scores), 1)}
            for role, scores in by_role.items()
        ],
        key=lambda r: r["avg_score"],
        reverse=True,
    )[:5]

    # Resume tips from the selected resume's missing keywords.
    resume_tips: List[str] = []
    resume = None
    if resume_id is not None:
        resume = db.get(Resume, resume_id)
    if resume is None:
        resume = db.scalars(
            select(Resume)
            .where(Resume.user_id == DEMO_USER_ID)
            .order_by(Resume.created_at.desc())
        ).first()
    if resume and resume.missing_keywords:
        for kw in resume.missing_keywords[:5]:
            resume_tips.append(f"Consider adding or highlighting {kw} on your resume.")
    if not resume_tips:
        resume_tips = [
            "Quantify project impact with metrics.",
            "Mirror keywords from each job description.",
            "Keep it to one page for entry-level roles.",
        ]

    # Weekly stats: applications per day for the last 7 days (oldest -> today).
    weekly_stats = []
    counts: dict = defaultdict(int)
    for a in apps:
        if a.date_applied is not None:
            counts[a.date_applied] += 1
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        weekly_stats.append({"day": day.isoformat(), "applied": counts.get(day, 0)})

    return {
        "top_jobs": top_jobs,
        "applications_today": applications_today,
        "follow_ups_due": follow_ups_due,
        "best_roles_by_score": best_roles_by_score,
        "resume_tips": resume_tips,
        "weekly_stats": weekly_stats,
    }
