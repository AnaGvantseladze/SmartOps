import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Team, User
from app.models.notifications import (
    NotificationChannel,
    NotificationEventType,
    NotificationLog,
    NotificationPolicy,
    NotificationRule,
    PolicyLevel,
    TimeOfDay,
)
from app.models.oncall import (
    EscalationPolicy,
    EscalationPolicyLevel,
    EscalationTargetType,
    OnCallSchedule,
    OnCallScheduleType,
    OnCallShift,
    RotationFrequency,
)


async def seed_notifications_and_oncall(session: AsyncSession) -> None:
    existing = await session.scalar(select(func.count()).select_from(NotificationPolicy))
    if existing:
        return

    teams = {t.name: t for t in (await session.scalars(select(Team))).all()}
    users = {u.email: u for u in (await session.scalars(select(User))).all()}
    now = datetime.now(timezone.utc)

    # --- Organization default policy ---
    org_policy = NotificationPolicy(
        name="Organization Defaults",
        level=PolicyLevel.ORGANIZATION,
        description="Baseline notification rules for all users. Mandatory P1 rules cannot be overridden.",
    )
    session.add(org_policy)
    await session.flush()

    org_rules = [
        NotificationRule(
            policy_id=org_policy.id,
            name="P1 alerts — all channels",
            sort_order=1,
            priority_filter="P1",
            event_type=NotificationEventType.NEW_ALERT,
            channels=json.dumps(["push", "sms", "phone", "email", "teams", "in_app"]),
            is_mandatory=True,
        ),
        NotificationRule(
            policy_id=org_policy.id,
            name="P2 alerts — urgent",
            sort_order=2,
            priority_filter="P2",
            event_type=NotificationEventType.NEW_ALERT,
            channels=json.dumps(["push", "sms", "email", "teams", "in_app"]),
        ),
        NotificationRule(
            policy_id=org_policy.id,
            name="P0-P1 incident created",
            sort_order=3,
            priority_filter="P0,P1",
            event_type=NotificationEventType.INCIDENT_UPDATE,
            channels=json.dumps(["push", "sms", "phone", "email", "teams"]),
            is_mandatory=True,
        ),
    ]
    session.add_all(org_rules)

    # --- NOC team policy ---
    noc_team = teams.get("NOC Operations")
    if noc_team:
        noc_policy = NotificationPolicy(
            name="NOC Team Policy",
            level=PolicyLevel.TEAM,
            team_id=noc_team.id,
            description="NOC team receives all P1-P3 alerts with escalating channels.",
        )
        session.add(noc_policy)
        await session.flush()
        session.add_all(
            [
                NotificationRule(
                    policy_id=noc_policy.id,
                    name="P1 — full escalation",
                    sort_order=1,
                    priority_filter="P1",
                    channels=json.dumps(["push", "sms", "phone", "email", "teams"]),
                ),
                NotificationRule(
                    policy_id=noc_policy.id,
                    name="P2 — SMS + Teams",
                    sort_order=2,
                    priority_filter="P2",
                    channels=json.dumps(["push", "sms", "email", "teams"]),
                ),
                NotificationRule(
                    policy_id=noc_policy.id,
                    name="P3 — Teams only",
                    sort_order=3,
                    priority_filter="P3",
                    channels=json.dumps(["push", "teams", "in_app"]),
                ),
                NotificationRule(
                    policy_id=noc_policy.id,
                    name="P4-P5 — in-app only",
                    sort_order=4,
                    priority_filter="P4,P5",
                    channels=json.dumps(["in_app"]),
                    suppress=False,
                ),
            ]
        )

    # --- SRE user policy ---
    sre = users.get("sre@opscore.com")
    if sre:
        user_policy = NotificationPolicy(
            name="My Notification Preferences",
            level=PolicyLevel.USER,
            user_id=sre.id,
            description="Personal overrides — P1 after hours gets phone call.",
        )
        session.add(user_policy)
        await session.flush()
        session.add_all(
            [
                NotificationRule(
                    policy_id=user_policy.id,
                    name="P1 on my services — after hours",
                    sort_order=1,
                    priority_filter="P1",
                    time_of_day=TimeOfDay.AFTER_HOURS,
                    on_call_only=True,
                    channels=json.dumps(["push", "sms", "phone"]),
                ),
                NotificationRule(
                    policy_id=user_policy.id,
                    name="P1 on my services — business hours",
                    sort_order=2,
                    priority_filter="P1",
                    time_of_day=TimeOfDay.BUSINESS_HOURS,
                    channels=json.dumps(["push", "teams"]),
                ),
                NotificationRule(
                    policy_id=user_policy.id,
                    name="P2 on my services",
                    sort_order=3,
                    priority_filter="P2",
                    channels=json.dumps(["push", "teams"]),
                ),
                NotificationRule(
                    policy_id=user_policy.id,
                    name="P3+ — in-app only",
                    sort_order=4,
                    priority_filter="P3,P4,P5",
                    channels=json.dumps(["in_app"]),
                ),
            ]
        )

    # --- On-call schedules ---
    noc_schedule = OnCallSchedule(
        name="NOC 24/7 Coverage",
        schedule_type=OnCallScheduleType.NOC,
        team_id=noc_team.id if noc_team else None,
        rotation_frequency=RotationFrequency.WEEKLY,
        timezone="UTC",
    )
    session.add(noc_schedule)
    await session.flush()

    noc_user = users.get("noc@opscore.com")
    sre_user = users.get("sre@opscore.com")
    if noc_user and sre_user:
        session.add_all(
            [
                OnCallShift(
                    schedule_id=noc_schedule.id,
                    user_id=noc_user.id,
                    start_time=now - timedelta(days=now.weekday()),
                    end_time=now - timedelta(days=now.weekday()) + timedelta(days=7),
                ),
                OnCallShift(
                    schedule_id=noc_schedule.id,
                    user_id=sre_user.id,
                    start_time=now - timedelta(days=now.weekday()) + timedelta(days=7),
                    end_time=now - timedelta(days=now.weekday()) + timedelta(days=14),
                ),
            ]
        )

    trading_team = teams.get("Trading Platform")
    service_owner_schedule = OnCallSchedule(
        name="Trading Platform — Service Owner",
        schedule_type=OnCallScheduleType.SERVICE_OWNER,
        team_id=trading_team.id if trading_team else None,
        rotation_frequency=RotationFrequency.WEEKLY,
        timezone="UTC",
    )
    session.add(service_owner_schedule)
    await session.flush()

    if sre_user:
        session.add(
            OnCallShift(
                schedule_id=service_owner_schedule.id,
                user_id=sre_user.id,
                start_time=now - timedelta(days=3),
                end_time=now + timedelta(days=4),
            )
        )

    commander = users.get("cto@opscore.com")
    commander_schedule = OnCallSchedule(
        name="Incident Commander Rotation",
        schedule_type=OnCallScheduleType.INCIDENT_COMMANDER,
        rotation_frequency=RotationFrequency.WEEKLY,
        timezone="UTC",
    )
    session.add(commander_schedule)
    await session.flush()

    if commander:
        session.add(
            OnCallShift(
                schedule_id=commander_schedule.id,
                user_id=commander.id,
                start_time=now - timedelta(days=now.weekday()),
                end_time=now - timedelta(days=now.weekday()) + timedelta(days=7),
            )
        )

    manager = users.get("sarah@opscore.com")
    manager_schedule = OnCallSchedule(
        name="Incident Manager Rotation",
        schedule_type=OnCallScheduleType.INCIDENT_MANAGER,
        rotation_frequency=RotationFrequency.WEEKLY,
        timezone="UTC",
    )
    session.add(manager_schedule)
    await session.flush()

    if manager:
        session.add(
            OnCallShift(
                schedule_id=manager_schedule.id,
                user_id=manager.id,
                start_time=now - timedelta(days=now.weekday()),
                end_time=now - timedelta(days=now.weekday()) + timedelta(days=7),
            )
        )

    # --- Escalation policy ---
    escalation = EscalationPolicy(
        name="P1 Standard Escalation",
        description="Multi-level escalation for P1 alerts — 5 min timeout per level",
    )
    session.add(escalation)
    await session.flush()

    session.add_all(
        [
            EscalationPolicyLevel(
                policy_id=escalation.id,
                level_number=1,
                timeout_minutes=5,
                target_type=EscalationTargetType.SCHEDULE,
                target_id=noc_schedule.id,
                target_label="NOC + Service Owner On-Call",
            ),
            EscalationPolicyLevel(
                policy_id=escalation.id,
                level_number=2,
                timeout_minutes=5,
                target_type=EscalationTargetType.TEAM,
                target_id=trading_team.id if trading_team else None,
                target_label="Secondary On-Call + Team Lead",
            ),
            EscalationPolicyLevel(
                policy_id=escalation.id,
                level_number=3,
                timeout_minutes=10,
                target_type=EscalationTargetType.USER,
                target_label="Engineering Manager",
            ),
            EscalationPolicyLevel(
                policy_id=escalation.id,
                level_number=4,
                timeout_minutes=10,
                target_type=EscalationTargetType.SCHEDULE,
                target_id=commander_schedule.id,
                target_label="VP Engineering / Incident Commander",
            ),
        ]
    )

    # --- Notification log samples ---
    if noc_user:
        session.add_all(
            [
                NotificationLog(
                    user_id=noc_user.id,
                    channel=NotificationChannel.SMS,
                    event_type="new_alert",
                    subject="P1 | Trading Service — Order timeout",
                    status="delivered",
                    sent_at=now - timedelta(minutes=2),
                ),
                NotificationLog(
                    user_id=noc_user.id,
                    channel=NotificationChannel.TEAMS,
                    event_type="new_alert",
                    subject="P2 | Payment Gateway — High latency",
                    status="delivered",
                    sent_at=now - timedelta(minutes=12),
                ),
                NotificationLog(
                    user_id=noc_user.id,
                    channel=NotificationChannel.PHONE,
                    event_type="escalation",
                    subject="P1 escalation — no acknowledgement in 5 min",
                    status="delivered",
                    sent_at=now - timedelta(hours=1),
                ),
            ]
        )

    await session.commit()
