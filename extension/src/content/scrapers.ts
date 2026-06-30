// Per-site job scrapers. Each returns a partial ScrapedJob; the entry point
// picks the right one by hostname and fills gaps from a generic fallback
// (Open Graph tags + JSON-LD JobPosting).

import type { ScrapedJob } from "../lib/types";

function text(el: Element | null | undefined): string {
  return (el?.textContent || "").replace(/\s+/g, " ").trim();
}

function firstText(selectors: string[], root: ParentNode = document): string {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    const t = text(el);
    if (t) return t;
  }
  return "";
}

function meta(prop: string): string {
  const el =
    document.querySelector(`meta[property="${prop}"]`) ||
    document.querySelector(`meta[name="${prop}"]`);
  return (el?.getAttribute("content") || "").trim();
}

// ---- JSON-LD JobPosting (works on many career sites) ----
interface JsonLdJob {
  "@type"?: string | string[];
  title?: string;
  description?: string;
  hiringOrganization?: { name?: string } | string;
  jobLocation?:
    | { address?: { addressLocality?: string; addressRegion?: string } }
    | Array<{ address?: { addressLocality?: string; addressRegion?: string } }>;
}

function htmlToText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").replace(/\s+/g, " ").trim();
}

function readJsonLdJob(): Partial<ScrapedJob> | null {
  const scripts = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]')
  );
  for (const s of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(s.textContent || "");
    } catch {
      continue;
    }
    const candidates: JsonLdJob[] = Array.isArray(parsed)
      ? (parsed as JsonLdJob[])
      : [parsed as JsonLdJob];
    for (const c of candidates) {
      const t = c["@type"];
      const isJob = Array.isArray(t)
        ? t.includes("JobPosting")
        : t === "JobPosting";
      if (!isJob) continue;
      const org =
        typeof c.hiringOrganization === "string"
          ? c.hiringOrganization
          : c.hiringOrganization?.name;
      const locNode = Array.isArray(c.jobLocation)
        ? c.jobLocation[0]
        : c.jobLocation;
      const addr = locNode?.address;
      const location = [addr?.addressLocality, addr?.addressRegion]
        .filter(Boolean)
        .join(", ");
      return {
        title: c.title || "",
        company: org || "",
        location: location || undefined,
        description: c.description ? htmlToText(c.description) : ""
      };
    }
  }
  return null;
}

function genericScrape(): ScrapedJob {
  const jsonLd = readJsonLdJob();
  const ogTitle = meta("og:title");
  const title =
    jsonLd?.title ||
    ogTitle ||
    firstText(["h1", "h2"]) ||
    document.title;
  const company =
    jsonLd?.company ||
    meta("og:site_name") ||
    firstText(['[class*="company"]', '[data-company]']);
  const description =
    jsonLd?.description ||
    meta("og:description") ||
    firstText([
      '[class*="description"]',
      '[class*="job-detail"]',
      "main",
      "article"
    ]) ||
    text(document.body).slice(0, 8000);
  return {
    title,
    company,
    location: jsonLd?.location,
    description,
    url: location.href,
    easy_apply: false,
    source: "generic"
  };
}

// ---- LinkedIn ----
function scrapeLinkedIn(): ScrapedJob {
  const title = firstText([
    ".job-details-jobs-unified-top-card__job-title",
    ".jobs-unified-top-card__job-title",
    "h1.t-24",
    "h1"
  ]);
  const company = firstText([
    ".job-details-jobs-unified-top-card__company-name a",
    ".job-details-jobs-unified-top-card__company-name",
    ".jobs-unified-top-card__company-name",
    'a[data-test-app-aware-link][href*="/company/"]'
  ]);
  const location = firstText([
    ".job-details-jobs-unified-top-card__primary-description-container span:first-child",
    ".jobs-unified-top-card__bullet",
    ".job-details-jobs-unified-top-card__tertiary-description-container"
  ]);
  const description = firstText([
    "#job-details",
    ".jobs-description__content",
    ".jobs-description-content__text",
    "article.jobs-description__container"
  ]);

  // Easy Apply: LinkedIn shows a button with this label.
  const buttons = Array.from(
    document.querySelectorAll("button, a")
  ) as HTMLElement[];
  const easy_apply = buttons.some((b) =>
    /easy apply/i.test(b.textContent || "")
  );

  const generic = genericScrape();
  return {
    title: title || generic.title,
    company: company || generic.company,
    location: location || generic.location,
    description: description || generic.description,
    url: location ? window.location.href : generic.url,
    easy_apply,
    source: "linkedin"
  };
}

// ---- Greenhouse (boards.greenhouse.io) ----
function scrapeGreenhouse(): ScrapedJob {
  const generic = genericScrape();
  const title = firstText([".app-title", "h1.app-title", "h1"]) || generic.title;
  const company =
    firstText([".company-name", "span.company-name"]).replace(/^at\s+/i, "") ||
    generic.company;
  const location = firstText([".location", ".app-location"]) || generic.location;
  const description =
    firstText(["#content", ".job__description", ".content"]) ||
    generic.description;
  return {
    title,
    company,
    location,
    description,
    url: window.location.href,
    easy_apply: true, // direct-apply ATS
    source: "greenhouse"
  };
}

// ---- Lever (jobs.lever.co) ----
function scrapeLever(): ScrapedJob {
  const generic = genericScrape();
  const title =
    firstText([".posting-headline h2", ".posting-headline", "h2"]) ||
    generic.title;
  const company =
    firstText([".main-header-logo img"]) ||
    (document.querySelector(".main-header-logo img") as HTMLImageElement | null)
      ?.alt ||
    generic.company;
  const location =
    firstText([
      ".posting-categories .location",
      ".sort-by-time .location",
      ".location"
    ]) || generic.location;
  const description =
    firstText([".section-wrapper.page-full-width", ".content", ".section"]) ||
    generic.description;
  return {
    title,
    company,
    location,
    description,
    url: window.location.href,
    easy_apply: true,
    source: "lever"
  };
}

// ---- Ashby (jobs.ashbyhq.com) ----
function scrapeAshby(): ScrapedJob {
  const generic = genericScrape();
  const title = firstText(["h1", '[class*="title"]']) || generic.title;
  // Ashby uses hashed class names; lean on JSON-LD/OG via generic.
  const company = generic.company || meta("og:site_name");
  const description =
    firstText(['[class*="descriptionText"]', '[class*="jobDescription"]']) ||
    generic.description;
  return {
    title,
    company,
    location: generic.location,
    description,
    url: window.location.href,
    easy_apply: true,
    source: "ashby"
  };
}

export function scrapeCurrentPage(): ScrapedJob {
  const host = window.location.hostname;
  let job: ScrapedJob;
  if (host.includes("linkedin.com")) job = scrapeLinkedIn();
  else if (host.includes("greenhouse.io")) job = scrapeGreenhouse();
  else if (host.includes("lever.co")) job = scrapeLever();
  else if (host.includes("ashbyhq.com")) job = scrapeAshby();
  else job = genericScrape();

  // Final tidy: trim absurdly long descriptions for the API payload.
  job.description = (job.description || "").slice(0, 12000);
  return job;
}
