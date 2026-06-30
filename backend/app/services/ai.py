"""OpenAI wrapper with deterministic MOCK FALLBACK.

If OPENAI_API_KEY is present, calls the modern OpenAI SDK requesting JSON output for
structured tasks. If the key is missing (or any call fails), falls back to deterministic
template/heuristic generation so the whole app works fully offline.
"""
import json
import re
from typing import Any, Dict, List, Optional

from ..config import settings
from . import pdf_parser, scorer
from .profile import CANDIDATE_PROFILE

# Lazily-constructed singleton client (only when a key is configured).
_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not settings.use_real_openai:
        return None
    try:
        from openai import OpenAI

        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return _client
    except Exception:
        return None


def _chat_json(system: str, user: str) -> Optional[Dict[str, Any]]:
    """Run a JSON-mode chat completion. Returns parsed dict or None on any failure."""
    client = _get_client()
    if client is None:
        return None
    try:
        resp = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.4,
        )
        content = resp.choices[0].message.content or "{}"
        return json.loads(content)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Resume analysis
# ---------------------------------------------------------------------------
def analyze_resume(raw_text: str, filename: str) -> Dict[str, Any]:
    """Return ResumeProfile fields. Real OpenAI extraction with mock fallback."""
    system = (
        "You extract structured data from resumes for an entry-level software "
        "engineering candidate. Return strict JSON with keys: candidate_name, email, "
        "phone, links{linkedin,github,portfolio}, skills[], "
        "projects[{name,description,tech[]}], education[{school,degree,year}], "
        "experience[{title,company,duration,highlights[]}], best_fit_roles[], "
        "missing_keywords[]. Target roles: "
        + ", ".join(CANDIDATE_PROFILE["target_roles"])  # type: ignore
    )
    data = _chat_json(system, f"Resume text:\n{raw_text[:12000]}")
    if not data:
        return pdf_parser.analyze_resume_mock(raw_text, filename)

    # Merge with deterministic baseline so every field is well-formed.
    mock = pdf_parser.analyze_resume_mock(raw_text, filename)
    merged = {**mock}
    for key in (
        "candidate_name",
        "email",
        "phone",
        "links",
        "skills",
        "projects",
        "education",
        "experience",
        "best_fit_roles",
        "missing_keywords",
    ):
        if data.get(key):
            merged[key] = data[key]
    merged["filename"] = filename
    merged["raw_text"] = raw_text
    return merged


