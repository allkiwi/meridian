from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to this file so it works regardless of CWD
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://meridian:meridian@localhost:5432/meridian"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Google OAuth (used for email integration during onboarding)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""

    # App
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    debug: bool = False
    frontend_url: str = "http://localhost:5173"


settings = Settings()
