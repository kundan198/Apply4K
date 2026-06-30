"""Deterministic heuristic scorer implementing SCORING_RULES.md.

Used both as the mock for /api/jobs/score and as a guardrail/fallback for the AI path.
Implements the exact 40/20/20/10/10 breakdown and the hard red-flag detection.
"""
import re
from typing import Dict, List, Optional, Tuple

from .profile import CANDIDATE_PROFILE, TECH_SKILLS

# --- Red-flag detection ----------------------------------------------------
# Each entry: (compiled regex, human label). All of these are "hard" red flags
# that force a "Skip" recommendation per SCORING_RULES.md, except the sponsorship
# note which is informational only (candidate doesn't need sponsorship).
SENIORITY_RE = re.compile(
    r"\b(senior|sr\.?|staff|lead|principal|manager|director|vp|head of)\b"
    r"|\b(ii|iii|iv)\b",
    re.IGNORECASE,
)
YEARS_RE = re.compile(r"\b([1-9]|1\d)\+?\s*years?\b", re.IGNORECASE)
ZERO_YEAR_OK_RE = re.compile(
    r"\b(0\s*[-–to]+\s*[12]\s*years?|zero\s+years?|no\s+experience|required\s+experience:\s*none|"
    r"new grad(uate)?|recent grad(uate)?|early career|entry[- ]level)\b",
    re.IGNORECASE,
)
REQUIRED_YEARS_RE = re.compile(
    r"\b((at least|minimum|required|requires?|must have|need(s|ed)?)\s*)?"
    r"([1-9]|1\d)\+?\s*(years?|yrs?)\b",
    re.IGNORECASE,
)
CLEARANCE_RE = re.compile(
    r"\b(security clearance|ts/sci|top secret|secret clearance|public trust|polygraph)\b",
    re.IGNORECASE,
)
CITIZENSHIP_RE = re.compile(
    r"\b(u\.?s\.? citizen(ship)?\s*(only|required)?|must be (a )?us citizen|itar)\b",
    re.IGNORECASE,
)
PHD_RE = re.compile(r"\b(ph\.?d\.?|doctorate)\b", re.IGNORECASE)

# Stacks that, when dominating a posting with zero overlap, signal an unrelated role.
UNRELATED_STACKS = {
    "salesforce": "Salesforce",
    "sap": "SAP",
    "cobol": "COBOL",
    "abap": "ABAP",
    "mainframe": "Mainframe",
    "sharepoint": "SharePoint",
}

ENTRY_KEYWORDS = [
    "entry",
    "entry-level",
    "entry level",
    "junior",
    "new grad",
    "new graduate",
    "associate",
    "0-1 years",
    "0-2 years",
    "0 to 1 years",
    "0 to 2 years",
    "early career",
    "graduate program",
    "internship to full",
    "intern to full",
    "recent graduate",
]


def extract_skills_from_text(text: str) -> List[str]:
    """Match the canonical tech-skills dictionary against arbitrary text."""
    lowered = text.lower()
    found: Dict[str, None] = {}
    for token, label in TECH_SKILLS.items():
        # Word-ish boundary match; tokens may contain symbols like c++ / .net.
        pattern = r"(?<![a-z0-9])" + re.escape(token) + r"(?![a-z0-9])"
        if re.search(pattern, lowered):
            found[label] = None
    return list(found.keys())


def projects_from_resume_text(raw_text: str) -> List[dict]:
    """Recover project tech when PDF parsing did not create structured projects."""
    text = raw_text or ""
    lowered = text.lower()
    start = lowered.find("projects")
    if start == -1:
        start = 0
    end_candidates = [
        idx
        for marker in ("achievements", "education", "experience")
        if (idx := lowered.find(marker, start + 1)) != -1
    ]
    end = min(end_candidates) if end_candidates else len(text)
    skills = extract_skills_from_text(text[start:end])
    if not skills:
        return []
    return [{"name": "Resume projects", "tech": skills}]