# ---------------------------------------------------------------------------
# Job scoring (AI path with scorer guardrail)
# ---------------------------------------------------------------------------
def score_job(
    job: Dict[str, Any], resume_skills: List[str], resume_projects: List[dict]
) -> Dict[str, Any]:
    """Always compute the deterministic score; let AI enrich reasoning only.

    The deterministic scorer is authoritative for totals and red flags (the guardrail),
    so scores stay consistent with the extension overlay.
    """
    result = scorer.score_job(
        job_title=job.get("title", ""),
        company=job.get("company", ""),
        location=job.get("location"),
        description=job.get("description", ""),
        resume_skills=resume_skills,
        resume_projects=resume_projects,
    )

    client = _get_client()
    if client is None:
        return result

    # Ask AI only for a richer reasoning narrative; keep numeric guardrails intact.
    system = (
        "You are a concise career coach. Given a fit analysis, write a 2-3 sentence "
        "plain-English reasoning. Return JSON {\"reasoning\": string}."
    )
    user = json.dumps(
        {
            "job_title": job.get("title"),
            "company": job.get("company"),
            "total": result["total"],
            "recommendation": result["recommendation"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"],
            "red_flags": result["red_flags"],
        }
    )
    data = _chat_json(system, user)
    if data and isinstance(data.get("reasoning"), str) and data["reasoning"].strip():
        result["reasoning"] = data["reasoning"].strip()
    return result


# ---------------------------------------------------------------------------
# Resume tailoring
# ---------------------------------------------------------------------------
def tailor_resume(
    resume: Dict[str, Any], job_description: str, job_title: str, company: str
) -> Dict[str, Any]:
    resume_skills = resume.get("skills", []) or []
    job_skills = scorer.extract_skills_from_text(f"{job_title}\n{job_description}")
    have = {s.lower() for s in resume_skills}
    suggested = [s for s in job_skills if s.lower() in have]  # keywords to surface
    gaps = [s for s in job_skills if s.lower() not in have]

    client = _get_client()
    if client is not None:
        system = (
            "You tailor an entry-level engineer's resume to a job. Return JSON: "
            "{suggested_keywords[], rewritten_summary, "
            "reordered_projects[{name,reason}], ats_resume_markdown, warnings[]}. "
            "Never invent skills the candidate lacks; list such asks in warnings."
        )
        user = json.dumps(
            {
                "candidate_name": resume.get("candidate_name"),
                "skills": resume_skills,
                "projects": resume.get("projects", []),
                "experience": resume.get("experience", []),
                "job_title": job_title,
                "company": company,
                "job_description": job_description[:8000],
            }
        )
        data = _chat_json(system, user)
        if data and data.get("ats_resume_markdown"):
            return {
                "suggested_keywords": data.get("suggested_keywords", suggested),
                "rewritten_summary": data.get("rewritten_summary", ""),
                "reordered_projects": data.get("reordered_projects", []),
                "ats_resume_markdown": data.get("ats_resume_markdown", ""),
                "warnings": data.get("warnings", []),
            }

    return _tailor_mock(
        resume, job_title, company, suggested, gaps, resume_skills
    )


def _tailor_mock(
    resume: Dict[str, Any],
    job_title: str,
    company: str,
    suggested: List[str],
    gaps: List[str],
    resume_skills: List[str],
) -> Dict[str, Any]:
    name = resume.get("candidate_name") or CANDIDATE_PROFILE["name"]
    role = job_title or "Software Engineer"
    co = company or "the company"

    summary = (
        f"{name} — entry-level software engineer targeting the {role} role at {co}. "
        f"Strong in {', '.join(suggested[:5]) or ', '.join(resume_skills[:5])}, with "
        "hands-on project experience and a fast-learning, ownership-driven mindset. "
        "Eligible to work in the US (no H-1B sponsorship required)."
    )

    projects = resume.get("projects", []) or []
    reordered = [
        {
            "name": p.get("name", f"Project {i+1}"),
            "reason": "Tech overlaps with the role's stack."
            if any(t.lower() in {s.lower() for s in suggested} for t in p.get("tech", []))
            else "Demonstrates relevant engineering breadth.",
        }
        for i, p in enumerate(projects[:5])
    ]

    skills_line = ", ".join(resume_skills) if resume_skills else "(see resume)"
    md_lines = [
        f"# {name}",
        f"**Target role:** {role} @ {co}",
        "",
        "## Summary",
        summary,
        "",
        "## Skills",
        skills_line,
    ]
    if suggested:
        md_lines += ["", "## Highlighted Keywords (ATS)", ", ".join(suggested)]
    if projects:
        md_lines += ["", "## Projects"]
        for p in projects[:5]:
            tech = ", ".join(p.get("tech", []))
            md_lines.append(f"- **{p.get('name','Project')}** — {p.get('description','')} ({tech})")
    md_lines += [
        "",
        "## Work Authorization",
        "Authorized to work in the US; H-1B sponsorship not required.",
    ]

    warnings = []
    if gaps:
        warnings.append(
            "Do not claim these unless true — not clearly on your resume: "
            + ", ".join(gaps[:6])
        )

    return {
        "suggested_keywords": suggested or resume_skills[:8],
        "rewritten_summary": summary,
        "reordered_projects": reordered,
        "ats_resume_markdown": "\n".join(md_lines),
        "warnings": warnings,
    }


# ---------------------------------------------------------------------------
# Messages / cover letters
# ---------------------------------------------------------------------------
def generate_message(
    msg_type: str,
    resume: Dict[str, Any],
    job: Dict[str, Any],
    recruiter_name: Optional[str],
    tone: str,
) -> str:
    client = _get_client()
    if client is not None:
        system = (
            "You write concise, authentic job-search outreach for an entry-level "
            f"engineer. Tone: {tone}. Type: {msg_type}. Return JSON {{\"content\": string}}. "
            "No fabrication; reference only the candidate's real background."
        )
        user = json.dumps(
            {
                "candidate_name": resume.get("candidate_name"),
                "skills": resume.get("skills", [])[:10],
                "job_title": job.get("title"),
                "company": job.get("company"),
                "job_description": (job.get("description") or "")[:4000],
                "recruiter_name": recruiter_name,
            }
        )
        data = _chat_json(system, user)
        if data and isinstance(data.get("content"), str) and data["content"].strip():
            return data["content"].strip()

    return _message_mock(msg_type, resume, job, recruiter_name, tone)


def _message_mock(
    msg_type: str,
    resume: Dict[str, Any],
    job: Dict[str, Any],
    recruiter_name: Optional[str],
    tone: str,
) -> str:
    name = resume.get("candidate_name") or CANDIDATE_PROFILE["name"]
    skills = resume.get("skills", []) or []
    top_skills = ", ".join(skills[:4]) if skills else "full-stack development"
    title = job.get("title", "the role")
    company = job.get("company", "your team")
    greeting = f"Hi {recruiter_name}," if recruiter_name else "Hi there,"

    if msg_type == "linkedin_note":
        return (
            f"{greeting} I'm {name}, an entry-level software engineer skilled in "
            f"{top_skills}. I'm very interested in the {title} role at {company} and "
            "would love to connect. Thank you!"
        )
    if msg_type == "recruiter_message":
        return (
            f"{greeting}\n\nI'm {name}, reaching out about the {title} position at "
            f"{company}. My background in {top_skills} and hands-on project work line "
            "up well with the role, and I'm authorized to work in the US (no "
            "sponsorship needed). I'd welcome a quick chat about how I can contribute.\n\n"
            f"Best,\n{name}"
        )
    if msg_type == "hr_email":
        return (
            f"Subject: Application — {title}\n\n{greeting}\n\nI'd like to express my "
            f"interest in the {title} role at {company}. As an entry-level engineer "
            f"experienced with {top_skills}, I'm confident I can ramp up quickly and add "
            "value. My resume is attached for your review.\n\nThank you for your time,\n"
            f"{name}"
        )
    if msg_type == "cover_letter":
        return (
            f"Dear {recruiter_name or 'Hiring Team'},\n\nI'm writing to apply for the "
            f"{title} position at {company}. As an entry-level software engineer, I've "
            f"built projects using {top_skills}, sharpening both my technical and "
            "collaboration skills. I'm drawn to "
            f"{company} because of the chance to learn fast and ship real work. I'm "
            "authorized to work in the US without sponsorship.\n\nI'd be thrilled to "
            f"contribute to your team and grow with {company}. Thank you for considering "
            f"my application.\n\nSincerely,\n{name}"
        )
    if msg_type == "follow_up":
        return (
            f"{greeting}\n\nI wanted to follow up on my application for the {title} role "
            f"at {company}. I remain very enthusiastic about the opportunity and would "
            "be happy to share any additional information. Thank you for your time!\n\n"
            f"Best,\n{name}"
        )
    if msg_type == "thank_you":
        return (
            f"{greeting}\n\nThank you for taking the time to speak with me about the "
            f"{title} role at {company}. I enjoyed learning more about the team and am "
            "even more excited about the opportunity. Please let me know if there's "
            f"anything else you need from me.\n\nWarm regards,\n{name}"
        )
    return f"{greeting}\n\nThank you for your consideration regarding the {title} role at {company}.\n\nBest,\n{name}"


# ---------------------------------------------------------------------------
# Legitimacy / scam check
# ---------------------------------------------------------------------------
FREE_EMAIL_DOMAINS = {
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "aol.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
    "mail.com",
}


def check_legitimacy(
    company: str, url: Optional[str], recruiter_email: Optional[str]
) -> Dict[str, Any]:
    """Deterministic heuristic scam check. (AI is not required for reliability here.)"""
    checks: List[Dict[str, Any]] = []

    # 1. Recruiter email domain vs company.
    email_ok = True
    if recruiter_email:
        domain = recruiter_email.split("@")[-1].lower().strip()
        if domain in FREE_EMAIL_DOMAINS:
            email_ok = False
            checks.append(
                {
                    "label": "Recruiter email domain",
                    "passed": False,
                    "detail": f"Uses a free email provider ({domain}); legitimate "
                    "recruiters usually use a company domain.",
                }
            )
        else:
            company_token = re.sub(r"[^a-z0-9]", "", (company or "").lower())
            domain_token = re.sub(r"[^a-z0-9]", "", domain.split(".")[0])
            matches = bool(company_token) and (
                company_token in domain_token or domain_token in company_token
            )
            checks.append(
                {
                    "label": "Recruiter email domain",
                    "passed": True,
                    "detail": f"Corporate domain ({domain})"
                    + (" matching the company." if matches else "."),
                }
            )
    else:
        checks.append(
            {
                "label": "Recruiter email domain",
                "passed": True,
                "detail": "No recruiter email provided to evaluate.",
            }
        )

    # 2. URL uses HTTPS and a known/direct host.
    url_ok = True
    if url:
        https = url.lower().startswith("https://")
        host_m = re.search(r"https?://([^/]+)", url.lower())
        host = host_m.group(1) if host_m else ""
        known_ats = any(
            k in host
            for k in [
                "greenhouse.io",
                "lever.co",
                "ashbyhq.com",
                "wellfound.com",
                "ycombinator.com",
                "linkedin.com",
                "myworkdayjobs.com",
            ]
        )
        url_ok = https
        checks.append(
            {
                "label": "Job URL",
                "passed": https,
                "detail": ("Secure HTTPS link" if https else "Non-HTTPS link is risky")
                + (f" on a known ATS ({host})." if known_ats else f" ({host})."),
            }
        )
    else:
        checks.append(
            {
                "label": "Job URL",
                "passed": True,
                "detail": "No URL provided to evaluate.",
            }
        )

    # 3. Company name plausibility.
    name_ok = bool(company and len(company.strip()) >= 2)
    checks.append(
        {
            "label": "Company name",
            "passed": name_ok,
            "detail": "Company name present." if name_ok else "Missing/implausible company name.",
        }
    )

    # 4. Free-email + payment-style red flag heuristic on company name.
    blob = f"{company or ''}".lower()
    suspicious = any(
        k in blob for k in ["wire transfer", "pay upfront", "registration fee", "gift card"]
    )
    checks.append(
        {
            "label": "Upfront-payment signals",
            "passed": not suspicious,
            "detail": "No upfront-payment language detected."
            if not suspicious
            else "Mentions upfront payment — classic scam signal.",
        }
    )

    passed = sum(1 for c in checks if c["passed"])
    score = int(round(passed / len(checks) * 100))

    if score >= 80 and email_ok and url_ok:
        verdict = "Legit"
    elif score >= 50:
        verdict = "Caution"
    else:
        verdict = "Likely Scam"

    return {"score": score, "verdict": verdict, "checks": checks}
