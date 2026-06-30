# Apply4K

An AI-powered job application assistant that helps you find, score, tailor, and track
U.S.-based entry-level software jobs — plus a Chrome extension that scores LinkedIn jobs
in real time and assists (never auto-submits) applications.

Built for **Kundan Srinivas Sakkuru** — Entry-Level / New Grad Software Engineer.

---

## Monorepo layout

```
Apply4K/
├── backend/            FastAPI + SQLAlchemy + OpenAI (Python)
├── frontend/           React + TypeScript + Tailwind + shadcn-style UI (Vite)
├── extension/          Chrome Manifest V3 extension (content + background + popup)
├── docs/               Architecture, API contract, DB schema, candidate profile
└── README.md
```

## Tech stack

| Layer        | Choice                                            |
|--------------|---------------------------------------------------|
| Frontend     | React, TypeScript, Tailwind CSS, shadcn-style UI  |
| Backend      | Python FastAPI, Pydantic v2, SQLAlchemy 2.x       |
| Database     | PostgreSQL (SQLite fallback for local dev)        |
| AI           | OpenAI API (analysis, scoring, tailoring, writing)|
| Extension    | Manifest V3, content scripts, background worker   |
| Deploy       | Vercel (web), Render/Fly.io (api), Supabase (db)  |

## Quick start

### 1. Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```
API docs at http://localhost:8000/docs

> No `OPENAI_API_KEY`? The backend runs in **mock mode** with deterministic
> heuristic scoring/generation so you can develop the full UI offline.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

### 3. Chrome extension
```bash
cd extension
npm install && npm run build  # outputs to extension/dist
```
Then `chrome://extensions` → enable Developer Mode → **Load unpacked** → select `extension/dist`.

---

## MVP build order (status)

- **Phase 1** — Resume upload · paste JD · fit score · save to tracker ✅
- **Phase 2** — Resume tailoring · cover letter · HR/recruiter messages ✅
- **Phase 3** — LinkedIn extension · page scraper · score overlay · save job ✅
- **Phase 4** — Assisted apply autofill · tracker automation · follow-up reminders ✅
- **Phase 5** — Job search aggregation · legitimacy checker · daily top-5 ✅ (aggregator stubbed for live sources)

## Core safety rule

The extension **assists, autofills, and recommends** — it **never auto-submits**.
The user must review and click submit. See `extension/src/content/autofill.ts`.

See [`docs/`](docs/) for the full project plan, API contract, and database schema.
