from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload, selectinload

from app.api.auth import get_current_user
from app.database import async_session, get_db
from app.models.entities import (
    ActionItem,
    Alert,
    AlertPriority,
    AlertStatus,
    AlertTimelineEntry,
    Change,
    ChangeRisk,
    ChangeStatus,
    DeploymentFreeze,
    Incident,
    IncidentService,
    IncidentSeverity,
    IncidentStatus,
    IncidentTimelineEntry,
    Service,
    ServiceTier,
    User,
)
from app.permissions import Permission, ROLE_ALERT_SCOPE, require_any_permission, require_permission
from app.services.audit_service import write_audit_log
from app.schemas.schemas import (
    AlertCreate,
    AlertNoteCreate,
    AlertResponse,
    AlertUpdate,
    TeamBrief,
    ChangeCreate,
    ChangeResponse,
    ChangeUpdate,
    DashboardStats,
    EngineerResolvedCount,
    FreezeBanner,
    ActionItemCreate,
    IncidentCreate,
    IncidentAlertBrief,
    IncidentResponse,
    IncidentUpdate,
    ServiceCreate,
    ServiceResponse,
)

router = APIRouter()

DashboardPeriod = Literal["day", "week", "month", "year"]
PERIOD_DAYS: dict[DashboardPeriod, int] = {
    "day": 1,
    "week": 7,
    "month": 30,
    "year": 365,
}


def _period_start(period: DashboardPeriod) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=PERIOD_DAYS[period])


def _alert_to_response(
    alert: Alert, *, latest_note: str | None = None, include_timeline: bool = True
) -> AlertResponse:
    response = AlertResponse.model_validate(alert)
    updates: dict = {}
    if alert.service and alert.service.team:
        updates["responsible_team"] = TeamBrief.model_validate(alert.service.team)
    if latest_note is not None:
        updates["latest_note"] = latest_note
    if not include_timeline:
        updates["timeline"] = []
    if updates:
        response = response.model_copy(update=updates)
    return response


async def _latest_notes_by_alert_id(db: AsyncSession, alert_ids: list[int]) -> dict[int, str]:
    if not alert_ids:
        return {}
    result = await db.execute(
        select(AlertTimelineEntry)
        .where(AlertTimelineEntry.alert_id.in_(alert_ids), AlertTimelineEntry.entry_type == "note")
        .order_by(AlertTimelineEntry.created_at.desc())
    )
    notes: dict[int, str] = {}
    for entry in result.scalars().all():
        if entry.alert_id not in notes:
            notes[entry.alert_id] = entry.content
    return notes


async def _source_alerts_for_incident(db: AsyncSession, incident_id: int) -> list[IncidentAlertBrief]:
    result = await db.execute(
        select(Alert).where(Alert.incident_id == incident_id).order_by(Alert.created_at.asc())
    )
    return [IncidentAlertBrief.model_validate(alert) for alert in result.scalars().all()]


async def _incident_to_response(db: AsyncSession, incident: Incident) -> IncidentResponse:
    response = IncidentResponse.model_validate(incident)
    source_alerts = await _source_alerts_for_incident(db, incident.id)
    return response.model_copy(update={"source_alerts": source_alerts})


