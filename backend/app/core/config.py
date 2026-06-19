"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "QuestKids"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-change-in-production-questkids"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database: SQLite for dev, PostgreSQL for production
    DATABASE_URL: str = "sqlite+aiosqlite:////app/persistent/questkids.db"

    # CORS — stored as comma-separated string (Coolify passes plain strings, not JSON arrays)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS_ORIGINS into a list for FastAPI middleware."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # File storage path
    UPLOAD_DIR: str = "./uploads"

    # SMTP settings for email verification
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@questkids.local"
    SMTP_USE_TLS: bool = True
    BASE_URL: str = "http://localhost:5173"

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True

    # Backup
    BACKUP_DIR: str = "./backups"
    BACKUP_RETENTION_DAYS: int = 7

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
