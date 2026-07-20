from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.entities import (
    ActionItemStatus,
    AlertPriority,
    AlertStatus,
    ChangeRisk,
    ChangeStatus,
    ChangeType,
    IncidentSeverity,
    IncidentStatus,
    ServiceTier,
    UserRole,
)


class TeamBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: UserRole


class UserProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: UserRole
    team_id: Optional[int] = None
    team: Optional[TeamBrief] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
    landing_page: str
    permissions: list[str] = Field(default_factory=list)
    nav_items: list[str] = Field(default_factory=list)
    alert_scope: str = "all"


class RoleConfigResponse(BaseModel):
    role: str
    role_label: str
    permissions: list[str]
    landing_page: str
    nav_items: list[str]
    alert_scope: str


class SessionResponse(BaseModel):
    user: UserProfile
    role: str
    role_label: str
    permissions: list[str]
    landing_page: str
    nav_items: list[str]
    alert_scope: str


class ServiceBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    tier: ServiceTier
    health_score: int


class ServiceCreate(BaseModel):
    name: str
    tier: ServiceTier
    description: Optional[str] = None
    team_id: Optional[int] = None
    owner_id: Optional[int] = None
    github_repo: Optional[str] = None
    confluence_runbook_url: Optional[str] = None
    monitoring_dashboard_url: Optional[str] = None
    dependency_threshold: int = 30


class ServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    tier: ServiceTier
    description: Optional[str]
    team_id: Optional[int]
    owner_id: Optional[int]
    github_repo: Optional[str]
    confluence_runbook_url: Optional[str]
    monitoring_dashboard_url: Optional[str]
    dependency_threshold: int
    health_score: int
    created_at: datetime
    team: Optional[TeamBrief] = None
    owner: Optional[UserBrief] = None
    active_alerts: int = 0
    open_incidents: int = 0


class AlertCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: AlertPriority
    source: str = "manual"
    service_id: Optional[int] = None


class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    assignee_id: Optional[int] = None
    snooze_reason: Optional[str] = None
    snoozed_until: Optional[datetime] = None
    resolution_summary: Optional[str] = None
    root_cause: Optional[str] = None


class AlertNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class AlertTimelineEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entry_type: str
    content: str
    created_at: datetime
    author: Optional[UserBrief] = None


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    priority: AlertPriority
    status: AlertStatus
    source: str
    service_id: Optional[int]
    assignee_id: Optional[int]
    occurrence_count: int
    snooze_reason: Optional[str]
    snoozed_until: Optional[datetime]
    resolution_summary: Optional[str]
    root_cause: Optional[str]
    incident_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    service: Optional[ServiceBrief] = None
    assignee: Optional[UserBrief] = None
    responsible_team: Optional[TeamBrief] = None
    latest_note: Optional[str] = None
    timeline: list[AlertTimelineEntryResponse] = Field(default_factory=list)


class IncidentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    severity: IncidentSeverity
    category: Optional[str] = None
    business_impact: Optional[str] = None
    service_ids: list[int] = Field(default_factory=list)
    manager_id: Optional[int] = None
    alert_ids: list[int] = Field(default_factory=list)


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None
    category: Optional[str] = None
    business_impact: Optional[str] = None
    resolution_summary: Optional[str] = None
    root_cause: Optional[str] = None
    manager_id: Optional[int] = None
    commander_id: Optional[int] = None


class IncidentTimelineEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entry_type: str
    content: str
    created_at: datetime
    author: Optional[UserBrief] = None


class ActionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    status: ActionItemStatus
    priority: AlertPriority
    owner_id: Optional[int]
    due_date: Optional[datetime]
    created_at: datetime
    owner: Optional[UserBrief] = None


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    severity: IncidentSeverity
    status: IncidentStatus
    category: Optional[str]
    business_impact: Optional[str]
    resolution_summary: Optional[str]
    root_cause: Optional[str]
    manager_id: Optional[int]
    commander_id: Optional[int]
    war_room_url: Optional[str]
    pir_due_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    manager: Optional[UserBrief] = None
    commander: Optional[UserBrief] = None
    services: list[ServiceBrief] = Field(default_factory=list)
    timeline: list[IncidentTimelineEntryResponse] = Field(default_factory=list)
    action_items: list[ActionItemResponse] = Field(default_factory=list)


class ChangeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    change_type: ChangeType
    service_id: Optional[int] = None
    implementation_plan: Optional[str] = None
    rollback_plan: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None


class ChangeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ChangeStatus] = None
    risk: Optional[ChangeRisk] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None


class ChangeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    change_type: ChangeType
    risk: ChangeRisk
    risk_score: int
    risk_reasoning: Optional[str]
    status: ChangeStatus
    service_id: Optional[int]
    submitter_id: Optional[int]
    implementation_plan: Optional[str]
    rollback_plan: Optional[str]
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    service: Optional[ServiceBrief] = None
    submitter: Optional[UserBrief] = None


class EngineerResolvedCount(BaseModel):
    engineer_id: int
    engineer_name: str
    count: int


class DashboardStats(BaseModel):
    period: str
    active_alerts: int
    alerts_by_priority: dict[str, int]
    alerts_resolved_by_engineer: list[EngineerResolvedCount] = Field(default_factory=list)
    open_incidents: int
    incidents_by_severity: dict[str, int]
    pending_changes: int
    pending_teams: int


class AISuggestion(BaseModel):
    id: str
    type: str
    title: str
    description: str
    confidence: int
    reasoning: str


class FreezeBanner(BaseModel):
    active: bool
    title: Optional[str] = None
    reason: Optional[str] = None
    end_time: Optional[datetime] = None
