from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password
from app.engineers import DEMO_PASSWORD, DEMO_USERS
from app.models.entities import User

USER_FK_UPDATES = [
    ("services", "owner_id"),
    ("alerts", "assignee_id"),
    ("alert_timeline_entries", "author_id"),
    ("incidents", "manager_id"),
    ("incidents", "commander_id"),
    ("incident_timeline_entries", "author_id"),
    ("action_items", "owner_id"),
    ("changes", "submitter_id"),
    ("maintenance_windows", "created_by_id"),
    ("audit_logs", "user_id"),
    ("notification_policies", "user_id"),
    ("notification_logs", "user_id"),
    ("on_call_shifts", "user_id"),
    ("on_call_overrides", "original_user_id"),
    ("on_call_overrides", "override_user_id"),
]


async def migrate_engineers(session: AsyncSession) -> None:
    """Ensure demo accounts exist with the correct roles and credentials."""
    users = list((await session.scalars(select(User).order_by(User.id))).all())
    default_team_id = users[0].team_id if users else None

    for name, email, role in DEMO_USERS:
        user = await session.scalar(select(User).where(User.email == email))
        if not user:
            user = await session.scalar(select(User).where(User.name == name))
        if user:
            user.name = name
            user.email = email
            user.role = role
            user.password_hash = hash_password(DEMO_PASSWORD)
            if user.team_id is None:
                user.team_id = default_team_id
        else:
            session.add(
                User(
                    name=name,
                    email=email,
                    role=role,
                    team_id=default_team_id,
                    password_hash=hash_password(DEMO_PASSWORD),
                )
            )

    await session.flush()
    users = list((await session.scalars(select(User).order_by(User.id))).all())
    if not users:
        await session.commit()
        return

    demo_emails = {email for _, email, _ in DEMO_USERS}
    keep_users = [user for user in users if user.email in demo_emails]
    if not keep_users:
        keep_users = users[: len(DEMO_USERS)]

    primary_id = keep_users[0].id
    keep_ids = {user.id for user in keep_users}

    for extra_user in users:
        if extra_user.id in keep_ids:
            continue
        for table, column in USER_FK_UPDATES:
            await session.execute(
                text(f"UPDATE {table} SET {column} = :primary_id WHERE {column} = :user_id"),
                {"primary_id": primary_id, "user_id": extra_user.id},
            )
        await session.delete(extra_user)

    await session.commit()
