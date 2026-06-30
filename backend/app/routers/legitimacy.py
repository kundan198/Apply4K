"""Legitimacy / scam-checker endpoint."""
from fastapi import APIRouter

from ..schemas import LegitimacyReport, LegitimacyRequest
from ..services import ai

router = APIRouter(prefix="/api/legitimacy", tags=["legitimacy"])


@router.post("/check", response_model=LegitimacyReport)
def check(req: LegitimacyRequest) -> dict:
    return ai.check_legitimacy(
        company=req.company, url=req.url, recruiter_email=req.recruiter_email
    )
