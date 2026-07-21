import os

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_database_url() -> str:
    if os.getenv("VERCEL") and not os.getenv("DATABASE_URL") and not os.getenv("POSTGRES_URL"):
        return "sqlite+aiosqlite:////tmp/smartops.db"
    return "postgresql+asyncpg://opscore:opscore@localhost:5432/opscore"


def _normalize_host(value: str | None) -> str | None:
    if not value:
        return None
    host = value.strip()
    for prefix in ("https://", "http://"):
        if host.startswith(prefix):
            host = host[len(prefix) :]
    return host.rstrip("/") or None


# Vercel team slug domains are not valid deployment hosts.
_INVALID_PUBLIC_HOSTS = {"smart-ops-core1.vercel.app"}


def _pick_public_host() -> str | None:
    for env_key in ("VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_BRANCH_URL", "VERCEL_URL"):
        host = _normalize_host(os.getenv(env_key))
        if host and host not in _INVALID_PUBLIC_HOSTS:
            return host
    return None


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

        if os.getenv("VERCEL"):
            current_host = _normalize_host(self.public_base_url)
            if not self.public_base_url.startswith("https://") or current_host in _INVALID_PUBLIC_HOSTS:
                host = _pick_public_host()
                if host:
                    self.public_base_url = f"https://{host}"

        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


settings = Settings()


def resolve_public_base_url() -> str:
    if os.getenv("VERCEL"):
        host = _pick_public_host()
        if host:
            return f"https://{host}"
    return settings.public_base_url.rstrip("/")
