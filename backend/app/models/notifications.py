import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PolicyLevel(str, enum.Enum):
    ORGANIZATION = "organization"
    TEAM = "team"
    USER = "user"


class NotificationChannel(str, enum.Enum):
    PUSH = "push"
    SMS = "sms"
    PHONE = "phone"
    EMAIL = "email"
    TEAMS = "teams"
    IN_APP = "in_app"


class NotificationEventType(str, enum.Enum):
    NEW_ALERT = "new_alert"
    ESCALATION = "escalation"
    INCIDENT_UPDATE = "incident_update"
    PIR_REMINDER = "pir_reminder"
    CHANGE_APPROVAL = "change_approval"


class TimeOfDay(str, enum.Enum):
    ANY = "any"
    BUSINESS_HOURS = "business_hours"
    AFTER_HOURS = "after_hours"
    WEEKENDS = "weekends"


class NotificationPolicy(Base):
    __tablename__ = "notification_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    level: Mapped[PolicyLevel] = mapped_column(Enum(PolicyLevel), nullable=False)
    team_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teams.id"))
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team: Mapped[Optional["Team"]] = relationship()  # noqa: F821
    user: Mapped[Optional["User"]] = relationship()  # noqa: F821
    rules: Mapped[list["NotificationRule"]] = relationship(back_populates="policy", order_by="NotificationRule.sort_order")


class NotificationRule(Base):
    __tablename__ = "notification_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    policy_id: Mapped[int] = mapped_column(ForeignKey("notification_policies.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    priority_filter: Mapped[Optional[str]] = mapped_column(String(100))
    tier_filter: Mapped[Optional[str]] = mapped_column(String(50))
    time_of_day: Mapped[TimeOfDay] = mapped_column(Enum(TimeOfDay), default=TimeOfDay.ANY)
    on_call_only: Mapped[bool] = mapped_column(Boolean, default=False)
    event_type: Mapped[NotificationEventType] = mapped_column(
        Enum(NotificationEventType), default=NotificationEventType.NEW_ALERT
    )
    channels: Mapped[str] = mapped_column(String(200), nullable=False)
    delay_minutes: Mapped[int] = mapped_column(Integer, default=0)
    bundle_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    suppress: Mapped[bool] = mapped_column(Boolean, default=False)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    policy: Mapped[NotificationPolicy] = relationship(back_populates="rules")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel))
    event_type: Mapped[str] = mapped_column(String(100))
    subject: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(50), default="delivered")
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship()  # noqa: F821
