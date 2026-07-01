"""Accuracy-first job discovery for Apply4K.

Runs trusted job-board sources plus the configured LinkedIn Apify actor, filters
recent/legit postings, scores them against a resume, and returns normalized job
records ready to save.
"""
from datetime import date, datetime, timedelta
from html import unescape
import re
import time
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import urlparse, urlencode

import httpx

from ..config import settings
from ..models import Resume
from . import scorer
from . import job_sources
from .profile import DEFAULT_SKILLS


API_BASE = "https://api.apify.com/v2"
SIMPLIFY_NEW_GRAD_URL = (
    "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md"
)
DEFAULT_SEARCHES = [
    "Software Engineer I",
    "New Grad Software Engineer",
    "Junior Software Engineer",
    "Associate Software Engineer",
    "Full Stack Developer",
    "React Developer",
    "Python Developer",
    "Flutter Developer",
    "Mobile App Developer",
    "AI ML Engineer Entry Level",
    "Backend Developer Entry Level",
]
TARGET_TITLE_TERMS = (
    "software engineer i",
    "software engineer",
    "software development engineer",
    "software developer",
    "associate software engineer",
    "developer",
    "full stack",
    "full-stack",
    "fullstack",
    "frontend",
    "front end",
    "backend",
    "back end",
    "new grad",
    "junior",
    "react developer",
    "python developer",
    "flutter developer",
    "mobile app developer",
    "ai engineer",
    "ml engineer",
)
EXCLUDED_TITLE_TERMS = (
    "senior",
    "staff",
    "principal",
    "lead",
    "manager",
    "architect",
    "product tester",
    "qa tester",
    "automation test",
    "test engineer",
    "ai trainer",
    "salesforce",
    "servicenow",
    "power platform",
    "itx developer",
    "communications systems",
)
EXCLUDED_COMPANY_TERMS = (
    # Defense/aerospace primes that typically require U.S. citizenship or an
    # active clearance — a hard no for an international-student candidate. This is
    # a best-effort guard for sources (e.g. SimplifyJobs) whose short descriptions
    # don't carry the real JD text for the scorer's citizenship/clearance detector.
    "rtx",
    "raytheon",
    "kbr",
    "altamira",
    "nightwing",
    "general dynamics",
    "mission systems",
    "boeing",
    "lockheed",
    "northrop",
    "l3harris",
    "united launch",
    "sierra nevada corp",
    "anduril",
    "leidos",
    "saic",
    "booz allen",
    "peraton",
    "caci",
    "ba systems",  # BAE Systems
)
EXCLUDED_LOCATION_TERMS = ("afb",)
# Clearly non-US location signals — drop these (unless a US signal also appears).
NON_US_LOCATION_TERMS = (
    "india",
    "london",
    "united kingdom",
    " uk",
    "uk ",
    "emea",
    "apac",
    "germany",
    "berlin",
    "france",
    "paris",
    "spain",
    "madrid",
    "barcelona",
    "netherlands",
    "amsterdam",
    "ireland",
    "dublin",
    "canada",
    "toronto",
    "vancouver",
    "ontario",
    "australia",
    "sydney",
    "singapore",
    "japan",
    "tokyo",
    "brazil",
    "mexico",
    "poland",
    "portugal",
    "lisbon",
    "bengaluru",
    "bangalore",
    "hyderabad",
    "pune",
    "gurgaon",
    "philippines",
    "argentina",
    "colombia",
    "nigeria",
    "kenya",
    "south africa",
    "israel",
    "tel aviv",
    "dubai",
    "uae",
)
# Signals that a location is US-based (keep even if a broad term is ambiguous).
US_LOCATION_TERMS = (
    "united states",
    "u.s.",
    "us,",
    ", us",
    "usa",
    "remote - us",
    "remote us",
    "remote, us",
    "remote (us",
)
CLOSED_PHRASES = (
    "no longer accepting applications",
    "not accepting applications",
    "position filled",
    "role closed",
    "job is closed",
    "posting has expired",
    "no longer available",
)
PREFERRED_SOURCES = {
    "greenhouse",
    "lever",
    "ashby",
    "wellfound",
    "yc",
    "company",
    "workday",
    "linkedin",
}
TITLE_PRIORITY = (
    "software engineer i",
    "new grad software engineer",
    "junior software engineer",
    "associate software engineer",
    "full stack developer",
    "full-stack developer",
    "react developer",
    "python developer",
    "flutter developer",
    "mobile app developer",
    "ai/ml engineer",
    "ai engineer",
    "ml engineer",
    "backend developer",
)


