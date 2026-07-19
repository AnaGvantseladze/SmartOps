from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def migrate_removed_roles(session: AsyncSession) -> None:
    """Map legacy role enum values removed from UserRole to supported roles."""
    await session.execute(
        text(
            """
            UPDATE users
            SET role = 'ENGINEER'
            WHERE role::text IN ('NOC_ANALYST', 'VIEWER')
            """
        )
    )
    await session.execute(
        text(
            """
            UPDATE users
            SET role = 'MANAGER'
            WHERE role::text = 'INCIDENT_MANAGER'
            """
        )
    )
    await session.commit()
