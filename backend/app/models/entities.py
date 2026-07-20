import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "administrator"
    ENGINEER = "engineer"
    MANAGER = "manager"
    CHANGE_MANAGER = "change_manager"


class ServiceTier(int, enum.Enum):
    BUSINESS = 1
    SOFTWARE = 2
    MICROSERVICE = 3


class AlertPriority(str, enum.Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"
    P5 = "P5"


class AlertStatus(str, enum.Enum):
    TRIGGERED = "triggered"
    ACKNOWLEDGED = "acknowledged"
    SNOOZED = "snoozed"
    RESOLVED = "resolved"


class IncidentSeverity(str, enum.Enum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"
    P5 = "P5"


class IncidentStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING_TEAMS = "pending_teams"
    CLOSED = "closed"


class ChangeType(str, enum.Enum):
    STANDARD = "standard"
    NORMAL = "normal"
    EMERGENCY = "emergency"
    CUSTOM = "custom"


class ChangeRisk(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ChangeStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ROLLED_BACK = "rolled_back"
    FAILED = "failed"
    REJECTED = "rejected"


class ActionItemStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    VERIFIED = "verified"


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    members: Mapped[list["User"]] = relationship(back_populates="team")
    services: Mapped[list["Service"]] = relationship(back_populates="team")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.ENGINEER)
    team_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teams.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team: Mapped[Optional[Team]] = relationship(back_populates="members")
    owned_services: Mapped[list["Service"]] = relationship(back_populates="owner")


class ServiceDependency(Base):
    __tablename__ = "service_dependencies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    upstream_service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"))
    downstream_service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"))


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    tier: Mapped[ServiceTier] = mapped_column(Enum(ServiceTier), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    team_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teams.id"))
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    github_repo: Mapped[Optional[str]] = mapped_column(String(255))
    confluence_runbook_url: Mapped[Optional[str]] = mapped_column(String(500))
    monitoring_dashboard_url: Mapped[Optional[str]] = mapped_column(String(500))
    dependency_threshold: Mapped[int] = mapped_column(Integer, default=30)
    health_score: Mapped[int] = mapped_column(Integer, default=100)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team: Mapped[Optional[Team]] = relationship(back_populates="services")
    owner: Mapped[Optional[User]] = relationship(back_populates="owned_services")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="service")
    changes: Mapped[list["Change"]] = relationship(back_populates="service")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    priority: Mapped[AlertPriority] = mapped_column(Enum(AlertPriority), nullable=False)
    status: Mapped[AlertStatus] = mapped_column(Enum(AlertStatus), default=AlertStatus.TRIGGERED)
    source: Mapped[str] = mapped_column(String(100), default="manual")
    service_id: Mapped[Optional[int]] = mapped_column(ForeignKey("services.id"))
    assignee_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    occurrence_count: Mapped[int] = mapped_column(Integer, default=1)
    snooze_reason: Mapped[Optional[str]] = mapped_column(Text)
    snoozed_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    resolution_summary: Mapped[Optional[str]] = mapped_column(Text)
    root_cause: Mapped[Optional[str]] = mapped_column(String(200))
    enrichment_data: Mapped[Optional[str]] = mapped_column(Text)
    incident_id: Mapped[Optional[int]] = mapped_column(ForeignKey("incidents.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    service: Mapped[Optional[Service]] = relationship(back_populates="alerts")
    assignee: Mapped[Optional[User]] = relationship(foreign_keys=[assignee_id])
    timeline: Mapped[list["AlertTimelineEntry"]] = relationship(back_populates="alert")


class AlertTimelineEntry(Base):
    __tablename__ = "alert_timeline_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id", ondelete="CASCADE"))
    author_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    entry_type: Mapped[str] = mapped_column(String(50), default="note")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    alert: Mapped[Alert] = relationship(back_populates="timeline")
    author: Mapped[Optional[User]] = relationship()


class IncidentService(Base):
    __tablename__ = "incident_services"

    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"), primary_key=True)


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    severity: Mapped[IncidentSeverity] = mapped_column(Enum(IncidentSeverity), nullable=False)
    status: Mapped[IncidentStatus] = mapped_column(Enum(IncidentStatus), default=IncidentStatus.OPEN)
    category: Mapped[Optional[str]] = mapped_column(String(100))
    business_impact: Mapped[Optional[str]] = mapped_column(Text)
    resolution_summary: Mapped[Optional[str]] = mapped_column(Text)
    root_cause: Mapped[Optional[str]] = mapped_column(String(200))
    manager_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    commander_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    team_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teams.id"))
    war_room_url: Mapped[Optional[str]] = mapped_column(String(500))
    pir_due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    manager: Mapped[Optional[User]] = relationship(foreign_keys=[manager_id])
    commander: Mapped[Optional[User]] = relationship(foreign_keys=[commander_id])
    team: Mapped[Optional[Team]] = relationship()
    services: Mapped[list[Service]] = relationship(secondary="incident_services")
    timeline: Mapped[list["IncidentTimelineEntry"]] = relationship(back_populates="incident")
    action_items: Mapped[list["ActionItem"]] = relationship(back_populates="incident")


class IncidentTimelineEntry(Base):
    __tablename__ = "incident_timeline_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"))
    author_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    entry_type: Mapped[str] = mapped_column(String(50), default="note")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    incident: Mapped[Incident] = relationship(back_populates="timeline")
    author: Mapped[Optional[User]] = relationship()


class ActionItem(Base):
    __tablename__ = "action_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[ActionItemStatus] = mapped_column(Enum(ActionItemStatus), default=ActionItemStatus.OPEN)
    priority: Mapped[AlertPriority] = mapped_column(Enum(AlertPriority), default=AlertPriority.P3)
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    incident_id: Mapped[Optional[int]] = mapped_column(ForeignKey("incidents.id"))
    service_id: Mapped[Optional[int]] = mapped_column(ForeignKey("services.id"))
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    owner: Mapped[Optional[User]] = relationship()
    incident: Mapped[Optional[Incident]] = relationship(back_populates="action_items")


class Change(Base):
    __tablename__ = "changes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    change_type: Mapped[ChangeType] = mapped_column(Enum(ChangeType), nullable=False)
    risk: Mapped[ChangeRisk] = mapped_column(Enum(ChangeRisk), default=ChangeRisk.MEDIUM)
    risk_score: Mapped[int] = mapped_column(Integer, default=50)
    risk_reasoning: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[ChangeStatus] = mapped_column(Enum(ChangeStatus), default=ChangeStatus.SUBMITTED)
    service_id: Mapped[Optional[int]] = mapped_column(ForeignKey("services.id"))
    submitter_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    implementation_plan: Mapped[Optional[str]] = mapped_column(Text)
    rollback_plan: Mapped[Optional[str]] = mapped_column(Text)
    potential_business_impact: Mapped[Optional[str]] = mapped_column(Text)
    affected_scope: Mapped[Optional[str]] = mapped_column(Text)
    expected_downtime: Mapped[Optional[str]] = mapped_column(String(120))
    scheduled_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    scheduled_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    service: Mapped[Optional[Service]] = relationship(back_populates="changes")
    submitter: Mapped[Optional[User]] = relationship()


class MaintenanceWindow(Base):
    __tablename__ = "maintenance_windows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DeploymentFreeze(Base):
    __tablename__ = "deployment_freezes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WebhookIntegration(Base):
    __tablename__ = "webhook_integrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    webhook_secret: Mapped[Optional[str]] = mapped_column(String(255))
    webhook_url: Mapped[str] = mapped_column(String(500), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_alert_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    alert_count: Mapped[int] = mapped_column(Integer, default=0)
