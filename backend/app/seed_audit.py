from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.entities import User


async def seed_audit_logs(session: AsyncSession) -> None:
    existing = await session.scalar(select(func.count()).select_from(AuditLog))
    if existing:
        return

    admin = await session.scalar(select(User).where(User.email == "admin@opscore.com"))
    now = datetime.now(timezone.utc)

    if not admin:
        return

    session.add_all(
        [
            AuditLog(
                user_id=admin.id,
                action="user.created",
                resource_type="user",
                resource_id="2",
                details="Created user sre@opscore.com with role engineer",
                ip_address="10.0.0.1",
                created_at=now - timedelta(days=2),
            ),
            AuditLog(
                user_id=admin.id,
                action="service.created",
                resource_type="service",
                resource_id="1",
                details="Added service Trading (Tier 1) to catalog",
                ip_address="10.0.0.1",
                created_at=now - timedelta(days=1, hours=5),
            ),
            AuditLog(
                user_id=admin.id,
                action="integration.connected",
                resource_type="integration",
                resource_id="splunk",
                details="Connected Splunk webhook integration",
                ip_address="10.0.0.1",
                created_at=now - timedelta(hours=12),
            ),
            AuditLog(
                user_id=admin.id,
                action="alert.status_changed",
                resource_type="alert",
                resource_id="1",
                details="Changed alert status to acknowledged",
                ip_address="10.0.0.1",
                created_at=now - timedelta(hours=2),
            ),
            AuditLog(
                user_id=admin.id,
                action="notification_policy.updated",
                resource_type="policy",
                resource_id="1",
                details="Updated organization default notification policy",
                ip_address="10.0.0.1",
                created_at=now - timedelta(hours=1),
            ),
        ]
    )
    await session.commit()