def _compute_change_risk(service: Optional[Service]) -> tuple[ChangeRisk, int, str]:
    if not service:
        return ChangeRisk.MEDIUM, 50, "No service linked — default risk assessment"
    base = 30 if service.tier == ServiceTier.BUSINESS else 20 if service.tier == ServiceTier.SOFTWARE else 10
    score = max(10, min(95, 100 - service.health_score + base))
    if score >= 75:
        risk = ChangeRisk.HIGH
    elif score >= 50:
        risk = ChangeRisk.MEDIUM
    else:
        risk = ChangeRisk.LOW
    reasoning = (
        f"Affects Tier {service.tier.value} service '{service.name}' "
        f"(health score: {service.health_score}). "
        f"Historical incident patterns inform this assessment."
    )
    return risk, score, reasoning


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    period: DashboardPeriod = Query("week"),
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.DASHBOARD_VIEW.value))] = None,
) -> DashboardStats:
    start = _period_start(period)

    active_alerts = await db.scalar(
        select(func.count())
        .select_from(Alert)
        .where(
            Alert.status.in_([AlertStatus.TRIGGERED, AlertStatus.ACKNOWLEDGED, AlertStatus.SNOOZED]),
            Alert.created_at >= start,
        )
    )

    priority_rows = await db.execute(
        select(Alert.priority, func.count())
        .where(Alert.created_at >= start)
        .group_by(Alert.priority)
    )
    alerts_by_priority = {priority.value: count for priority, count in priority_rows.all()}
    for priority in AlertPriority:
        alerts_by_priority.setdefault(priority.value, 0)

    resolved_rows = await db.execute(
        select(User.id, User.name, func.count())
        .join(Alert, Alert.assignee_id == User.id)
        .where(Alert.status == AlertStatus.RESOLVED, Alert.resolved_at >= start)
        .group_by(User.id, User.name)
        .order_by(func.count().desc())
    )
    alerts_resolved_by_engineer = [
        EngineerResolvedCount(engineer_id=engineer_id, engineer_name=name, count=count)
        for engineer_id, name, count in resolved_rows.all()
    ]

    open_incidents = await db.scalar(
        select(func.count())
        .select_from(Incident)
        .where(Incident.status != IncidentStatus.CLOSED, Incident.created_at >= start)
    )

    severity_rows = await db.execute(
        select(Incident.severity, func.count())
        .where(Incident.status != IncidentStatus.CLOSED, Incident.created_at >= start)
        .group_by(Incident.severity)
    )
    incidents_by_severity = {severity.value: count for severity, count in severity_rows.all()}
    for severity in IncidentSeverity:
        incidents_by_severity.setdefault(severity.value, 0)

    pending_changes = await db.scalar(
        select(func.count())
        .select_from(Change)
        .where(
            Change.status.in_([ChangeStatus.SUBMITTED, ChangeStatus.REVIEWING, ChangeStatus.APPROVED]),
            Change.created_at >= start,
        )
    )
    pending_teams = await db.scalar(
        select(func.count())
        .select_from(Incident)
        .where(Incident.status == IncidentStatus.PENDING_TEAMS, Incident.created_at >= start)
    )

    return DashboardStats(
        period=period,
        active_alerts=active_alerts or 0,
        alerts_by_priority=alerts_by_priority,
        alerts_resolved_by_engineer=alerts_resolved_by_engineer,
        open_incidents=open_incidents or 0,
        incidents_by_severity=incidents_by_severity,
        pending_changes=pending_changes or 0,
        pending_teams=pending_teams or 0,
    )


@router.get("/dashboard/freeze", response_model=FreezeBanner)
async def get_active_freeze(db: AsyncSession = Depends(get_db)) -> FreezeBanner:
    now = datetime.now(timezone.utc)
    freeze = await db.scalar(
        select(DeploymentFreeze)
        .where(DeploymentFreeze.is_active == True, DeploymentFreeze.start_time <= now, DeploymentFreeze.end_time >= now)  # noqa: E712
        .order_by(DeploymentFreeze.start_time.desc())
    )
    if not freeze:
        upcoming = await db.scalar(select(DeploymentFreeze).order_by(DeploymentFreeze.start_time))
        if upcoming and upcoming.start_time > now:
            return FreezeBanner(active=False, title=upcoming.title, reason=upcoming.reason, end_time=upcoming.end_time)
        return FreezeBanner(active=False)
    return FreezeBanner(active=True, title=freeze.title, reason=freeze.reason, end_time=freeze.end_time)


@router.get("/services", response_model=list[ServiceResponse])
async def list_services(
    tier: Optional[ServiceTier] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.SERVICES_VIEW.value))] = None,
) -> list[ServiceResponse]:
    query = select(Service).options(selectinload(Service.team), selectinload(Service.owner))
    if tier:
        query = query.where(Service.tier == tier)
    if search:
        query = query.where(Service.name.ilike(f"%{search}%"))
    query = query.order_by(Service.tier, Service.name)
    result = await db.execute(query)
    services = result.scalars().all()
    if not services:
        return []

    service_ids = [svc.id for svc in services]

    alert_count_rows = await db.execute(
        select(Alert.service_id, func.count())
        .where(Alert.service_id.in_(service_ids), Alert.status != AlertStatus.RESOLVED)
        .group_by(Alert.service_id)
    )
    alert_counts = {service_id: count for service_id, count in alert_count_rows.all()}

    incident_count_rows = await db.execute(
        select(IncidentService.service_id, func.count())
        .join(Incident, Incident.id == IncidentService.incident_id)
        .where(
            IncidentService.service_id.in_(service_ids),
            Incident.status != IncidentStatus.CLOSED,
        )
        .group_by(IncidentService.service_id)
    )
    incident_counts = {service_id: count for service_id, count in incident_count_rows.all()}

    responses = []
    for svc in services:
        data = ServiceResponse.model_validate(svc)
        data.active_alerts = alert_counts.get(svc.id, 0)
        data.open_incidents = incident_counts.get(svc.id, 0)
        responses.append(data)
    return responses


