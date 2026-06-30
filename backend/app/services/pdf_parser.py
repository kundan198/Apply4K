"""PDF text extraction (pypdf) plus a deterministic resume-analysis function.

In mock mode the analysis derives skills, best-fit roles and missing keywords from the
extracted text using the shared tech-skills dictionary and candidate profile.
"""
import io
import re
from typing import Dict, List, Optional

from pypdf import PdfReader

from . import scorer
from .profile import CANDIDATE_PROFILE, DEFAULT_SKILLS

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(\+?\d[\d\-\s().]{7,}\d)")
LINKEDIN_RE = re.compile(r"(https?://)?(www\.)?linkedin\.com/[^\s)]+", re.IGNORECASE)
GITHUB_RE = re.compile(r"(https?://)?(www\.)?github\.com/[^\s)]+", re.IGNORECASE)
URL_RE = re.compile(r"https?://[^\s)]+", re.IGNORECASE)


def extract_text(file_bytes: bytes) -> str:
    """Extract concatenated text from a PDF byte stream. Tolerant of failures."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception:
        return ""
    chunks: List[str] = []
    for page in reader.pages:
        try:
            chunks.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(chunks).strip()


def _normalize_url(value: str) -> str:
    return value if value.lower().startswith("http") else f"https://{value}"


def _extract_links(text: str) -> Dict[str, Optional[str]]:
    links: Dict[str, Optional[str]] = {}
    m = LINKEDIN_RE.search(text)
    if m:
        links["linkedin"] = _normalize_url(m.group(0))
    m = GITHUB_RE.search(text)
    if m:
        links["github"] = _normalize_url(m.group(0))
    # Portfolio: first non-linkedin/github http URL.
    for url in URL_RE.findall(text):
        if "linkedin.com" not in url.lower() and "github.com" not in url.lower():
            links["portfolio"] = url
            break
    return links


def _guess_candidate_name(text: str) -> str:
    """Best-effort: first non-empty line that looks like a name."""
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if EMAIL_RE.search(line) or URL_RE.search(line):
            continue
        words = line.split()
        if 1 < len(words) <= 4 and all(w[:1].isalpha() for w in words):
            return line
        break
    return CANDIDATE_PROFILE["name"]  # type: ignore


def analyze_resume_mock(raw_text: str, filename: str) -> Dict[str, object]:
    """Deterministic resume analysis used when OpenAI is unavailable."""
    text = raw_text or ""
    skills = scorer.extract_skills_from_text(text)
    if not skills:
        # Fall back to default candidate skills so downstream features stay useful.
        skills = list(DEFAULT_SKILLS)

    email_m = EMAIL_RE.search(text)
    phone_m = PHONE_RE.search(text)
    links = _extract_links(text)

    best_fit = scorer.best_fit_roles(skills)

    # Missing keywords: high-value skills from the dictionary not on the resume,
    # biased toward what the target roles tend to require.
    priority = [
        "React",
        "Python",
        "TypeScript",
        "Node.js",
        "FastAPI",
        "Docker",
        "AWS",
        "SQL",
        "Flutter",
        "Machine Learning",
    ]
    have = {s.lower() for s in skills}
    missing_keywords = [p for p in priority if p.lower() not in have][:6]

    return {
        "filename": filename,
        "candidate_name": _guess_candidate_name(text) if text else CANDIDATE_PROFILE["name"],  # type: ignore
        "email": email_m.group(0) if email_m else None,
        "phone": phone_m.group(0).strip() if phone_m else None,
        "links": links,
        "skills": skills,
        "projects": [],
        "education": [],
        "experience": [],
        "best_fit_roles": best_fit,
        "missing_keywords": missing_keywords,
        "raw_text": text,
    }
