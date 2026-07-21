import logging
import os

from sqlalchemy import text

from app.config import settings
from app.database import Base, async_session, engine
from app.migrate_change_impact import migrate_change_impact_fields
from app.migrate_engineers import migrate_engineers
from app.migrate_incident_status import migrate_incident_statuses
from app.migrate_oncall_schedules import ensure_default_oncall_schedules, migrate_oncall_schedules
from app.migrate_roles import migrate_removed_roles
from app.migrate_webhooks import migrate_azure_to_webhooks
from app.seed import ensure_auth_schema, ensure_auth_users, seed_demo_data
from app.seed_audit import seed_audit_logs
from app.seed_notifications import seed_notifications_and_oncall

logger = logging.getLogger("smartops.startup")
_startup_error: str | None = None


def get_startup_error() -> str | None:
    return _startup_error


async def initialize_database() -> None:
    global _startup_error

    import app.models.audit  # noqa: F401
    import app.models.notifications  # noqa: F401
    import app.models.oncall  # noqa: F401
    import app.models.entities  # noqa: F401

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        if settings.is_sqlite:
            await _bootstrap_sqlite()
        elif os.getenv("VERCEL"):
            await _bootstrap_vercel_postgres()
        else:
            await _bootstrap_local_postgres()

        _startup_error = None
    except Exception as exc:
        _startup_error = str(exc)
        logger.exception("Database initialization failed")
        raise


async def _bootstrap_sqlite() -> None:
    if not settings.seed_demo_data:
        return
    async with async_session() as session:
        await seed_demo_data(session)
        await ensure_auth_users(session)


async def _bootstrap_vercel_postgres() -> None:
    """Lightweight startup for serverless: auth users only, skip heavy demo seed."""
    async with async_session() as session:
        await migrate_engineers(session)
        await ensure_auth_users(session)


async def _bootstrap_local_postgres() -> None:
    await ensure_auth_schema(engine)
    async with async_session() as session:
        await migrate_removed_roles(session)
        await migrate_azure_to_webhooks(session)
        await migrate_incident_statuses(session)
        await migrate_engineers(session)
        await migrate_change_impact_fields(session)
        await migrate_oncall_schedules(session)
        await ensure_default_oncall_schedules(session)

    if settings.seed_demo_data:
        async with async_session() as session:
            await seed_demo_data(session)
            await ensure_auth_users(session)
            await seed_notifications_and_oncall(session)
            await seed_audit_logs(session)


async def verify_database_connection() -> bool:
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
