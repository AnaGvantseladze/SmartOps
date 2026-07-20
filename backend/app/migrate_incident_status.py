from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def migrate_incident_statuses(session: AsyncSession) -> None:
    """Add pending_teams status and migrate legacy PIR/action-item columns."""
    await session.execute(
        text(
            """
            DO $$ BEGIN
                ALTER TYPE incidentstatus ADD VALUE 'pending_teams';
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END $$;
            """
        )
    )
    await session.execute(
        text(
            """
            UPDATE incidents
            SET status = 'pending_teams'
            WHERE status::text IN ('pir_pending', 'action_items_pending')
            """
        )
    )
    await session.commit()
