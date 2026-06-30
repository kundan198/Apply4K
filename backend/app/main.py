"""Apply4K backend — FastAPI application entrypoint.

Creates tables and seeds the demo user (id=1) on startup, configures CORS for the local
frontend and chrome-extension origins, and mounts all API routers.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .models import User
from .routers import (
    applications,
    dashboard,
    jobs,
    legitimacy,
    messages,
    resume,
    tailor,
)

DEMO_USER_ID = 1


def _init_db() -> None:
    """Create tables and seed the demo user if absent."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.get(User, DEMO_USER_ID) is None:
            db.add(
                User(
                    id=DEMO_USER_ID,
                    name="Kundan Srinivas Sakkuru",
                    email="kundan@skillsgit.io",
                )
            )
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_db()
    yield


app = FastAPI(title="Apply4K", version="1.0.0", lifespan=lifespan)

# CORS: explicit localhost origins + any chrome-extension://<id> via regex.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["http://localhost:5173"],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(tailor.router)
app.include_router(messages.router)
app.include_router(applications.router)
app.include_router(legitimacy.router)
app.include_router(dashboard.router)


@app.get("/")
def root() -> dict:
    return {
        "app": "Apply4K",
        "status": "ok",
        "ai_mode": "openai" if settings.use_real_openai else "mock",
    }


@app.get("/health")
def health() -> dict:
    return {"ok": True}
