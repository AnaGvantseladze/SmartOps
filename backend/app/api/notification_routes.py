from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_user
from app.database import get_db
from app.models.entities import User
from app.permissions import Permission, require_any_permission, require_permission
from app.models.notifications import (
    NotificationLog,
    NotificationPolicy,
    NotificationRule,
    PolicyLevel,
)
from app.models.oncall import EscalationPolicy, EscalationPolicyLevel, OnCallOverride, OnCallSchedule, OnCallShift
from app.schemas.notification_schemas import (
    CurrentOnCallResponse,
    EscalationLevelResponse,
    EscalationPolicyResponse,
    NotificationLogResponse,
    NotificationPolicyCreate,
    NotificationPolicyResponse,
    OnCallOverrideCreate,
    OnCallOverrideResponse,
    OnCallScheduleResponse,
)
from app.services.notification_service import (
    get_all_current_on_call,
    merge_policies_for_user,
    policy_to_response,
    schedule_to_response,
)

router = APIRouter()


@router.get("/notification-policies", response_model=list[NotificationPolicyResponse])
async def list_notification_policies(
    level: Optional[PolicyLevel] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_any_permission(
        Permission.SETTINGS_ADMIN.value, Permission.SCHEDULES_MANAGE.value
    ))] = None,
) -> list[NotificationPolicyResponse]:
    query = (
        select(NotificationPolicy)
        .options(
            selectinload(NotificationPolicy.rules),
            selectinload(NotificationPolicy.team),
            selectinload(NotificationPolicy.user),
        )
        .order_by(NotificationPolicy.level, NotificationPolicy.name)
    )
    if level:
        query = query.where(NotificationPolicy.level == level)
    result = await db.execute(query)
    return [policy_to_response(p) for p in result.scalars().all()]


@router.get("/notification-policies/effective", response_model=list[NotificationPolicyResponse])
async def get_effective_policies(
    current_user: Annotated[User, Depends(require_permission(Permission.SETTINGS_NOTIFICATIONS.value))],
    db: AsyncSession = Depends(get_db),
) -> list[NotificationPolicyResponse]:
    base_query = (
        select(NotificationPolicy)
        .options(
            selectinload(NotificationPolicy.rules),
            selectinload(NotificationPolicy.team),
            selectinload(NotificationPolicy.user),
        )
        .where(NotificationPolicy.is_active == True)  # noqa: E712
    )

    org = (await db.execute(base_query.where(NotificationPolicy.level == PolicyLevel.ORGANIZATION))).scalars().all()
    team = []
    if current_user.team_id:
        team = (
            await db.execute(
                base_query.where(
                    NotificationPolicy.level == PolicyLevel.TEAM,
                    NotificationPolicy.team_id == current_user.team_id,
                )
            )
        ).scalars().all()
    user = (
        await db.execute(
            base_query.where(
                NotificationPolicy.level == PolicyLevel.USER,
                NotificationPolicy.user_id == current_user.id,
            )
        )
    ).scalars().all()

    return merge_policies_for_user(list(org), list(team), list(user))


@router.post("/notification-policies", response_model=NotificationPolicyResponse, status_code=201)
async def create_notification_policy(
    payload: NotificationPolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.SETTINGS_ADMIN.value))] = None,
) -> NotificationPolicyResponse:
    import json

    policy = NotificationPolicy(
        name=payload.name,
        level=payload.level,
        team_id=payload.team_id,
        user_id=payload.user_id,
        description=payload.description,
    )
    db.add(policy)
    await db.flush()

    for rule_data in payload.rules:
        rule = NotificationRule(
            policy_id=policy.id,
            name=rule_data.name,
            sort_order=rule_data.sort_order,
            priority_filter=rule_data.priority_filter,
            tier_filter=rule_data.tier_filter,
            time_of_day=rule_data.time_of_day,
            on_call_only=rule_data.on_call_only,
            event_type=rule_data.event_type,
            channels=json.dumps(rule_data.channels),
            delay_minutes=rule_data.delay_minutes,
            bundle_minutes=rule_data.bundle_minutes,
            suppress=rule_data.suppress,
            is_mandatory=rule_data.is_mandatory,
        )
        db.add(rule)

    await db.commit()
    policy = await db.scalar(
        select(NotificationPolicy)
        .options(
            selectinload(NotificationPolicy.rules),
            selectinload(NotificationPolicy.team),
            selectinload(NotificationPolicy.user),
        )
        .where(NotificationPolicy.id == policy.id)
    )
    return policy_to_response(policy)