class ApifyJobError(RuntimeError):
    pass


def discover_jobs(
    resume: Resume,
    searches: Optional[List[str]] = None,
    location: str = "United States",
    count: int = 50,
    posted_hours: int = 24,
    max_age_days: int = 3,
    min_score: int = 85,
    limit: int = 5,
    accuracy_first: bool = True,
    excluded_company_titles: Optional[set] = None,
    excluded_url_keys: Optional[set] = None,
) -> Dict[str, Any]:
    """Run free ATS sources (+ optional Apify) and return scored jobs plus metadata.

    Free sources (Greenhouse/Lever/Ashby via job_sources, plus SimplifyJobs)
    always run and require no APIFY_TOKEN. The slow Apify LinkedIn actor only
    runs when both settings.APIFY_TOKEN is set and settings.ENABLE_APIFY is true.
    """
    # Free ATS boards — no auth, fast, always on.
    raw_items = job_sources.fetch_all_jobs()
    # SimplifyJobs New-Grad list — free, always on.
    raw_items.extend(_simplify_new_grad_jobs(max_age_days=max_age_days, count=count))

    # Slow Apify LinkedIn actor is opt-in (exceeds serverless timeouts).
    if settings.ENABLE_APIFY and settings.APIFY_TOKEN.strip():
        try:
            raw_items.extend(
                _run_actor(
                    urls=_linkedin_urls(
                        searches or DEFAULT_SEARCHES, location, posted_hours
                    ),
                    count=count,
                )
            )
        except ApifyJobError:
            # Never let a LinkedIn failure sink the free sources.
            pass

    resume_skills = (resume.skills if resume else None) or DEFAULT_SKILLS
    resume_projects = (resume.projects if resume else None) or scorer.projects_from_resume_text(
        getattr(resume, "raw_text", "")
    )
    today = date.today()

    normalized: List[Dict[str, Any]] = []
    seen_company_title = set()
    seen_urls = set()
    filtered_closed = 0
    filtered_old = 0
    filtered_duplicate = 0
    filtered_role = 0
    filtered_skip = 0
    filtered_low_score = 0
    filtered_no_apply = 0
    filtered_unverified = 0
    filtered_existing = 0
    excluded_company_titles = excluded_company_titles or set()
    excluded_url_keys = excluded_url_keys or set()

    verify_client = httpx.Client(follow_redirects=True, timeout=5.0)

    for item in raw_items:
        job = _normalize(item)
        if not job["title"] or not job["company"] or not job["description"]:
            continue
        if accuracy_first and not job.get("url"):
            filtered_no_apply += 1
            continue
        # NOTE: live apply-link verification happens AFTER ranking, only on the
        # final shortlist — verifying every raw ATS posting here (thousands of
        # sequential HTTP calls) would blow the serverless time budget.

        blob = f"{job['title']} {job['description']}".lower()
        if any(phrase in blob for phrase in CLOSED_PHRASES):
            filtered_closed += 1
            continue
        if not _target_role_ok(job["title"]) or not _company_location_ok(
            job["company"], job.get("location")
        ):
            filtered_role += 1
            continue

        posted = _parse_date(item.get("postedAt") or item.get("postedDate"))
        if posted and (today - posted) > timedelta(days=max_age_days):
            filtered_old += 1
            continue

        company_title_key = (_norm(job["company"]), _norm(job["title"]))
        url_key = _url_key(job.get("url"))
        if company_title_key in seen_company_title or (url_key and url_key in seen_urls):
            filtered_duplicate += 1
            continue
        if company_title_key in excluded_company_titles or (
            url_key and url_key in excluded_url_keys
        ):
            filtered_existing += 1
            continue
        seen_company_title.add(company_title_key)
        if url_key:
            seen_urls.add(url_key)

        fit = scorer.score_job(
            job_title=job["title"],
            company=job["company"],
            location=job.get("location"),
            description=job["description"],
            resume_skills=resume_skills,
            resume_projects=resume_projects,
        )
        if fit["recommendation"] == "Skip":
            filtered_skip += 1
            continue
        if accuracy_first and int(fit["total"]) < min_score:
            filtered_low_score += 1
            continue

        normalized.append(
            {
                **job,
                "posted_at": posted.isoformat() if posted else None,
                "score": fit["total"],
                "recommendation": fit["recommendation"],
                "red_flags": fit["red_flags"],
                "score_breakdown": fit["breakdown"],
                "reasoning": fit["reasoning"],
            }
        )

    normalized.sort(key=_rank_key, reverse=True)
    result_limit = limit if accuracy_first else count

    # Verify apply links only on the ranked shortlist, walking down until we have
    # `result_limit` live links. This bounds network calls to ~result_limit
    # instead of one per raw posting, keeping the run inside the serverless budget.
    final: List[Dict[str, Any]] = []
    if accuracy_first:
        for job in normalized:
            if len(final) >= result_limit:
                break
            if _apply_link_ok(verify_client, job.get("url"), job.get("source")):
                final.append(job)
            else:
                filtered_unverified += 1
    else:
        final = normalized[:result_limit]

    verify_client.close()

    return {
        "scraped": len(raw_items),
        "kept": len(final),
        "filtered_closed": filtered_closed,
        "filtered_old": filtered_old,
        "filtered_duplicate": filtered_duplicate,
        "filtered_existing": filtered_existing,
        "filtered_role": filtered_role,
        "filtered_skip": filtered_skip,
        "filtered_low_score": filtered_low_score,
        "filtered_no_apply": filtered_no_apply,
        "filtered_unverified": filtered_unverified,
        "min_score": min_score,
        "limit": result_limit,
        "jobs": final,
    }


