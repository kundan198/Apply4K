# Apply4K — Chrome Extension (Manifest V3)

Reads the job on the page, gets an instant **fit score** from the Apply4K
backend, shows an on-page **score overlay** (Apply / Maybe / Skip + red flags),
lets you **Save** the job to your dashboard, **generate a recruiter message**,
and **assist autofill** of application forms.

> 🛡️ **No-auto-submit guarantee.** Apply4K only *fills* form fields. It never
> clicks a submit button and never calls `form.submit()`. You review every field
> and submit the application yourself. This is enforced in `src/content/autofill.ts`
> (no submit/click code path exists) and stated in the overlay, the autofill
> banner, and the popup.

## Supported sites

| Site | Match | Scraper |
|------|-------|---------|
| LinkedIn jobs | `https://www.linkedin.com/jobs/*` | DOM selectors + Easy-Apply detection, generic fallback |
| Greenhouse | `https://boards.greenhouse.io/*` | ATS selectors |
| Lever | `https://jobs.lever.co/*` | ATS selectors |
| Ashby | `https://jobs.ashbyhq.com/*` | JSON-LD / OG fallback |

Every scraper falls back to **JSON-LD `JobPosting`** and **Open Graph** meta tags
when site-specific selectors miss.

## Build

```bash
cd extension
npm install
npm run build      # type-checks, then emits dist/
```

`npm run build` produces a loadable unpacked extension in `extension/dist`:

```
dist/
  manifest.json     # MV3
  background.js     # service worker
  content.js        # scrapers + overlay + autofill
  popup.html / popup.js / popup.css   # React popup
  icons/icon16.png icon48.png icon128.png
```

`npm run dev` rebuilds JS on change (re-run for CSS/static changes).

## Load unpacked

1. `npm run build`
2. Open `chrome://extensions`
3. Toggle **Developer mode** (top right)
4. Click **Load unpacked** and select `extension/dist`
5. Open a supported job page — the score overlay appears top-right.

## Configure

Click the toolbar icon to open the popup → **Settings**:

- **API base URL** — defaults to `http://localhost:8000`
- **Resume** — pick the resume to score against (loaded from `GET /api/resume`)

Settings and the resume profile are cached in `chrome.storage.local`. The
selected resume’s profile is cached so autofill works even if the API is slow.

## How it talks to the backend

The **service worker** is the only component that calls the backend
(`/docs/API_CONTRACT.md`):

- `POST /api/jobs/score` — score the scraped job
- `POST /api/jobs` + `POST /api/applications` (status `Saved`) — Save to dashboard
- `POST /api/messages` (type `recruiter_message`) — generate a message
- `GET /api/resume`, `GET /api/resume/{id}` — resume list + profile cache

If the backend is offline (connection refused), the overlay shows
**“Backend offline — start Apply4K API”** but still scrapes and displays the job.

## Architecture

```
page  ──scrape──▶ content/index.ts ──message──▶ background/service-worker.ts ──fetch──▶ backend
                       │  overlay.ts (shadow DOM score card)
                       │  autofill.ts (safe, no-submit)
popup (React) ─────────┴──message──▶ background (relays scrape/autofill to active tab)
```
