"""Application tracker CRUD."""
import re
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Application
from ..schemas import (
    ApplicationCreate,
    ApplicationOut,
    ApplicationUpdate,
    OkResponse,
)

router = APIRouter(prefix="/api/applications", tags=["applications"])

DEMO_USER_ID = 1


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _url_key(url: Optional[str]) -> str:
    parsed = urlparse(url or "")
    if not parsed.netloc:
        return ""
    return f"{parsed.netloc.lower()}{parsed.path.rstrip('/')}"


@router.get("", response_model=List[ApplicationOut])
def list_applications(db: Session = Depends(get_db)) -> List[Application]:
    return list(
        db.scalars(
            select(Application)
            .where(Application.user_id == DEMO_USER_ID)
            .order_by(Application.created_at.desc())
        )
    )


@router.post("", response_model=ApplicationOut)
def create_application(
    payload: ApplicationCreate, db: Session = Depends(get_db)
) -> Application:
    existing = db.scalars(select(Application).where(Application.user_id == DEMO_USER_ID)).all()
    payload_key = (_norm(payload.company), _norm(payload.job_title))
    payload_url = _url_key(payload.job_link)
    for app in existing:
        if (_norm(app.company), _norm(app.job_title)) == payload_key:
            raise HTTPException(status_code=409, detail="Application is already tracked.")
        if payload_url and _url_key(app.job_link) == payload_url:
            raise HTTPException(status_code=409, detail="Application link is already tracked.")

    app = Application(
        user_id=DEMO_USER_ID,
        resume_id=payload.resume_id,
        job_id=payload.job_id,
        company=payload.company,
        job_title=payload.job_title,
        location=payload.location,
        job_link=payload.job_link,
        fit_score=payload.fit_score,
        resume_version=payload.resume_version,
        date_applied=payload.date_applied,
        status=payload.status,
        notes=payload.notes,
        follow_up_date=payload.follow_up_date,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
) -> Application:
    app = db.get(Application, application_id)
    if app is None:
        raise HTTPException(status_code=404, detail="Application not found.")
    next_company = payload.company if payload.company is not None else app.company
    next_title = payload.job_title if payload.job_title is not None else app.job_title
    next_link = payload.job_link if payload.job_link is not None else app.job_link
    next_key = (_norm(next_company), _norm(next_title))
    next_url = _url_key(next_link)
    existing = db.scalars(select(Application).where(Application.user_id == DEMO_USER_ID)).all()
    for other in existing:
        if other.id == application_id:
            continue
        if (_norm(other.company), _norm(other.job_title)) == next_key:
            raise HTTPException(status_code=409, detail="Application is already tracked.")
        if next_url and _url_key(other.job_link) == next_url:
            raise HTTPException(status_code=409, detail="Application link is already tracked.")
    # Apply only provided fields.
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(app, field, value)
    db.commit()
    db.refresh(app)
    return app


@router.delete("/{application_id}", response_model=OkResponse)
def delete_application(
    application_id: int, db: Session = Depends(get_db)
) -> OkResponse:
    app = db.get(Application, application_id)
    if app is None:
        raise HTTPException(status_code=404, detail="Application not found.")
    db.delete(app)
    db.commit()
    return OkResponse(ok=True)