def _run_actor(urls: List[str], count: int) -> List[Dict[str, Any]]:
    actor_id = settings.APIFY_LINKEDIN_ACTOR.replace("/", "~")
    headers = {
        "Authorization": f"Bearer {settings.APIFY_TOKEN}",
        "Accept": "application/json",
    }
    payload = {"urls": urls, "count": count}

    with httpx.Client(base_url=API_BASE, headers=headers, timeout=60.0) as client:
        run_resp = client.post(f"/acts/{actor_id}/runs", json=payload)
        if run_resp.status_code >= 400:
            raise ApifyJobError(_apify_error(run_resp))
        run = run_resp.json().get("data", run_resp.json())
        run_id = run["id"]
        dataset_id = run.get("defaultDatasetId")

        deadline = time.monotonic() + 900
        status = run.get("status")
        while time.monotonic() < deadline:
            status_resp = client.get(f"/actor-runs/{run_id}")
            if status_resp.status_code >= 400:
                raise ApifyJobError(_apify_error(status_resp))
            data = status_resp.json().get("data", status_resp.json())
            status = data.get("status")
            dataset_id = data.get("defaultDatasetId") or dataset_id
            if status in {"SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"}:
                break
            time.sleep(8)

        if status != "SUCCEEDED":
            raise ApifyJobError(f"Apify run ended with status {status}.")
        if not dataset_id:
            raise ApifyJobError("Apify run did not return a dataset id.")

        items_resp = client.get(f"/datasets/{dataset_id}/items", params={"clean": "true"})
        if items_resp.status_code >= 400:
            raise ApifyJobError(_apify_error(items_resp))
        items = items_resp.json()
        return items if isinstance(items, list) else []


