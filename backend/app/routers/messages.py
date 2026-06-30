"""Message / cover-letter generation endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Message, Resume
from ..schemas import MessageRequest, MessageResult
from ..services import ai

router = APIRouter(prefix="/api/messages", tags=["messages"])

DEMO_USER_ID = 1


@router.post("", response_model=MessageResult)
def generate_message(req: MessageRequest, db: Session = Depends(get_db)) -> MessageResult:
    resume = db.get(Resume, req.resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found.")

    content = ai.generate_message(
        msg_type=req.type,
        resume={
            "candidate_name": resume.candidate_name,
            "skills": resume.skills or [],
        },
        job=req.job.model_dump(),
        recruiter_name=req.recruiter_name,
        tone=req.tone or "professional",
    )

    # Persist for history.
    db.add(
        Message(user_id=DEMO_USER_ID, job_id=None, type=req.type, content=content)
    )
    db.commit()

    return MessageResult(content=content)
