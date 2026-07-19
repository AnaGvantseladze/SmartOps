import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.notifications import NotificationPolicy, NotificationRule, PolicyLevel
from app.models.oncall import OnCallOverride, OnCallSchedule, OnCallShift
from app.schemas.notification_schemas import (
    CurrentOnCallResponse,
    NotificationPolicyResponse,
    NotificationRuleResponse,
    OnCallOverrideResponse,
    OnCallScheduleResponse,
    OnCallShiftResponse,
)
from app.schemas.schemas import UserBrief


def _parse_channels(channels: str) -> list[str]:
    if channels.startswith("["):
        return json.loads(channels)
    return [c.strip() for c in channels.split(",") if c.strip()]


def _rule_to_response(rule: NotificationRule) -> NotificationRuleResponse:
    return NotificationRuleResponse(
        id=rule.id,
        policy_id=rule.policy_id,
        name=rule.name,
        sort_order=rule.sort_order,
        priority_filter=rule.priority_filter,
        tier_filter=rule.tier_filter,
        time_of_day=rule.time_of_day,
        on_call_only=rule.on_call_only,
        event_type=rule.event_type,
        channels=_parse_channels(rule.channels),
        delay_minutes=rule.delay_minutes,
        bundle_minutes=rule.bundle_minutes,
        suppress=rule.suppress,
        is_mandatory=rule.is_mandatory,
    )


def policy_to_response(policy: NotificationPolicy) -> NotificationPolicyResponse:
    return NotificationPolicyResponse(
        id=policy.id,
        name=policy.name,
        level=policy.level,
        team_id=policy.team_id,
        user_id=policy.user_id,
        description=policy.description,
        is_active=policy.is_active,
        team_name=policy.team.name if policy.team else None,
        user_name=policy.user.name if policy.user else None,
        rules=[_rule_to_response(r) for r in policy.rules],
    )


async def get_current_on_call_user(
    session: AsyncSession, schedule: OnCallSchedule, now: datetime | None = None
) -> tuple | None:
    now = now or datetime.now(timezone.utc)

    override = await session.scalar(
        select(OnCallOverride)
        .options(selectinload(OnCallOverride.override_user))
        .where(
            OnCallOverride.schedule_id == schedule.id,
            OnCallOverride.start_time <= now,
            OnCallOverride.end_time > now,
        )
        .order_by(OnCallOverride.start_time.desc())
    )
    if override and override.override_user:
        return override.override_user, override.start_time, override.end_time, True

    shift = await session.scalar(
        select(OnCallShift)
        .options(selectinload(OnCallShift.user))
        .where(
            OnCallShift.schedule_id == schedule.id,
            OnCallShift.start_time <= now,
            OnCallShift.end_time > now,
        )
        .order_by(OnCallShift.start_time.desc())
    )
    if shift and shift.user:
        return shift.user, shift.start_time, shift.end_time, False
    return None


async def schedule_to_response(session: AsyncSession, schedule: OnCallSchedule) -> OnCallScheduleResponse:
    resp = OnCallScheduleResponse.model_validate(schedule)
    resp.team_name = schedule.team.name if schedule.team else None
    resp.service_name = schedule.service.name if schedule.service else None
    resp.shifts = [
        OnCallShiftResponse(
            id=s.id,
            user_id=s.user_id,
            start_time=s.start_time,
            end_time=s.end_time,
            user=UserBrief.model_validate(s.user) if s.user else None,
        )
        for s in schedule.shifts
    ]
    resp.overrides = [
        OnCallOverrideResponse(
            id=o.id,
            schedule_id=o.schedule_id,
            original_user_id=o.original_user_id,
            override_user_id=o.override_user_id,
            start_time=o.start_time,
            end_time=o.end_time,
            reason=o.reason,
            original_user=UserBrief.model_validate(o.original_user) if o.original_user else None,
            override_user=UserBrief.model_validate(o.override_user) if o.override_user else None,
        )
        for o in schedule.overrides
    ]
    current = await get_current_on_call_user(session, schedule)
    if current:
        user, _, _, _ = current
        resp.current_on_call = UserBrief.model_validate(user)
    return resp


async def get_all_current_on_call(session: AsyncSession) -> list[CurrentOnCallResponse]:
    now = datetime.now(timezone.utc)
    schedules = (
        await session.scalars(
            select(OnCallSchedule).where(OnCallSchedule.is_active == True).order_by(OnCallSchedule.name)  # noqa: E712
        )
    ).all()

    results = []
    for schedule in schedules:
        current = await get_current_on_call_user(session, schedule, now)
        if current:
            user, start, end, is_override = current
            results.append(
                CurrentOnCallResponse(
                    schedule_id=schedule.id,
                    schedule_name=schedule.name,
                    schedule_type=schedule.schedule_type,
                    user=UserBrief.model_validate(user),
                    shift_start=start,
                    shift_end=end,
                    is_override=is_override,
                )
            )
    return results


def merge_policies_for_user(
    org_policies: list[NotificationPolicy],
    team_policies: list[NotificationPolicy],
    user_policies: list[NotificationPolicy],
) -> list[NotificationPolicyResponse]:
    """Return policies in hierarchy order: org → team → user."""
    merged = []
    for group in (org_policies, team_policies, user_policies):
        for policy in group:
            if policy.is_active:
                merged.append(policy_to_response(policy))
    return merged
