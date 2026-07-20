from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password
from app.engineers import ENGINEERS, ENGINEER_PASSWORD
from app.models.entities import User, UserRole

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
    """Replace demo personas with the SmartOps engineer team."""
    users = list((await session.scalars(select(User).order_by(User.id))).all())
    default_team_id = users[0].team_id if users else None

    for index, (name, email) in enumerate(ENGINEERS):
        if index < len(users):
            user = users[index]
            user.name = name
            user.email = email
            user.role = UserRole.ENGINEER
            user.password_hash = hash_password(ENGINEER_PASSWORD)
            if user.team_id is None:
                user.team_id = default_team_id
        else:
            session.add(
                User(
                    name=name,
                    email=email,
                    role=UserRole.ENGINEER,
                    team_id=default_team_id,
                    password_hash=hash_password(ENGINEER_PASSWORD),
                )
            )

    await session.flush()
    users = list((await session.scalars(select(User).order_by(User.id))).all())
    if not users:
        await session.commit()
        return

    keep_users = users[: len(ENGINEERS)]
    primary_id = keep_users[0].id

    for extra_user in users[len(ENGINEERS) :]:
        for table, column in USER_FK_UPDATES:
            await session.execute(
                text(f"UPDATE {table} SET {column} = :primary_id WHERE {column} = :user_id"),
                {"primary_id": primary_id, "user_id": extra_user.id},
            )
        await session.delete(extra_user)

    await session.commit()