def detect_red_flags(job_title: str, description: str) -> Tuple[List[str], bool]:
    """Return (red_flags, is_hard) where is_hard forces a Skip recommendation."""
    flags: List[str] = []
    hard = False
    title = job_title or ""
    desc = description or ""
    blob = f"{title}\n{desc}"

    if SENIORITY_RE.search(title) or SENIORITY_RE.search(desc):
        flags.append("Seniority level (senior/staff/lead/principal/manager/II/III)")
        hard = True

    m = REQUIRED_YEARS_RE.search(desc)
    if m and not ZERO_YEAR_OK_RE.search(desc):
        flags.append(f"Requires prior professional experience ({m.group(0).strip()})")
        hard = True

    if CLEARANCE_RE.search(blob):
        flags.append("Requires security clearance")
        hard = True

    if CITIZENSHIP_RE.search(blob):
        flags.append("U.S. citizenship only / ITAR")
        hard = True

    if PHD_RE.search(blob):
        flags.append("Requires PhD / doctorate")
        hard = True

    # Unrelated-stack: dominant legacy/enterprise stack with no transferable overlap.
    job_skills = set(extract_skills_from_text(blob))
    blob_lower = blob.lower()
    for token, label in UNRELATED_STACKS.items():
        if token in blob_lower and not job_skills:
            flags.append(f"Unrelated stack ({label}) with no overlap")
            hard = True
            break

    # Sponsorship note — informational, never hard-blocks.
    if re.search(
        r"\b(no (h-?1b|visa) sponsorship|sponsorship not (available|provided)|"
        r"unable to sponsor)\b",
        blob_lower,
    ):
        flags.append(
            "Posting states no sponsorship (note only — candidate needs none)"
        )

    return flags, hard


def _technical_skill_match(
    job_skills: List[str], resume_skills: List[str]
) -> Tuple[float, List[str], List[str]]:
    """40 pts: overlap(job skills, resume skills) / job skills."""
    resume_set = {s.lower() for s in resume_skills}
    matched = [s for s in job_skills if s.lower() in resume_set]
    missing = [s for s in job_skills if s.lower() not in resume_set]
    if not job_skills:
        # Many verified new-grad boards only expose title/company/location.
        # Treat general SWE roles as a solid-but-not-perfect technical fit.
        return 32.0, matched, missing
    ratio = len(matched) / len(job_skills)
    return round(ratio * 40, 1), matched, missing


def _experience_match(description: str) -> float:
    """20 pts: full points for zero-year/new-grad roles only."""
    desc = description or ""
    if ZERO_YEAR_OK_RE.search(desc):
        return 20.0
    m = REQUIRED_YEARS_RE.search(desc)
    if not m:
        # No explicit requirement — assume entry friendly.
        return 18.0
    return 0.0


def _project_match(job_skills: List[str], resume_projects: List[dict]) -> float:
    """20 pts: resume projects' tech vs job stack."""
    if not job_skills:
        return 16.0
    project_tech = set()
    for p in resume_projects or []:
        for t in p.get("tech", []) or []:
            project_tech.add(t.lower())
    if not project_tech:
        return 8.0  # have job skills but no project tech to compare
    overlap = sum(1 for s in job_skills if s.lower() in project_tech)
    ratio = overlap / len(job_skills)
    return round(ratio * 20, 1)


def _entry_level_friendliness(job_title: str, description: str) -> float:
    """10 pts: entry/junior/new-grad/associate/0-2 yrs keywords."""
    blob = f"{job_title or ''} {description or ''}".lower()
    hits = sum(1 for kw in ENTRY_KEYWORDS if kw in blob)
    if hits == 0:
        # Senior signals in title pull this down.
        if SENIORITY_RE.search(job_title or ""):
            return 0.0
        return 5.0
    return float(min(10.0, 6 + hits * 2))