@router.get("/services/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: int, db: AsyncSession = Depends(get_db)) -> ServiceResponse:
    svc = await db.scalar(
        select(Service)
        .options(selectinload(Service.team), selectinload(Service.owner))
        .where(Service.id == service_id)
    )
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return ServiceResponse.model_validate(svc)


@router.post("/services", response_model=ServiceResponse, status_code=201)
async def create_service(
    payload: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.SERVICES_MANAGE.value))] = None,
) -> ServiceResponse:
    svc = Service(**payload.model_dump())
    db.add(svc)
    await db.commit()
    await db.refresh(svc)
    return ServiceResponse.model_validate(svc)


@router.get("/alerts", response_model=list[AlertResponse])
async def list_alerts(
    status: Optional[list[AlertStatus]] = Query(None),
    priority: Optional[list[AlertPriority]] = Query(None),
    service_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.ALERTS_VIEW.value))] = None,
) -> list[AlertResponse]:
    query = (
        select(Alert)
        .options(
            selectinload(Alert.service).selectinload(Service.team),
            selectinload(Alert.assignee),
            noload(Alert.timeline),
        )
        .order_by(Alert.created_at.desc())
    )
    scope = ROLE_ALERT_SCOPE.get(current_user.role, "all")
    if scope == "critical_only":
        query = query.where(Alert.priority.in_([AlertPriority.P1, AlertPriority.P2]))
    elif scope == "my_services":
        service_ids = select(Service.id).where(
            or_(Service.owner_id == current_user.id, Service.team_id == current_user.team_id)
        )
        query = query.where(Alert.service_id.in_(service_ids))
    if status:
        query = query.where(Alert.status.in_(status))
    if priority:
        query = query.where(Alert.priority.in_(priority))
    if service_id:
        query = query.where(Alert.service_id == service_id)
    result = await db.execute(query)
    alerts = result.scalars().all()
    latest_notes = await _latest_notes_by_alert_id(db, [alert.id for alert in alerts])
    return [
        _alert_to_response(alert, latest_note=latest_notes.get(alert.id), include_timeline=False)
        for alert in alerts
    ]


@router.get("/alerts/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: int, db: AsyncSession = Depends(get_db)) -> AlertResponse:
    alert = await db.scalar(
        select(Alert)
        .options(
            selectinload(Alert.service).selectinload(Service.team),
            selectinload(Alert.assignee),
            selectinload(Alert.timeline).selectinload(AlertTimelineEntry.author),
        )
        .where(Alert.id == alert_id)
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _alert_to_response(alert)


@router.post("/alerts", response_model=AlertResponse, status_code=201)
async def create_alert(payload: AlertCreate, db: AsyncSession = Depends(get_db)) -> AlertResponse:
    alert = Alert(**payload.model_dump())
    db.add(alert)
    await db.flush()
    db.add(
        AlertTimelineEntry(
            alert_id=alert.id,
            entry_type="status-change",
            content=f"Alert ingested from {payload.source}",
        )
    )
    await db.commit()
    return await get_alert(alert.id, db)


@router.patch("/alerts/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.ALERTS_MANAGE.value))] = None,
) -> AlertResponse:
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(alert, key, value)

    if payload.status == AlertStatus.RESOLVED:
        alert.resolved_at = datetime.now(timezone.utc)
        if not alert.assignee_id:
            alert.assignee_id = current_user.id
    if payload.status:
        db.add(
            AlertTimelineEntry(
                alert_id=alert.id,
                author_id=current_user.id,
                entry_type="status-change",
                content=f"Status changed to {payload.status.value}",
            )
        )
        await write_audit_log(
            db,
            user_id=current_user.id,
            action="alert.status_changed",
            resource_type="alert",
            resource_id=str(alert.id),
            details=f"Status → {payload.status.value}",
            ip_address=request.client.host if request.client else None,
        )
    await db.commit()
    return await get_alert(alert_id, db)


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.ALERTS_MANAGE.value))] = None,
) -> AlertResponse:
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = AlertStatus.ACKNOWLEDGED
    alert.assignee_id = current_user.id
    db.add(
        AlertTimelineEntry(
            alert_id=alert.id, author_id=current_user.id, entry_type="action", content="Alert acknowledged"
        )
    )
    await db.commit()
    return await get_alert(alert_id, db)