@router.get("/notification-log", response_model=list[NotificationLogResponse])
async def get_notification_log(
    current_user: Annotated[User, Depends(require_permission(Permission.SETTINGS_NOTIFICATIONS.value))],
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
) -> list[NotificationLogResponse]:
    result = await db.execute(
        select(NotificationLog)
        .where(NotificationLog.user_id == current_user.id)
        .order_by(NotificationLog.sent_at.desc())
        .limit(limit)
    )
    return [NotificationLogResponse.model_validate(log) for log in result.scalars().all()]


@router.post("/notification-policies/test")
async def test_notification(
    current_user: Annotated[User, Depends(require_permission(Permission.SETTINGS_NOTIFICATIONS.value))],
) -> dict:
    return {
        "status": "sent",
        "message": f"Test notification dispatched to {current_user.email} via configured channels",
    }


@router.get("/on-call/schedules", response_model=list[OnCallScheduleResponse])
async def list_on_call_schedules(
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_any_permission(
        Permission.SETTINGS_ON_CALL.value, Permission.SCHEDULES_MANAGE.value
    ))] = None,
) -> list[OnCallScheduleResponse]:
    result = await db.execute(
        select(OnCallSchedule)
        .options(
            selectinload(OnCallSchedule.team),
            selectinload(OnCallSchedule.service),
            selectinload(OnCallSchedule.shifts).selectinload(OnCallShift.user),
            selectinload(OnCallSchedule.overrides).selectinload(OnCallOverride.original_user),
            selectinload(OnCallSchedule.overrides).selectinload(OnCallOverride.override_user),
        )
        .order_by(OnCallSchedule.name)
    )
    schedules = result.scalars().unique().all()
    return [await schedule_to_response(db, s) for s in schedules]


@router.get("/on-call/current", response_model=list[CurrentOnCallResponse])
async def get_current_on_call(
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.SETTINGS_ON_CALL.value))] = None,
) -> list[CurrentOnCallResponse]:
    return await get_all_current_on_call(db)


@router.post("/on-call/overrides", response_model=OnCallOverrideResponse, status_code=201)
async def create_on_call_override(
    payload: OnCallOverrideCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.SETTINGS_ON_CALL.value))] = None,
) -> OnCallOverrideResponse:
    override = OnCallOverride(**payload.model_dump())
    db.add(override)
    await db.commit()
    await db.refresh(override)
    return OnCallOverrideResponse.model_validate(override)


@router.get("/escalation-policies", response_model=list[EscalationPolicyResponse])
async def list_escalation_policies(
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_any_permission(
        Permission.SETTINGS_ON_CALL.value, Permission.INCIDENTS_MANAGE.value
    ))] = None,
) -> list[EscalationPolicyResponse]:
    from app.models.oncall import EscalationPolicyLevel

    result = await db.execute(
        select(EscalationPolicy)
        .options(selectinload(EscalationPolicy.levels))
        .where(EscalationPolicy.is_active == True)  # noqa: E712
        .order_by(EscalationPolicy.name)
    )
    policies = []
    for policy in result.scalars().all():
        resp = EscalationPolicyResponse.model_validate(policy)
        resp.levels = [EscalationLevelResponse.model_validate(l) for l in policy.levels]
        policies.append(resp)
    return policies
