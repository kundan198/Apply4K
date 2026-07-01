"""SQLAlchemy engine, session factory, declarative Base and the get_db dependency."""
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from .config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# SQLite needs check_same_thread disabled for FastAPI's threadpool usage.
connect_args = {"check_same_thread": False} if _is_sqlite else {}

# On serverless (Vercel) each invocation is short-lived, so a persistent pool of
# Postgres connections goes stale between cold starts. NullPool opens a fresh
# connection per checkout and closes it after — the recommended pattern for
# Postgres behind serverless. SQLite keeps its default pool.
engine_kwargs = {"connect_args": connect_args, "future": True}
if not _is_sqlite:
    engine_kwargs["poolclass"] = NullPool
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
