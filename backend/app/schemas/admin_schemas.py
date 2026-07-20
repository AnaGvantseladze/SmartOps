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


class IntegrationUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None


class DashboardConfigResponse(BaseModel):
    refresh_interval_seconds: int = 30
    default_date_range_days: int = 7
    tv_rotation_seconds: int = 15
    show_tier1_only: bool = False
    executive_summary_enabled: bool = True
    shared_with_organization: bool = False


class DashboardConfigUpdate(BaseModel):
    refresh_interval_seconds: Optional[int] = None
    default_date_range_days: Optional[int] = None
    tv_rotation_seconds: Optional[int] = None
    show_tier1_only: Optional[bool] = None
    executive_summary_enabled: Optional[bool] = None
    shared_with_organization: Optional[bool] = None


class ExportRequest(BaseModel):
    resource: str = Field(description="alerts, incidents, changes, services, audit")
    format: str = Field(default="csv", description="csv or json")


class AlertRuleConfig(BaseModel):
    id: str
    name: str
    source: str
    condition: str
    priority: str
    enabled: bool = True


class SeverityLevelConfig(BaseModel):
    code: str
    label: str
    description: str
    enabled: bool = True


class CategoryConfig(BaseModel):
    id: str
    name: str
    description: str
    enabled: bool = True


class NotificationChannelConfig(BaseModel):
    id: str
    name: str
    enabled: bool = True
    config: dict = Field(default_factory=dict)


class AuthConfigResponse(BaseModel):
    sso_enabled: bool = False
    sso_provider: str = "azure_ad"
    ldap_enabled: bool = False
    ldap_host: str = ""
    ldap_base_dn: str = ""
    session_timeout_minutes: int = 480
    mfa_required: bool = False


class AuthConfigUpdate(BaseModel):
    sso_enabled: Optional[bool] = None
    sso_provider: Optional[str] = None
    ldap_enabled: Optional[bool] = None
    ldap_host: Optional[str] = None
    ldap_base_dn: Optional[str] = None
    session_timeout_minutes: Optional[int] = None
    mfa_required: Optional[bool] = None


class PlatformConfigResponse(BaseModel):
    alert_rules: list[AlertRuleConfig]
    severity_levels: list[SeverityLevelConfig]
    categories: list[CategoryConfig]
    notification_channels: list[NotificationChannelConfig]
    auth_config: AuthConfigResponse
    last_backup_at: Optional[str] = None


class AlertRulesUpdate(BaseModel):
    rules: list[AlertRuleConfig]


class SeverityLevelsUpdate(BaseModel):
    levels: list[SeverityLevelConfig]


class CategoriesUpdate(BaseModel):
    categories: list[CategoryConfig]


class NotificationChannelsUpdate(BaseModel):
    channels: list[NotificationChannelConfig]


class RolePermissionMatrix(BaseModel):
    role: str
    role_label: str
    permissions: list[str]


class BackupResponse(BaseModel):
    backed_up_at: str
    snapshot: dict


class RestoreRequest(BaseModel):
    snapshot: dict
