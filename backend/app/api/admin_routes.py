import csv
import io
import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_user
from app.auth import hash_password
from app.database import get_db
from app.models.audit import AuditLog
from app.models.entities import Team, User, UserRole
from app.permissions import Permission, require_permission
from app.schemas.admin_schemas import (
    AuditLogResponse,
    DashboardConfigResponse,
    DashboardConfigUpdate,
    ExportRequest,
    IntegrationResponse,
    TeamCreateRequest,
    TeamResponse,
    UserAdminResponse,
    UserCreateRequest,
    UserUpdateRequest,
)
from app.services.audit_service import write_audit_log

router = APIRouter(prefix="/admin", tags=["admin"])

# In-memory dashboard config (MVP — would be DB-backed in production)
_dashboard_config = DashboardConfigResponse()

INTEGRATIONS = [
    IntegrationResponse(id="splunk", name="Splunk", type="monitoring", status="connected", description="Alert ingestion via webhook"),
    IntegrationResponse(id="grafana", name="Grafana", type="monitoring", status="connected", description="Alert ingestion and dashboard deep links"),
    IntegrationResponse(id="github", name="GitHub", type="scm", status="connected", description="Alert enrichment — commits, PRs, deploys"),
    IntegrationResponse(id="teams", name="Microsoft Teams", type="collaboration", status="connected", description="War rooms and notifications"),
    IntegrationResponse(id="jira", name="Jira", type="project_mgmt", status="pending", description="Incidents and action items sync"),
    IntegrationResponse(id="azure_ad", name="Azure AD", type="identity", status="connected", description="SSO and SCIM provisioning"),
]


@router.get("/users", response_model=list[UserAdminResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.USERS_MANAGE.value))] = None,
) -> list[UserAdminResponse]:
    result = await db.execute(select(User).options(selectinload(User.team)).order_by(User.name))
    return [UserAdminResponse.model_validate(u) for u in result.scalars().all()]


@router.post("/users", response_model=UserAdminResponse, status_code=201)
async def create_user(
    payload: UserCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.USERS_MANAGE.value))] = None,
) -> UserAdminResponse:
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        team_id=payload.team_id,
    )
    db.add(user)
    await db.flush()
    await write_audit_log(
        db,
        user_id=current_user.id,
        action="user.created",
        resource_type="user",
        resource_id=str(user.id),
        details=f"Created user {user.email} with role {user.role.value}",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(user)
    return UserAdminResponse.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.USERS_MANAGE.value))] = None,
) -> UserAdminResponse:
    user = await db.scalar(select(User).options(selectinload(User.team)).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updates = payload.model_dump(exclude_unset=True)
    if "password" in updates:
        user.password_hash = hash_password(updates.pop("password"))
    for key, value in updates.items():
        setattr(user, key, value)
    await write_audit_log(
        db,
        user_id=current_user.id,
        action="user.updated",
        resource_type="user",
        resource_id=str(user.id),
        details=f"Updated user {user.email}: {list(updates.keys())}",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return UserAdminResponse.model_validate(user)


@router.get("/teams", response_model=list[TeamResponse])
async def list_teams(
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.TEAMS_MANAGE.value))] = None,
) -> list[TeamResponse]:
    teams = (await db.scalars(select(Team).order_by(Team.name))).all()
    responses = []
    for team in teams:
        count = await db.scalar(select(func.count()).select_from(User).where(User.team_id == team.id))
        resp = TeamResponse.model_validate(team)
        resp.member_count = count or 0
        responses.append(resp)
    return responses


@router.post("/teams", response_model=TeamResponse, status_code=201)
async def create_team(
    payload: TeamCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.TEAMS_MANAGE.value))] = None,
) -> TeamResponse:
    team = Team(name=payload.name, description=payload.description)
    db.add(team)
    await db.flush()
    await write_audit_log(
        db,
        user_id=current_user.id,
        action="team.created",
        resource_type="team",
        resource_id=str(team.id),
        details=f"Created team {team.name}",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return TeamResponse.model_validate(team)


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.AUDIT_VIEW.value))] = None,
    limit: int = 100,
) -> list[AuditLogResponse]:
    result = await db.execute(
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    return [AuditLogResponse.model_validate(log) for log in result.scalars().all()]


@router.get("/integrations", response_model=list[IntegrationResponse])
async def list_integrations(
    current_user: Annotated[User, Depends(require_permission(Permission.INTEGRATIONS_MANAGE.value))] = None,
) -> list[IntegrationResponse]:
    return INTEGRATIONS


@router.get("/dashboard-config", response_model=DashboardConfigResponse)
async def get_dashboard_config(
    current_user: Annotated[User, Depends(require_permission(Permission.DASHBOARD_MANAGE.value))] = None,
) -> DashboardConfigResponse:
    return _dashboard_config


@router.patch("/dashboard-config", response_model=DashboardConfigResponse)
async def update_dashboard_config(
    payload: DashboardConfigUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.DASHBOARD_MANAGE.value))] = None,
) -> DashboardConfigResponse:
    global _dashboard_config
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(_dashboard_config, key, value)
    await write_audit_log(
        db,
        user_id=current_user.id,
        action="dashboard.config_updated",
        resource_type="system",
        details=json.dumps(payload.model_dump(exclude_unset=True)),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return _dashboard_config


@router.post("/export")
async def export_data(
    payload: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.EXPORT_DATA.value))] = None,
) -> Response:
    from app.models.entities import Alert, Change, Incident, Service

    resource_map = {
        "alerts": (Alert, ["id", "title", "priority", "status", "source"]),
        "incidents": (Incident, ["id", "title", "severity", "status"]),
        "changes": (Change, ["id", "title", "change_type", "status", "risk"]),
        "services": (Service, ["id", "name", "tier", "health_score"]),
        "audit": (AuditLog, ["id", "action", "resource_type", "resource_id", "created_at"]),
    }
    if payload.resource not in resource_map:
        raise HTTPException(status_code=400, detail="Invalid resource type")

    model, fields = resource_map[payload.resource]
    rows = (await db.scalars(select(model).limit(1000))).all()

    if payload.format == "json":
        data = [{f: getattr(r, f) for f in fields} for r in rows]
        content = json.dumps(data, indent=2, default=str)
        media_type = "application/json"
        filename = f"{payload.resource}.json"
    else:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({f: getattr(row, f) for f in fields})
        content = output.getvalue()
        media_type = "text/csv"
        filename = f"{payload.resource}.csv"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
