import ssl
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


def _postgres_connect_args(database_url: str) -> dict:
    parsed = urlparse(database_url)
    query = parse_qs(parsed.query)
    ssl_requested = any(
        key in query for key in ("sslmode", "ssl", "channel_binding")
    ) or (parsed.hostname or "").endswith(".neon.tech")

    if not ssl_requested:
        return {}

    return {"ssl": ssl.create_default_context()}


def _strip_asyncpg_query_params(database_url: str) -> str:
    parsed = urlparse(database_url)
    query = parse_qs(parsed.query)
    for key in ("sslmode", "ssl", "channel_binding"):
        query.pop(key, None)
    clean_query = urlencode({key: values[0] for key, values in query.items()})
    return urlunparse(parsed._replace(query=clean_query))


if settings.is_sqlite:
    engine = create_async_engine(settings.database_url, echo=False)
else:
    postgres_url = _strip_asyncpg_query_params(settings.database_url)
    engine = create_async_engine(
        postgres_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=1,
        max_overflow=0,
        pool_recycle=300,
        connect_args=_postgres_connect_args(settings.database_url),
    )

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
