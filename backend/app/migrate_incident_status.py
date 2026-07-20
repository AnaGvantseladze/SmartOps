from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def migrate_incident_statuses(session: AsyncSession) -> None:
    """Add PENDING_TEAMS status and migrate legacy PIR/action-item columns."""
    await session.execute(
        text(
            """
            DO $$ BEGIN
                ALTER TYPE incidentstatus ADD VALUE 'PENDING_TEAMS';
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END $$;
            """
        )
    )
    await session.commit()

    await session.execute(
        text(
            """
            UPDATE incidents
            SET status = 'PENDING_TEAMS'
            WHERE status::text IN ('PIR_PENDING', 'ACTION_ITEMS_PENDING', 'pir_pending', 'action_items_pending')
            """
        )
    )
    await session.commit()
