from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.entities import UserRole
from app.schemas.schemas import TeamBrief, UserBrief


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str]
    member_count: int = 0


class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: UserRole
    team_id: Optional[int]
    is_active: bool
    team: Optional[TeamBrief] = None


class UserCreateRequest(BaseModel):
    name: str
    email: str
    password: str
    role: UserRole
    team_id: Optional[int] = None


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    team_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class TeamCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    resource_type: str
    resource_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    user: Optional[UserBrief] = None


class IntegrationResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    description: str


class DashboardConfigResponse(BaseModel):
    refresh_interval_seconds: int = 30
    default_date_range_days: int = 7
    tv_rotation_seconds: int = 15
    show_tier1_only: bool = False
    executive_summary_enabled: bool = True


class DashboardConfigUpdate(BaseModel):
    refresh_interval_seconds: Optional[int] = None
    default_date_range_days: Optional[int] = None
    tv_rotation_seconds: Optional[int] = None
    show_tier1_only: Optional[bool] = None
    executive_summary_enabled: Optional[bool] = None


class ExportRequest(BaseModel):
    resource: str = Field(description="alerts, incidents, changes, services, audit")
    format: str = Field(default="csv", description="csv or json")
