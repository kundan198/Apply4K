# Apply4K — Backend

FastAPI + Pydantic v2 + SQLAlchemy 2.x backend for the Apply4K job-application
assistant. Runs fully offline in deterministic **mock mode** when no OpenAI key is set.

## Stack
- Python 3.9+ · FastAPI · Pydantic v2 · SQLAlchemy 2.x ORM
- SQLite for local dev (`applywise.db`); schema mirrors the Postgres design
- OpenAI SDK with a deterministic mock fallback for every AI feature

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional; defaults work out of the box
```

### Environment (`.env`)
| var | default | notes |
|-----|---------|-------|
| `OPENAI_API_KEY` | *(empty)* | leave empty to run in offline mock mode |
| `OPENAI_MODEL` | `gpt-4o-mini` | used only when a key is present |
| `DATABASE_URL` | `sqlite:///./applywise.db` | any SQLAlchemy URL |
| `CORS_ORIGINS` | `http://localhost:5173` | comma-separated; chrome-extension origins are always allowed |

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- App: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

On startup the app creates all tables and seeds the demo user (`id=1`,
Kundan Srinivas Sakkuru, kundan@skillsgit.io).

## Mock vs. real AI
If `OPENAI_API_KEY` is empty the app uses deterministic heuristics:
- **Scoring** — `services/scorer.py` implements the exact 40/20/20/10/10 breakdown and
  hard red-flag detection from `SCORING_RULES.md`. The scorer is also the guardrail in
  real-AI mode, so totals/red-flags stay consistent with the extension overlay.
- **Resume parsing** — matches a built-in tech-skills dictionary against the PDF text.
- **Tailoring / messages / legitimacy** — template + heuristic generation.

## Endpoints (all under `/api`)
- `POST /resume/upload`, `GET /resume`, `GET /resume/{id}`, `DELETE /resume/{id}`
- `POST /jobs/score`, `GET /jobs`, `POST /jobs`, `GET /jobs/recommendations?resume_id=`
- `POST /tailor`
- `POST /messages`
- `GET/POST /applications`, `PATCH/DELETE /applications/{id}`
- `POST /legitimacy/check`
- `GET /dashboard/daily?resume_id=`
