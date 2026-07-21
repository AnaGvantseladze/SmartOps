import os

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_database_url() -> str:
    if os.getenv("VERCEL") and not os.getenv("DATABASE_URL") and not os.getenv("POSTGRES_URL"):
        return "sqlite+aiosqlite:////tmp/smartops.db"
    return "postgresql+asyncpg://opscore:opscore@localhost:5432/opscore"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(
        default_factory=_default_database_url,
        validation_alias=AliasChoices(
            "DATABASE_URL",
            "POSTGRES_URL",
            "POSTGRES_PRISMA_URL",
            "POSTGRES_URL_NON_POOLING",
        ),
    )
    secret_key: str = "dev-secret-key-change-in-production"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    public_base_url: str = "http://localhost:8000"
    seed_demo_data: bool = True

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
        if value.startswith("postgres://"):
            return "postgresql+asyncpg://" + value[len("postgres://") :]
        if value.startswith("postgresql://") and "+asyncpg" not in value:
            return "postgresql+asyncpg://" + value[len("postgresql://") :]
        return value

    @model_validator(mode="after")
    def apply_vercel_defaults(self) -> "Settings":
        vercel_origins: list[str] = []
        for env_key in ("VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"):
            host = os.getenv(env_key)
            if host:
                vercel_origins.append(f"https://{host}")

        if vercel_origins:
            existing = {origin.strip() for origin in self.cors_origins.split(",") if origin.strip()}
            existing.update(vercel_origins)
            self.cors_origins = ",".join(sorted(existing))

        if os.getenv("VERCEL_URL") and not self.public_base_url.startswith("https://"):
            self.public_base_url = f"https://{os.getenv('VERCEL_URL')}"

        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


settings = Settings()
