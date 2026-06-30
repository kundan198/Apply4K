"""Resume tailoring endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Resume
from ..schemas import TailorRequest, TailorResult
from ..services import ai

router = APIRouter(prefix="/api/tailor", tags=["tailor"])


@router.post("", response_model=TailorResult)
def tailor(req: TailorRequest, db: Session = Depends(get_db)) -> dict:
    resume = db.get(Resume, req.resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found.")

    return ai.tailor_resume(
        resume={
            "candidate_name": resume.candidate_name,
            "skills": resume.skills or [],
            "projects": resume.projects or [],
            "experience": resume.experience or [],
        },
        job_description=req.job_description,
        job_title=req.job_title or "",
        company=req.company or "",
    )