def _simplify_new_grad_jobs(max_age_days: int, count: int) -> List[Dict[str, Any]]:
    try:
        resp = httpx.get(SIMPLIFY_NEW_GRAD_URL, timeout=20.0)
        resp.raise_for_status()
    except httpx.HTTPError:
        return []

    rows: List[Dict[str, Any]] = []
    last_company = ""
    today = date.today()
    for row_html in re.findall(r"<tr>(.*?)</tr>", resp.text, flags=re.DOTALL):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row_html, flags=re.DOTALL)
        if len(cells) < 5:
            continue

        company = _clean_html(cells[0])
        if company == "↳":
            company = last_company
        elif company:
            last_company = company
        title = _clean_html(cells[1])
        location = _clean_html(cells[2]).replace("  ", " ")
        age_text = _clean_html(cells[4]).lower()
        age_days = _age_days(age_text)
        if age_days is not None and age_days > max_age_days:
            continue

        links = re.findall(r'href="([^"]+)"', cells[3])
        apply_url = next((link for link in links if "simplify.jobs/p/" not in link), "")
        if not company or not title or not apply_url:
            continue
        if "intern" in f"{title} {apply_url}".lower():
            continue

        rows.append(
            {
                "title": title,
                "companyName": company,
                "location": location,
                "descriptionText": (
                    f"{title} at {company}. New grad / entry-level software role "
                    f"listed on SimplifyJobs. Accepts recent graduates; no prior "
                    f"professional experience required in the board listing. "
                    f"Location: {location}."
                ),
                "applyUrl": apply_url,
                "postedAt": (today - timedelta(days=age_days or 0)).isoformat(),
                "source": "simplify",
            }
        )
        if len(rows) >= count:
            break
    return rows