def _location_work_auth_match(location: Optional[str], description: str) -> float:
    """10 pts: Remote US / FL / hybrid US match; penalize on-site outside FL."""
    blob = f"{location or ''} {description or ''}".lower()
    if "remote" in blob:
        return 10.0
    if any(k in blob for k in ["florida", "tampa", " fl", "fl,", "fl "]):
        return 10.0
    if "hybrid" in blob:
        return 8.0
    if any(k in blob for k in ["canada", " uk", "london", "vancouver", "toronto"]):
        return 2.0
    if re.search(
        r"\b(al|ak|az|ar|ca|co|ct|de|dc|ga|hi|id|il|in|ia|ks|ky|la|me|md|"
        r"ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|"
        r"tn|tx|ut|vt|va|wa|wv|wi|wy)\b",
        blob,
    ):
        return 9.0
    # On-site somewhere unspecified / outside FL.
    if "on-site" in blob or "onsite" in blob or "in office" in blob:
        return 3.0
    return 6.0  # unknown location: neutral


def score_job(
    job_title: str,
    company: str,
    location: Optional[str],
    description: str,
    resume_skills: List[str],
    resume_projects: List[dict],
) -> Dict[str, object]:
    """Compute a full FitScore-shaped dict deterministically."""
    job_skills = extract_skills_from_text(f"{job_title}\n{description}")

    tech, matched, missing = _technical_skill_match(job_skills, resume_skills)
    exp = _experience_match(description)
    proj = _project_match(job_skills, resume_projects)
    entry = _entry_level_friendliness(job_title, description)
    loc = _location_work_auth_match(location, description)

    breakdown = {
        "technical_skill_match": tech,
        "experience_match": exp,
        "project_match": proj,
        "entry_level_friendliness": entry,
        "location_work_auth_match": loc,
    }
    total = int(round(tech + exp + proj + entry + loc))
    total = max(0, min(100, total))

    red_flags, hard = detect_red_flags(job_title, description)

    if hard:
        recommendation = "Skip"
    elif total >= 85:
        recommendation = "Apply"
    elif total >= 70:
        recommendation = "Maybe"
    else:
        recommendation = "Skip"

    reasoning = _build_reasoning(
        total, recommendation, matched, missing, breakdown, red_flags, hard
    )

    return {
        "total": total,
        "recommendation": recommendation,
        "breakdown": breakdown,
        "matched_skills": matched,
        "missing_skills": missing,
        "red_flags": red_flags,
        "reasoning": reasoning,
    }


def _build_reasoning(
    total: int,
    recommendation: str,
    matched: List[str],
    missing: List[str],
    breakdown: Dict[str, float],
    red_flags: List[str],
    hard: bool,
) -> str:
    parts = [f"Overall fit {total}/100 → {recommendation}."]
    if matched:
        parts.append("Matches " + ", ".join(matched[:6]) + ".")
    if missing:
        parts.append("Gaps: " + ", ".join(missing[:6]) + ".")
    if hard and red_flags:
        parts.append("Hard red flag forces Skip: " + red_flags[0] + ".")
    elif red_flags:
        parts.append("Notes: " + "; ".join(red_flags) + ".")
    parts.append(
        "Breakdown — skills {technical_skill_match}/40, experience "
        "{experience_match}/20, projects {project_match}/20, entry-level "
        "{entry_level_friendliness}/10, location/auth "
        "{location_work_auth_match}/10.".format(**breakdown)
    )
    return " ".join(parts)


def best_fit_roles(resume_skills: List[str]) -> List[str]:
    """Pick target roles whose keyword overlaps the resume skills the most."""
    target_roles: List[str] = CANDIDATE_PROFILE["target_roles"]  # type: ignore
    skill_blob = " ".join(resume_skills).lower()
    scored: List[Tuple[int, str]] = []
    for role in target_roles:
        tokens = [t for t in re.split(r"[\s/\-]+", role.lower()) if len(t) > 2]
        hits = sum(1 for t in tokens if t in skill_blob)
        scored.append((hits, role))
    scored.sort(key=lambda x: x[0], reverse=True)
    ranked = [r for hits, r in scored if hits > 0]
    # Always return something useful; default to the entry-level roles.
    return ranked[:5] if ranked else target_roles[:3]