@router.post("/alerts/{alert_id}/notes", response_model=AlertResponse)
async def add_alert_note(
    alert_id: int,
    payload: AlertNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.ALERTS_VIEW.value))] = None,
) -> AlertResponse:
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.add(
        AlertTimelineEntry(
            alert_id=alert.id,
            author_id=current_user.id,
            entry_type="note",
            content=payload.content.strip(),
        )
    )
    await db.commit()
    return await get_alert(alert_id, db)


@router.post("/alerts/{alert_id}/incident", response_model=IncidentResponse, status_code=201)
async def create_incident_from_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INCIDENTS_MANAGE.value))] = None,
) -> IncidentResponse:
    alert = await db.scalar(
        select(Alert)
        .options(selectinload(Alert.service).selectinload(Service.team))
        .where(Alert.id == alert_id)
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.incident_id:
        raise HTTPException(status_code=400, detail="Alert is already linked to an incident")

    try:
        severity = IncidentSeverity(alert.priority.value)
    except ValueError:
        severity = IncidentSeverity.P2

    monitoring_sources = {"splunk", "grafana", "azure monitor", "coralogix"}
    category = "Monitoring" if alert.source.lower() in monitoring_sources else "Application"
    team_id = alert.service.team_id if alert.service else None
    service_ids = [alert.service_id] if alert.service_id else []

    incident = Incident(
        title=alert.title,
        description=alert.description or f"Escalated from alert #{alert.id} via {alert.source}",
        severity=severity,
        category=category,
        business_impact=alert.description or f"{alert.priority.value} alert detected via {alert.source}",
        team_id=team_id,
        commander_id=current_user.id,
        manager_id=current_user.id,
    )
    if severity in (IncidentSeverity.P0, IncidentSeverity.P1):
        incident.war_room_url = "https://teams.microsoft.com/l/channel/auto-war-room"

    db.add(incident)
    await db.flush()

    for service_id in service_ids:
        db.add(IncidentService(incident_id=incident.id, service_id=service_id))

    alert.incident_id = incident.id
    if alert.status == AlertStatus.TRIGGERED:
        alert.status = AlertStatus.ACKNOWLEDGED
        if not alert.assignee_id:
            alert.assignee_id = current_user.id

    db.add(
        IncidentTimelineEntry(
            incident_id=incident.id,
            author_id=current_user.id,
            entry_type="status-change",
            content=(
                f"Incident created from alert #{alert.id} "
                f"({alert.source}, {alert.priority.value})"
            ),
        )
    )
    db.add(
        AlertTimelineEntry(
            alert_id=alert.id,
            author_id=current_user.id,
            entry_type="action",
            content=f"Incident #{incident.id} created from this alert",
        )
    )
    await db.commit()
    return await get_incident(incident.id, db)


@router.get("/incidents", response_model=list[IncidentResponse])
async def list_incidents(
    status: Optional[IncidentStatus] = None,
    severity: Optional[IncidentSeverity] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INCIDENTS_VIEW.value))] = None,
) -> list[IncidentResponse]:
    query = (
        select(Incident)
        .options(
            selectinload(Incident.manager),
            selectinload(Incident.commander),
            selectinload(Incident.services),
            noload(Incident.timeline),
            noload(Incident.action_items),
        )
        .order_by(Incident.created_at.desc())
    )
    if status:
        query = query.where(Incident.status == status)
    if severity:
        query = query.where(Incident.severity == severity)
    result = await db.execute(query)
    return [IncidentResponse.model_validate(i) for i in result.scalars().all()]


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: int, db: AsyncSession = Depends(get_db)) -> IncidentResponse:
    incident = await db.scalar(
        select(Incident)
        .options(
            selectinload(Incident.manager),
            selectinload(Incident.commander),
            selectinload(Incident.services),
            selectinload(Incident.timeline).selectinload(IncidentTimelineEntry.author),
            selectinload(Incident.action_items).selectinload(ActionItem.owner),
        )
        .where(Incident.id == incident_id)
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return await _incident_to_response(db, incident)


@router.post("/incidents", response_model=IncidentResponse, status_code=201)
async def create_incident(
    payload: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INCIDENTS_MANAGE.value))] = None,
) -> IncidentResponse:
    incident = Incident(
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        category=payload.category,
        business_impact=payload.business_impact,
        manager_id=payload.manager_id,
    )
    if payload.severity in (IncidentSeverity.P0, IncidentSeverity.P1):
        incident.war_room_url = "https://teams.microsoft.com/l/channel/auto-war-room"
    db.add(incident)
    await db.flush()

    for service_id in payload.service_ids:
        db.add(IncidentService(incident_id=incident.id, service_id=service_id))

    for alert_id in payload.alert_ids:
        alert = await db.get(Alert, alert_id)
        if alert:
            alert.incident_id = incident.id

    db.add(
        IncidentTimelineEntry(
            incident_id=incident.id,
            entry_type="status-change",
            content=f"Incident created — severity {payload.severity.value}",
        )
    )
    await db.commit()
    return await get_incident(incident.id, db)


