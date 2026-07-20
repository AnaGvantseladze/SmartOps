from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.oncall import OnCallSchedule, OnCallScheduleType, OnCallShift, RotationFrequency


async def migrate_oncall_schedules(session: AsyncSession) -> None:
    """Normalize on-call schedules to engineer, incident manager, and change manager."""
    for value in ("engineer", "change_manager"):
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

    schedules = (await session.scalars(select(OnCallSchedule).order_by(OnCallSchedule.id))).all()
    if not schedules:
        return

    engineer = next(
        (s for s in schedules if s.schedule_type in (OnCallScheduleType.ENGINEER, OnCallScheduleType.NOC, OnCallScheduleType.SERVICE_OWNER)),
        None,
    )
    incident_manager = next(
        (s for s in schedules if s.schedule_type == OnCallScheduleType.INCIDENT_MANAGER),
        None,
    )
    change_manager = next(
        (
            s
            for s in schedules
            if s.schedule_type in (OnCallScheduleType.CHANGE_MANAGER, OnCallScheduleType.INCIDENT_COMMANDER)
        ),
        None,
    )

    if engineer:
        engineer.name = "Engineer On-Call"
        engineer.schedule_type = OnCallScheduleType.ENGINEER
    if incident_manager:
        incident_manager.name = "Incident Manager On-Call"
        incident_manager.schedule_type = OnCallScheduleType.INCIDENT_MANAGER
    if change_manager:
        change_manager.name = "Change Manager On-Call"
        change_manager.schedule_type = OnCallScheduleType.CHANGE_MANAGER

    primary_ids = {s.id for s in (engineer, incident_manager, change_manager) if s}
    for schedule in schedules:
        if schedule.id not in primary_ids:
            schedule.is_active = False

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
        (OnCallScheduleType.CHANGE_MANAGER, "Change Manager On-Call", DEMO_USERS[0][1]),
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
