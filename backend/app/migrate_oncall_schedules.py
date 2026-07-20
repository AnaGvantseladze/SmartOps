from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.oncall import OnCallSchedule, OnCallScheduleType, OnCallShift, RotationFrequency

LOWERCASE_SCHEDULE_TYPES = (
    "engineer",
    "incident_manager",
    "change_manager",
    "noc",
    "service_owner",
    "incident_commander",
)


async def migrate_oncall_schedules(session: AsyncSession) -> None:
    """Normalize on-call schedules to engineer, incident manager, and change manager."""
    for value in LOWERCASE_SCHEDULE_TYPES:
        await session.execute(
            text(
                f"""
                DO $$ BEGIN
                    ALTER TYPE oncallscheduletype ADD VALUE '{value}';
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
                """
            )
        )
    await session.commit()

    rows = (
        await session.execute(text("SELECT id, schedule_type::text FROM on_call_schedules ORDER BY id"))
    ).all()
    if not rows:
        return

    engineer_id: int | None = None
    incident_manager_id: int | None = None
    change_manager_id: int | None = None

    for schedule_id, schedule_type in rows:
        normalized = schedule_type.lower()
        if normalized in {"noc", "service_owner", "engineer"} and engineer_id is None:
            engineer_id = schedule_id
        elif normalized == "incident_manager" and incident_manager_id is None:
            incident_manager_id = schedule_id
        elif normalized in {"incident_commander", "change_manager"} and change_manager_id is None:
            change_manager_id = schedule_id

    if engineer_id is not None:
        await session.execute(
            text(
                "UPDATE on_call_schedules SET name = 'Engineer On-Call', schedule_type = 'engineer' WHERE id = :id"
            ),
            {"id": engineer_id},
        )
    if incident_manager_id is not None:
        await session.execute(
            text(
                "UPDATE on_call_schedules SET name = 'Incident Manager On-Call', "
                "schedule_type = 'incident_manager' WHERE id = :id"
            ),
            {"id": incident_manager_id},
        )
    if change_manager_id is not None:
        await session.execute(
            text(
                "UPDATE on_call_schedules SET name = 'Change Manager On-Call', "
                "schedule_type = 'change_manager' WHERE id = :id"
            ),
            {"id": change_manager_id},
        )

    keep_ids = [schedule_id for schedule_id in (engineer_id, incident_manager_id, change_manager_id) if schedule_id]
    if keep_ids:
        placeholders = ", ".join(str(schedule_id) for schedule_id in keep_ids)
        await session.execute(text(f"UPDATE on_call_schedules SET is_active = false WHERE id NOT IN ({placeholders})"))

    for value in ("daily", "weekly", "custom"):
        await session.execute(
            text(
                f"""
                DO $$ BEGIN
                    ALTER TYPE rotationfrequency ADD VALUE '{value}';
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
            UPDATE on_call_schedules
            SET rotation_frequency = CASE rotation_frequency::text
                WHEN 'DAILY' THEN 'daily'
                WHEN 'WEEKLY' THEN 'weekly'
                WHEN 'CUSTOM' THEN 'custom'
                ELSE rotation_frequency::text
            END::rotationfrequency
            """
        )
    )

    await session.commit()


async def ensure_default_oncall_schedules(session: AsyncSession) -> None:
    """Create the three role schedules when none exist (e.g. after partial seed)."""
    from datetime import datetime, timedelta, timezone

    from app.engineers import DEMO_USERS
    from app.models.entities import User

    active = (
        await session.scalars(
            select(OnCallSchedule).where(
                OnCallSchedule.is_active == True,  # noqa: E712
                OnCallSchedule.schedule_type.in_(
                    [
                        OnCallScheduleType.ENGINEER,
                        OnCallScheduleType.INCIDENT_MANAGER,
                        OnCallScheduleType.CHANGE_MANAGER,
                    ]
                ),
            )
        )
    ).all()
    existing_types = {schedule.schedule_type for schedule in active}
    required = {
        OnCallScheduleType.ENGINEER,
        OnCallScheduleType.INCIDENT_MANAGER,
        OnCallScheduleType.CHANGE_MANAGER,
    }
    if required.issubset(existing_types):
        return

    users = {u.email: u for u in (await session.scalars(select(User))).all()}
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())

    defaults = [
        (OnCallScheduleType.ENGINEER, "Engineer On-Call", DEMO_USERS[2][1]),
        (OnCallScheduleType.INCIDENT_MANAGER, "Incident Manager On-Call", DEMO_USERS[1][1]),
        (OnCallScheduleType.CHANGE_MANAGER, "Change Manager On-Call", DEMO_USERS[3][1]),
    ]

    for schedule_type, name, email in defaults:
        if schedule_type in existing_types:
            continue
        user = users.get(email)
        schedule = OnCallSchedule(
            name=name,
            schedule_type=schedule_type,
            rotation_frequency=RotationFrequency.WEEKLY,
            timezone="UTC",
        )
        session.add(schedule)
        await session.flush()
        if user:
            session.add(
                OnCallShift(
                    schedule_id=schedule.id,
                    user_id=user.id,
                    start_time=week_start,
                    end_time=week_start + timedelta(days=7),
                )
            )

    await session.commit()
