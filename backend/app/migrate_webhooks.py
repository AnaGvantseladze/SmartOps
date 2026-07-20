from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def migrate_azure_to_webhooks(session: AsyncSession) -> None:
    """Migrate legacy azure_integrations table to webhook_integrations."""
    await session.execute(
        text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'azure_integrations'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'webhook_integrations'
                ) THEN
                    ALTER TABLE azure_integrations RENAME TO webhook_integrations;
                END IF;
            END $$;
            """
        )
    )
    await session.execute(
        text(
            """
            ALTER TABLE IF EXISTS webhook_integrations
                DROP COLUMN IF EXISTS tenant_id,
                DROP COLUMN IF EXISTS subscription_id,
                DROP COLUMN IF EXISTS resource_group;
            """
        )
    )
    await session.execute(
        text(
            """
            ALTER TABLE IF EXISTS webhook_integrations
                ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(255);
            """
        )
    )
    await session.commit()