@router.patch("/incidents/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INCIDENTS_MANAGE.value))] = None,
) -> IncidentResponse:
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(incident, key, value)

    if payload.status == IncidentStatus.PENDING_TEAMS:
        incident.resolved_at = datetime.now(timezone.utc)
    if payload.status == IncidentStatus.CLOSED:
        incident.closed_at = datetime.now(timezone.utc)
    if payload.status:
        db.add(
            IncidentTimelineEntry(
                incident_id=incident.id,
                entry_type="status-change",
                content=f"Status changed to {payload.status.value}",
            )
        )
    await db.commit()
    return await _incident_to_response(db, incident)


@router.post("/incidents/{incident_id}/action-items", response_model=IncidentResponse, status_code=201)
async def create_incident_action_item(
    incident_id: int,
    payload: ActionItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INCIDENTS_MANAGE.value))] = None,
) -> IncidentResponse:
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    action_item = ActionItem(
        title=payload.title.strip(),
        description=payload.description,
        priority=payload.priority,
        owner_id=payload.owner_id or current_user.id,
        incident_id=incident_id,
        due_date=payload.due_date,
    )
    db.add(action_item)
    db.add(
        IncidentTimelineEntry(
            incident_id=incident_id,
            entry_type="note",
            content=f"Action item added: {payload.title.strip()}",
            author_id=current_user.id,
        )
    )
    await db.commit()
    return await get_incident(incident_id, db)


@router.get("/changes", response_model=list[ChangeResponse])
async def list_changes(
    status: Optional[ChangeStatus] = None,
    change_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.CHANGES_VIEW.value))] = None,
) -> list[ChangeResponse]:
    query = (
        select(Change)
        .options(selectinload(Change.service), selectinload(Change.submitter))
        .order_by(Change.created_at.desc())
    )
    if status:
        query = query.where(Change.status == status)
    result = await db.execute(query)
    return [ChangeResponse.model_validate(c) for c in result.scalars().all()]


@router.get("/changes/{change_id}", response_model=ChangeResponse)
async def get_change(change_id: int, db: AsyncSession = Depends(get_db)) -> ChangeResponse:
    change = await db.scalar(
        select(Change)
        .options(selectinload(Change.service), selectinload(Change.submitter))
        .where(Change.id == change_id)
    )
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    return ChangeResponse.model_validate(change)


@router.post("/changes", response_model=ChangeResponse, status_code=201)
async def create_change(
    payload: ChangeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.CHANGES_SUBMIT.value))] = None,
) -> ChangeResponse:
    service = await db.get(Service, payload.service_id) if payload.service_id else None
    risk, score, reasoning = _compute_change_risk(service)
    change = Change(
        **payload.model_dump(),
        risk=risk,
        risk_score=score,
        risk_reasoning=reasoning,
        submitter_id=current_user.id,
    )
    db.add(change)
    await db.commit()
    return await get_change(change.id, db)


@router.patch("/changes/{change_id}", response_model=ChangeResponse)
async def update_change(
    change_id: int,
    payload: ChangeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_any_permission(
        Permission.CHANGES_APPROVE.value, Permission.CHANGES_MANAGE.value
    ))] = None,
) -> ChangeResponse:
    change = await db.get(Change, change_id)
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(change, key, value)
    await db.commit()
    return await get_change(change_id, db)


class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active:
            self.active.remove(websocket)

    async def broadcast(self, message: dict) -> None:
        for connection in list(self.active):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()


@router.websocket("/ws/alerts")
async def alerts_websocket(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
