from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def migrate_change_impact_fields(session: AsyncSession) -> None:
    """Add potential impact columns to changes table."""
    await session.execute(
        text(
            """
            ALTER TABLE changes
                ADD COLUMN IF NOT EXISTS potential_business_impact TEXT,
                ADD COLUMN IF NOT EXISTS affected_scope TEXT,
                ADD COLUMN IF NOT EXISTS expected_downtime VARCHAR(120);
            """
        )
    )
    await session.commit()