def _clean_html(value: str) -> str:
    value = value.replace("🇺🇸", " U.S. citizenship required ")
    value = value.replace("🔒", " job is closed ")
    value = value.replace("🎓", " advanced degree required ")
    value = re.sub(r"</br\s*>|<br\s*/?>", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", "", value)
    return re.sub(r"\s+", " ", unescape(value)).strip()


def _age_days(value: str) -> Optional[int]:
    if not value or value in {"-", "new"}:
        return 0
    match = re.search(r"(\d+)\s*d", value)
    if match:
        return int(match.group(1))
    return None


def _linkedin_urls(searches: Iterable[str], location: str, posted_hours: int) -> List[str]:
    recency = "r86400" if posted_hours <= 24 else f"r{posted_hours * 3600}"
    urls = []
    for keywords in searches:
        params = urlencode(
            {
                "keywords": keywords,
                "location": location,
                "f_TPR": recency,
                "f_E": "2",
                "f_WT": "2",
            }
        )
        urls.append(f"https://www.linkedin.com/jobs/search/?{params}")
    return urls


def _normalize(item: Dict[str, Any]) -> Dict[str, Any]:
    apply_url = item.get("applyUrl") or item.get("companyApplyUrl")
    posting_url = item.get("link") or item.get("url")
    url = apply_url or posting_url
    return {
        "title": str(item.get("title") or "").strip(),
        "company": str(item.get("companyName") or item.get("company") or "").strip(),
        "location": item.get("location"),
        "description": str(
            item.get("descriptionText")
            or item.get("description")
            or item.get("descriptionHtml")
            or ""
        ).strip(),
        "url": url,
        "source": _source_from_url(url or posting_url),
        "easy_apply": bool(item.get("easyApply")),
    }


def _parse_date(value: Any) -> Optional[date]:
    if not value:
        return None
    if isinstance(value, date):
        return value
    text = str(value)[:10]
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def _norm(text: str) -> str:
    return " ".join((text or "").strip().lower().split())


def _target_role_ok(title: str) -> bool:
    value = (title or "").lower()
    if any(term in value for term in EXCLUDED_TITLE_TERMS):
        return False
    return any(term in value for term in TARGET_TITLE_TERMS)


def _company_location_ok(company: str, location: Optional[str]) -> bool:
    company_value = (company or "").lower()
    location_value = (location or "").lower()
    if any(term in company_value for term in EXCLUDED_COMPANY_TERMS):
        return False
    if any(term in location_value for term in EXCLUDED_LOCATION_TERMS):
        return False
    if not _location_us_ok(location_value):
        return False
    return True


def _location_us_ok(location_value: str) -> bool:
    """Keep remote-US / US-state / United-States; drop clearly non-US.

    Unknown/empty locations pass (biased toward keeping, since many verified
    US boards expose sparse or blank location strings). A location that names a
    clearly non-US place is dropped unless it also carries an explicit US
    signal (e.g. a multi-hub "US / London" listing).
    """
    if not location_value.strip():
        return True
    has_us = any(term in location_value for term in US_LOCATION_TERMS)
    if has_us:
        return True
    if _has_us_state(location_value):
        return True
    if any(term in location_value for term in NON_US_LOCATION_TERMS):
        return False
    # "Remote" with no country qualifier — accept as remote-US-friendly.
    return True


_US_STATE_RE = re.compile(
    r"(?<![a-z])(al|ak|az|ar|ca|co|ct|de|dc|fl|ga|hi|id|il|in|ia|ks|ky|la|"
    r"me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|"
    r"tn|tx|ut|vt|va|wa|wv|wi|wy)(?![a-z])"
)
_US_CITY_TERMS = (
    "new york",
    "san francisco",
    "seattle",
    "boston",
    "austin",
    "chicago",
    "denver",
    "atlanta",
    "los angeles",
    "san jose",
    "mountain view",
    "palo alto",
    "washington",
)


def _has_us_state(location_value: str) -> bool:
    if _US_STATE_RE.search(location_value):
        return True
    return any(term in location_value for term in _US_CITY_TERMS)


def _source_from_url(url: Any) -> str:
    host = urlparse(str(url or "")).netloc.lower()
    if "greenhouse.io" in host:
        return "greenhouse"
    if "lever.co" in host:
        return "lever"
    if "ashbyhq.com" in host:
        return "ashby"
    if "wellfound.com" in host:
        return "wellfound"
    if "ycombinator.com" in host:
        return "yc"
    if "workdayjobs.com" in host or "myworkdayjobs.com" in host:
        return "workday"
    if "linkedin.com" in host:
        return "linkedin"
    if host:
        return "company"
    return "unknown"


def _url_key(url: Any) -> str:
    parsed = urlparse(str(url or ""))
    if not parsed.netloc:
        return ""
    return f"{parsed.netloc.lower()}{parsed.path.rstrip('/')}"


def _title_priority(title: str) -> int:
    value = (title or "").lower()
    for idx, term in enumerate(TITLE_PRIORITY):
        if term in value:
            return len(TITLE_PRIORITY) - idx
    return 0


def _source_priority(source: Optional[str]) -> int:
    if (source or "").lower() in PREFERRED_SOURCES:
        return 1
    return 0


def _rank_key(job: Dict[str, Any]) -> tuple:
    return (
        job.get("score") or 0,
        _title_priority(job.get("title") or ""),
        _source_priority(job.get("source")),
        job.get("posted_at") or "",
    )


def _apply_link_ok(client: httpx.Client, url: Any, source: Any) -> bool:
    """Best-effort live-link check without rejecting LinkedIn bot blocks."""
    if not url:
        return False
    if (source or "").lower() == "linkedin":
        return True
    try:
        resp = client.head(str(url))
        if resp.status_code in {405, 403}:
            resp = client.get(str(url))
        return 200 <= resp.status_code < 400
    except httpx.HTTPError:
        return False


def _apify_error(resp: httpx.Response) -> str:
    try:
        data = resp.json()
        message = data.get("error", {}).get("message")
        if message:
            return message
    except Exception:
        pass
    return f"Apify HTTP {resp.status_code}: {resp.text[:300]}"
