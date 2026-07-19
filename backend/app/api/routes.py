from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_user
from app.database import async_session, get_db
from app.models.entities import (
    ActionItem,
    ActionItemStatus,
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
    AISuggestion,
    AlertCreate,
    AlertResponse,
    AlertUpdate,
    ChangeCreate,
    ChangeResponse,
    ChangeUpdate,
    DashboardStats,
    FreezeBanner,
    IncidentCreate,
    IncidentResponse,
    IncidentUpdate,
    ServiceCreate,
    ServiceResponse,
)

router = APIRouter()


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
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.DASHBOARD_VIEW.value))] = None,
) -> DashboardStats:
    active_alerts = await db.scalar(
        select(func.count()).select_from(Alert).where(
            Alert.status.in_([AlertStatus.TRIGGERED, AlertStatus.ACKNOWLEDGED, AlertStatus.SNOOZED])
        )
    )
    alerts_by_priority: dict[str, int] = {}
    for priority in AlertPriority:
        count = await db.scalar(
            select(func.count())
            .select_from(Alert)
            .where(Alert.priority == priority, Alert.status != AlertStatus.RESOLVED)
        )
        alerts_by_priority[priority.value] = count or 0

    open_incidents = await db.scalar(
        select(func.count()).select_from(Incident).where(Incident.status != IncidentStatus.CLOSED)
    )
    incidents_by_severity: dict[str, int] = {}
    for severity in IncidentSeverity:
        count = await db.scalar(
            select(func.count())
            .select_from(Incident)
            .where(Incident.severity == severity, Incident.status != IncidentStatus.CLOSED)
        )
        incidents_by_severity[severity.value] = count or 0

    pending_changes = await db.scalar(
        select(func.count())
        .select_from(Change)
        .where(Change.status.in_([ChangeStatus.SUBMITTED, ChangeStatus.REVIEWING, ChangeStatus.APPROVED]))
    )
    pir_pending = await db.scalar(
        select(func.count()).select_from(Incident).where(Incident.status == IncidentStatus.PIR_PENDING)
    )
    action_items_open = await db.scalar(
        select(func.count())
        .select_from(ActionItem)
        .where(ActionItem.status.in_([ActionItemStatus.OPEN, ActionItemStatus.IN_PROGRESS]))
    )
    tier1_avg = await db.scalar(
        select(func.avg(Service.health_score)).where(Service.tier == ServiceTier.BUSINESS)
    )

    return DashboardStats(
        active_alerts=active_alerts or 0,
        alerts_by_priority=alerts_by_priority,
        open_incidents=open_incidents or 0,
        incidents_by_severity=incidents_by_severity,
        pending_changes=pending_changes or 0,
        pir_pending=pir_pending or 0,
        action_items_open=action_items_open or 0,
        tier1_health_avg=round(float(tier1_avg or 0), 1),
        recent_mttr_hours=4.2,
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

    responses = []
    for svc in services:
        active_alerts = await db.scalar(
            select(func.count())
            .select_from(Alert)
            .where(Alert.service_id == svc.id, Alert.status != AlertStatus.RESOLVED)
        )
        open_incidents = await db.scalar(
            select(func.count())
            .select_from(Incident)
            .join(IncidentService)
            .where(IncidentService.service_id == svc.id, Incident.status != IncidentStatus.CLOSED)
        )
        data = ServiceResponse.model_validate(svc)
        data.active_alerts = active_alerts or 0
        data.open_incidents = open_incidents or 0
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
    status: Optional[AlertStatus] = None,
    priority: Optional[AlertPriority] = None,
    service_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.ALERTS_VIEW.value))] = None,
) -> list[AlertResponse]:
    query = (
        select(Alert)
        .options(
            selectinload(Alert.service),
            selectinload(Alert.assignee),
            selectinload(Alert.timeline).selectinload(AlertTimelineEntry.author),
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
        query = query.where(Alert.status == status)
    if priority:
        query = query.where(Alert.priority == priority)
    if service_id:
        query = query.where(Alert.service_id == service_id)
    result = await db.execute(query)
    return [AlertResponse.model_validate(a) for a in result.scalars().all()]


@router.get("/alerts/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: int, db: AsyncSession = Depends(get_db)) -> AlertResponse:
    alert = await db.scalar(
        select(Alert)
        .options(
            selectinload(Alert.service),
            selectinload(Alert.assignee),
            selectinload(Alert.timeline).selectinload(AlertTimelineEntry.author),
        )
        .where(Alert.id == alert_id)
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertResponse.model_validate(alert)


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
    if payload.status:
        db.add(
            AlertTimelineEntry(
                alert_id=alert.id,
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
            selectinload(Incident.timeline).selectinload(IncidentTimelineEntry.author),
            selectinload(Incident.action_items).selectinload(ActionItem.owner),
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
    return IncidentResponse.model_validate(incident)


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

    if payload.status == IncidentStatus.PIR_PENDING:
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


@router.get("/ai/suggestions", response_model=list[AISuggestion])
async def get_ai_suggestions(
    context_type: str = Query(default="alert"),
    context_id: Optional[int] = None,
) -> list[AISuggestion]:
    if context_type == "alert":
        return [
            AISuggestion(
                id="route-1",
                type="routing",
                title="Suggested priority: P2",
                description="Based on similar alerts on Payment Gateway",
                confidence=84,
                reasoning="Similar to alerts #1234, #1567 — both resolved as transient latency",
            ),
            AISuggestion(
                id="resolve-1",
                type="resolution",
                title="Suggested resolution: Scale pods",
                description="12 of 15 similar alerts resolved by scaling replicas",
                confidence=76,
                reasoning="Historical pattern on Payment Gateway during traffic spikes",
            ),
        ]
    if context_type == "incident":
        return [
            AISuggestion(
                id="assign-1",
                type="assignee",
                title="Suggested assignee: Toma SRE",
                description="Handled 12 similar incidents on Trading platform",
                confidence=91,
                reasoning="See INC-2190, INC-2002 for similar order timeout patterns",
            ),
            AISuggestion(
                id="rca-1",
                type="root-cause",
                title="Probable root cause: Recent deployment",
                description="Deployment CHG-499 at 14:32 UTC correlates with alert onset",
                confidence=87,
                reasoning="Timeline overlay: change deployed 8 min before first alert",
            ),
        ]
    return [
        AISuggestion(
            id="risk-1",
            type="risk",
            title="Risk score: HIGH (78%)",
            description="This service had 2 incidents after similar changes in the last 90 days",
            confidence=78,
            reasoning="Tier 2 service with elevated incident frequency",
        ),
        AISuggestion(
            id="window-1",
            type="window",
            title="Suggested window: Tue 02:00-04:00 UTC",
            description="Lowest traffic period based on historical patterns",
            confidence=82,
            reasoning="Minimal incident history during this window",
        ),
    ]


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
