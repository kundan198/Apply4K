"""Application configuration loaded from environment / .env via pydantic-settings."""
import os
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DATABASE_URL = (
    "sqlite:////tmp/applywise.db" if os.getenv("VERCEL") else "sqlite:///./applywise.db"
)


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
    DATABASE_URL: str = DEFAULT_DATABASE_URL
    # Comma-separated origins. chrome-extension://* is handled separately via regex.
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def use_real_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY and self.OPENAI_API_KEY.strip())


settings = Settings()
