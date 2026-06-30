"""Resume endpoints: upload (PDF multipart), list, get, delete."""
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Resume
from ..schemas import OkResponse, ResumeProfile
from ..services import ai
from ..services.pdf_parser import extract_text

router = APIRouter(prefix="/api/resume", tags=["resume"])

DEMO_USER_ID = 1


@router.post("/upload", response_model=ResumeProfile)
async def upload_resume(
    file: UploadFile = File(...), db: Session = Depends(get_db)
) -> Resume:
    """Accept a PDF resume, extract text, analyze it, and persist a ResumeProfile."""
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file upload.")

    raw_text = extract_text(contents)
    analysis = ai.analyze_resume(raw_text, file.filename or "resume.pdf")

    resume = Resume(
        user_id=DEMO_USER_ID,
        filename=analysis["filename"],
        candidate_name=analysis["candidate_name"],
        email=analysis.get("email"),
        phone=analysis.get("phone"),
        links=analysis.get("links", {}) or {},
        skills=analysis.get("skills", []) or [],
        projects=analysis.get("projects", []) or [],
        education=analysis.get("education", []) or [],
        experience=analysis.get("experience", []) or [],
        best_fit_roles=analysis.get("best_fit_roles", []) or [],
        missing_keywords=analysis.get("missing_keywords", []) or [],
        raw_text=analysis.get("raw_text", "") or "",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("", response_model=List[ResumeProfile])
def list_resumes(db: Session = Depends(get_db)) -> List[Resume]:
    return list(
        db.scalars(
            select(Resume)
            .where(Resume.user_id == DEMO_USER_ID)
            .order_by(Resume.created_at.desc())
        )
    )


@router.get("/{resume_id}", response_model=ResumeProfile)
def get_resume(resume_id: int, db: Session = Depends(get_db)) -> Resume:
    resume = db.get(Resume, resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return resume


@router.delete("/{resume_id}", response_model=OkResponse)
def delete_resume(resume_id: int, db: Session = Depends(get_db)) -> OkResponse:
    resume = db.get(Resume, resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found.")
    db.delete(resume)
    db.commit()
    return OkResponse(ok=True)
