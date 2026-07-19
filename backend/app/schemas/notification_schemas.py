from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.notifications import (
    NotificationChannel,
    NotificationEventType,
    PolicyLevel,
    TimeOfDay,
)
from app.models.oncall import EscalationTargetType, OnCallScheduleType, RotationFrequency
from app.schemas.schemas import UserBrief


class NotificationRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    policy_id: int
    name: str
    sort_order: int
    priority_filter: Optional[str]
    tier_filter: Optional[str]
    time_of_day: TimeOfDay
    on_call_only: bool
    event_type: NotificationEventType
    channels: list[str]
    delay_minutes: int
    bundle_minutes: Optional[int]
    suppress: bool
    is_mandatory: bool


class NotificationPolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    level: PolicyLevel
    team_id: Optional[int]
    user_id: Optional[int]
    description: Optional[str]
    is_active: bool
    team_name: Optional[str] = None
    user_name: Optional[str] = None
    rules: list[NotificationRuleResponse] = Field(default_factory=list)


class NotificationRuleCreate(BaseModel):
    name: str
    sort_order: int = 0
    priority_filter: Optional[str] = None
    tier_filter: Optional[str] = None
    time_of_day: TimeOfDay = TimeOfDay.ANY
    on_call_only: bool = False
    event_type: NotificationEventType = NotificationEventType.NEW_ALERT
    channels: list[str]
    delay_minutes: int = 0
    bundle_minutes: Optional[int] = None
    suppress: bool = False
    is_mandatory: bool = False


class NotificationPolicyCreate(BaseModel):
    name: str
    level: PolicyLevel
    team_id: Optional[int] = None
    user_id: Optional[int] = None
    description: Optional[str] = None
    rules: list[NotificationRuleCreate] = Field(default_factory=list)


class NotificationLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel: NotificationChannel
    event_type: str
    subject: str
    status: str
    sent_at: datetime


class EffectiveNotificationRule(BaseModel):
    source_level: PolicyLevel
    source_policy: str
    rule: NotificationRuleResponse
    overridden_by_user: bool = False


class OnCallShiftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    start_time: datetime
    end_time: datetime
    user: Optional[UserBrief] = None


class OnCallOverrideResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    schedule_id: int
    original_user_id: int
    override_user_id: int
    start_time: datetime
    end_time: datetime
    reason: Optional[str]
    original_user: Optional[UserBrief] = None
    override_user: Optional[UserBrief] = None


class OnCallScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    schedule_type: OnCallScheduleType
    team_id: Optional[int]
    service_id: Optional[int]
    rotation_frequency: RotationFrequency
    timezone: str
    is_active: bool
    team_name: Optional[str] = None
    service_name: Optional[str] = None
    current_on_call: Optional[UserBrief] = None
    shifts: list[OnCallShiftResponse] = Field(default_factory=list)
    overrides: list[OnCallOverrideResponse] = Field(default_factory=list)


class OnCallOverrideCreate(BaseModel):
    schedule_id: int
    original_user_id: int
    override_user_id: int
    start_time: datetime
    end_time: datetime
    reason: Optional[str] = None


class EscalationLevelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    level_number: int
    timeout_minutes: int
    target_type: EscalationTargetType
    target_id: Optional[int]
    target_label: Optional[str]


class EscalationPolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str]
    is_active: bool
    levels: list[EscalationLevelResponse] = Field(default_factory=list)


class CurrentOnCallResponse(BaseModel):
    schedule_id: int
    schedule_name: str
    schedule_type: OnCallScheduleType
    user: UserBrief
    shift_start: datetime
    shift_end: datetime
    is_override: bool = False
