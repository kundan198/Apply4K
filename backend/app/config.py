"""Application configuration loaded from environment / .env via pydantic-settings."""
import os
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

def _normalize_pg(url: str) -> str:
    """SQLAlchemy needs the `postgresql://` scheme; Vercel/Heroku hand out
    `postgres://`. Rewrite it and force psycopg2 as the driver."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


def _resolve_database_url() -> str:
    """Pick a database URL, preferring a real Postgres in production.

    Vercel Postgres injects `POSTGRES_URL` (pooled, serverless-friendly). We also
    honor an explicit `DATABASE_URL`. Locally we fall back to SQLite. On Vercel
    with no Postgres configured we still use SQLite in /tmp, but that is EPHEMERAL
    (resets between invocations) — set a Postgres URL for persistence.
    """
    for key in ("DATABASE_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING"):
        value = os.getenv(key)
        if value and value.strip():
            return _normalize_pg(value.strip())
    return "sqlite:////tmp/applywise.db" if os.getenv("VERCEL") else "sqlite:///./applywise.db"


DEFAULT_DATABASE_URL = _resolve_database_url()


class Settings(BaseSettings):
    """Runtime settings.

    OPENAI_API_KEY being empty is the signal to run in deterministic mock mode.
    """

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    APIFY_TOKEN: str = ""
    APIFY_LINKEDIN_ACTOR: str = "curious_coder/linkedin-jobs-scraper"
    # The Apify LinkedIn actor is slow (minutes) and exceeds serverless timeouts,
    # so it is opt-in. It only runs when APIFY_TOKEN is set AND this is true.
    ENABLE_APIFY: bool = False
    DATABASE_URL: str = DEFAULT_DATABASE_URL
    # Comma-separated origins. chrome-extension://* is handled separately via regex.
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174,"
        "https://apply4k-kundan.web.app,https://apply4k-kundan.firebaseapp.com"
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def _fix_pg_scheme(cls, value: str) -> str:
        return _normalize_pg(value) if value else value

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def use_real_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY and self.OPENAI_API_KEY.strip())


settings = Settings()
