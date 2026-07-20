import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _enum_values(enum_cls: type[enum.Enum]) -> list[str]:
    return [member.value for member in enum_cls]


class OnCallScheduleType(str, enum.Enum):
    ENGINEER = "engineer"
    INCIDENT_MANAGER = "incident_manager"
    CHANGE_MANAGER = "change_manager"
    # Legacy values kept for existing databases until migration runs
    SERVICE_OWNER = "service_owner"
    NOC = "noc"
    INCIDENT_COMMANDER = "incident_commander"


class RotationFrequency(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    CUSTOM = "custom"


class EscalationTargetType(str, enum.Enum):
    USER = "user"
    TEAM = "team"
    SCHEDULE = "schedule"


class OnCallSchedule(Base):
    __tablename__ = "on_call_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    schedule_type: Mapped[OnCallScheduleType] = mapped_column(
        Enum(OnCallScheduleType, values_callable=_enum_values),
        nullable=False,
    )
    team_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teams.id"))
    service_id: Mapped[Optional[int]] = mapped_column(ForeignKey("services.id"))
    rotation_frequency: Mapped[RotationFrequency] = mapped_column(
        Enum(RotationFrequency, values_callable=_enum_values), default=RotationFrequency.WEEKLY
    )
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    team: Mapped[Optional["Team"]] = relationship()  # noqa: F821
    service: Mapped[Optional["Service"]] = relationship()  # noqa: F821
    shifts: Mapped[list["OnCallShift"]] = relationship(back_populates="schedule", order_by="OnCallShift.start_time")
    overrides: Mapped[list["OnCallOverride"]] = relationship(back_populates="schedule")


class OnCallShift(Base):
    __tablename__ = "on_call_shifts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("on_call_schedules.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    schedule: Mapped[OnCallSchedule] = relationship(back_populates="shifts")
    user: Mapped["User"] = relationship()  # noqa: F821


class OnCallOverride(Base):
    __tablename__ = "on_call_overrides"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("on_call_schedules.id", ondelete="CASCADE"))
    original_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    override_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    schedule: Mapped[OnCallSchedule] = relationship(back_populates="overrides")
    original_user: Mapped["User"] = relationship(foreign_keys=[original_user_id])  # noqa: F821
    override_user: Mapped["User"] = relationship(foreign_keys=[override_user_id])  # noqa: F821


class EscalationPolicy(Base):
    __tablename__ = "escalation_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    levels: Mapped[list["EscalationPolicyLevel"]] = relationship(
        back_populates="policy", order_by="EscalationPolicyLevel.level_number"
    )


class EscalationPolicyLevel(Base):
    __tablename__ = "escalation_policy_levels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    policy_id: Mapped[int] = mapped_column(ForeignKey("escalation_policies.id", ondelete="CASCADE"))
    level_number: Mapped[int] = mapped_column(Integer, nullable=False)
    timeout_minutes: Mapped[int] = mapped_column(Integer, default=5)
    target_type: Mapped[EscalationTargetType] = mapped_column(
        Enum(EscalationTargetType, values_callable=_enum_values), nullable=False
    )
    target_id: Mapped[Optional[int]] = mapped_column(Integer)
    target_label: Mapped[Optional[str]] = mapped_column(String(200))

    policy: Mapped[EscalationPolicy] = relationship(back_populates="levels")
