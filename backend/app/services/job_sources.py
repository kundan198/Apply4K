"""Free, fast, legal job aggregation from public ATS APIs.

Pulls entry-level US software jobs from Greenhouse, Lever, and Ashby public
job-board endpoints. All endpoints are unauthenticated JSON APIs (no HTML
scraping, no login) and are safe to hit from a serverless function within a
~30s budget.

Each fetcher returns a list of dicts in the SAME shape ``apify_jobs._normalize``
expects::

    {title, companyName, location, descriptionText, applyUrl, postedAt, source}

``apify_jobs._source_from_url`` infers the source from the apply URL host, so
passing the real ATS apply URL is enough to tag greenhouse/lever/ashby.

NOTE: ATS board slugs drift over time (companies migrate boards, rename orgs,
or pause hiring). Slugs below are curated but may need periodic updating. Any
company that errors, times out, or returns junk is skipped silently — the
aggregation never crashes because of one bad slug.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from html import unescape
import re
import time
from typing import Any, Dict, List, Optional

import httpx


# Per-request and whole-aggregation time budgets (seconds). Tuned to stay well
# under a serverless 30-60s function limit.
REQUEST_TIMEOUT = 6.0
TOTAL_BUDGET = 30.0
MAX_WORKERS = 12

# Curated set of well-known companies that actively hire entry-level / new-grad
# software engineers and expose one of the three free ATS APIs. slug is the
# board identifier used in the API path. These are conservative, real slugs;
# they may need periodic updating as companies change boards.
COMPANIES: Dict[str, Dict[str, str]] = {
    # --- Greenhouse (boards-api.greenhouse.io) ---
    "Stripe": {"ats": "greenhouse", "slug": "stripe"},
    "Databricks": {"ats": "greenhouse", "slug": "databricks"},
    "Brex": {"ats": "greenhouse", "slug": "brex"},
    "GitLab": {"ats": "greenhouse", "slug": "gitlab"},
    "Cloudflare": {"ats": "greenhouse", "slug": "cloudflare"},
    "Robinhood": {"ats": "greenhouse", "slug": "robinhood"},
    "Discord": {"ats": "greenhouse", "slug": "discord"},
    "Coinbase": {"ats": "greenhouse", "slug": "coinbase"},
    "Airbnb": {"ats": "greenhouse", "slug": "airbnb"},
    "Dropbox": {"ats": "greenhouse", "slug": "dropbox"},
    "Reddit": {"ats": "greenhouse", "slug": "reddit"},
    "Plaid": {"ats": "greenhouse", "slug": "plaid"},
    "Benchling": {"ats": "greenhouse", "slug": "benchling"},
    "Samsara": {"ats": "greenhouse", "slug": "samsara"},
    "Affirm": {"ats": "greenhouse", "slug": "affirm"},
    "Instacart": {"ats": "greenhouse", "slug": "instacart"},
    "DoorDash": {"ats": "greenhouse", "slug": "doordash"},
    "Figma": {"ats": "greenhouse", "slug": "figma"},
    "Twilio": {"ats": "greenhouse", "slug": "twilio"},
    "Gusto": {"ats": "greenhouse", "slug": "gusto"},
    # --- Lever (api.lever.co) ---
    "Ramp": {"ats": "lever", "slug": "ramp"},
    "Attentive": {"ats": "lever", "slug": "attentive"},
    "KeepTruckin": {"ats": "lever", "slug": "gomotive"},
    "Netlify": {"ats": "lever", "slug": "netlify"},
    "Alan": {"ats": "lever", "slug": "alan"},
    # --- Ashby (api.ashbyhq.com) ---
    "Linear": {"ats": "ashby", "slug": "Linear"},
    "Vanta": {"ats": "ashby", "slug": "Vanta"},
    "Mercury": {"ats": "ashby", "slug": "Mercury"},
    "Notion": {"ats": "ashby", "slug": "Notion"},
    "PostHog": {"ats": "ashby", "slug": "posthog"},
    "Replit": {"ats": "ashby", "slug": "replit"},
    "Deel": {"ats": "ashby", "slug": "Deel"},
    "OpenStore": {"ats": "ashby", "slug": "openstore"},
}


def fetch_all_jobs(
    companies: Optional[Dict[str, Dict[str, str]]] = None,
    request_timeout: float = REQUEST_TIMEOUT,
    total_budget: float = TOTAL_BUDGET,
    max_workers: int = MAX_WORKERS,
) -> List[Dict[str, Any]]:
    """Fetch jobs from every curated company concurrently, failing soft.

    Returns a flat list of normalized-shape dicts. Any company that errors or
    times out contributes nothing and never raises.
    """
    companies = companies or COMPANIES
    deadline = time.monotonic() + total_budget
    results: List[Dict[str, Any]] = []

    with httpx.Client(
        follow_redirects=True,
        timeout=request_timeout,
        headers={"User-Agent": "Apply4K/1.0 (+job-aggregator)"},
    ) as client:
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = {
                pool.submit(_fetch_company, client, name, cfg): name
                for name, cfg in companies.items()
            }
            for future in as_completed(futures):
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                try:
                    jobs = future.result(timeout=max(0.1, remaining))
                except Exception:
                    # Fail soft: skip this company entirely.
                    continue
                if jobs:
                    results.extend(jobs)
    return results


def _fetch_company(
    client: httpx.Client, company: str, cfg: Dict[str, str]
) -> List[Dict[str, Any]]:
    ats = (cfg.get("ats") or "").lower()
    slug = cfg.get("slug") or ""
    if not slug:
        return []
    try:
        if ats == "greenhouse":
            return _fetch_greenhouse(client, company, slug)
        if ats == "lever":
            return _fetch_lever(client, company, slug)
        if ats == "ashby":
            return _fetch_ashby(client, company, slug)
    except Exception:
        return []
    return []


def _fetch_greenhouse(
    client: httpx.Client, company: str, slug: str
) -> List[Dict[str, Any]]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs"
    resp = client.get(url, params={"content": "true"})
    if resp.status_code >= 400:
        return []
    data = resp.json()
    jobs: List[Dict[str, Any]] = []
    for job in data.get("jobs", []) or []:
        title = str(job.get("title") or "").strip()
        if not title:
            continue
        location = ""
        loc = job.get("location")
        if isinstance(loc, dict):
            location = str(loc.get("name") or "").strip()
        apply_url = str(job.get("absolute_url") or "").strip()
        if not apply_url:
            continue
        jobs.append(
            {
                "title": title,
                "companyName": company,
                "location": location,
                "descriptionText": _clean_html(job.get("content") or ""),
                "applyUrl": apply_url,
                "postedAt": _parse_ts(job.get("updated_at")),
                "source": "greenhouse",
            }
        )
    return jobs


def _fetch_lever(
    client: httpx.Client, company: str, slug: str
) -> List[Dict[str, Any]]:
    url = f"https://api.lever.co/v0/postings/{slug}"
    resp = client.get(url, params={"mode": "json"})
    if resp.status_code >= 400:
        return []
    data = resp.json()
    if not isinstance(data, list):
        return []
    jobs: List[Dict[str, Any]] = []
    for job in data:
        title = str(job.get("text") or "").strip()
        if not title:
            continue
        categories = job.get("categories") or {}
        location = str(
            categories.get("location") or categories.get("team") or ""
        ).strip()
        apply_url = str(job.get("hostedUrl") or job.get("applyUrl") or "").strip()
        if not apply_url:
            continue
        description = str(
            job.get("descriptionPlain") or job.get("description") or ""
        ).strip()
        jobs.append(
            {
                "title": title,
                "companyName": company,
                "location": location,
                "descriptionText": _clean_html(description),
                "applyUrl": apply_url,
                "postedAt": _parse_ts(job.get("createdAt")),
                "source": "lever",
            }
        )
    return jobs


def _fetch_ashby(
    client: httpx.Client, company: str, slug: str
) -> List[Dict[str, Any]]:
    url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}"
    resp = client.get(url, params={"includeCompensation": "true"})
    if resp.status_code >= 400:
        return []
    data = resp.json()
    jobs: List[Dict[str, Any]] = []
    for job in data.get("jobs", []) or []:
        title = str(job.get("title") or "").strip()
        if not title:
            continue
        location = str(job.get("location") or "").strip()
        apply_url = str(job.get("jobUrl") or job.get("applyUrl") or "").strip()
        if not apply_url:
            continue
        description = str(
            job.get("descriptionPlain") or job.get("description") or ""
        ).strip()
        jobs.append(
            {
                "title": title,
                "companyName": company,
                "location": location,
                "descriptionText": _clean_html(description),
                "applyUrl": apply_url,
                "postedAt": _parse_ts(job.get("publishedAt")),
                "source": "ashby",
            }
        )
    return jobs


def _clean_html(value: Any) -> str:
    """Strip HTML tags/entities to plain text; tolerate already-plain input."""
    text = str(value or "")
    text = re.sub(r"</br\s*>|<br\s*/?>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", unescape(text)).strip()


def _parse_ts(value: Any) -> Optional[str]:
    """Normalize a posted timestamp to an ISO date string (YYYY-MM-DD).

    Accepts epoch millis (Lever/Ashby) or ISO strings (Greenhouse). Returns
    None when it cannot be parsed — the downstream pipeline treats missing
    dates as "unknown, do not drop for age".
    """
    if value is None or value == "":
        return None
    # Epoch millis (int or numeric string).
    if isinstance(value, (int, float)) or (
        isinstance(value, str) and value.isdigit()
    ):
        try:
            from datetime import datetime, timezone

            ms = float(value)
            return (
                datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc)
                .date()
                .isoformat()
            )
        except (ValueError, OverflowError, OSError):
            return None
    # ISO string — keep the date portion.
    text = str(value)
    match = re.match(r"(\d{4}-\d{2}-\d{2})", text)
    if match:
        return match.group(1)
    return None
