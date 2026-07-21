import json
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Alert, AlertPriority, AlertStatus, AlertTimelineEntry, Service, WebhookIntegration
from app.services.alert_events import notify_alert_created


def map_webhook_priority(priority: Optional[str]) -> AlertPriority:
    if not priority:
        return AlertPriority.P3
    value = str(priority).strip().upper()
    if value in {"P1", "CRITICAL", "SEV0", "SEV1", "0", "1"}:
        return AlertPriority.P1
    if value in {"P2", "HIGH", "ERROR", "SEV2", "2"}:
        return AlertPriority.P2
    if value in {"P3", "MEDIUM", "WARNING", "SEV3", "3"}:
        return AlertPriority.P3
    if value in {"P4", "LOW", "INFO", "INFORMATIONAL", "SEV4", "4"}:
        return AlertPriority.P4
    if value in {"P5", "5"}:
        return AlertPriority.P5
    return AlertPriority.P3


def parse_webhook_payload(payload: dict[str, Any]) -> dict[str, Any]:
    title = (
        payload.get("title")
        or payload.get("alert")
        or payload.get("name")
        or payload.get("summary")
        or "Webhook Alert"
    )
    description = (
        payload.get("description")
        or payload.get("message")
        or payload.get("body")
        or payload.get("details")
        or "Alert received via webhook"
    )
    priority = payload.get("priority") or payload.get("severity") or payload.get("level")
    source = payload.get("source") or "Webhook"
    service_name = payload.get("service") or payload.get("service_name") or payload.get("resource")
    return {
        "title": str(title),
        "description": str(description),
        "priority": str(priority) if priority is not None else None,
        "source": str(source),
        "service_name": str(service_name) if service_name else None,
        "raw": payload,
    }


async def find_service_by_name(db: AsyncSession, name: str) -> Optional[Service]:
    result = await db.execute(select(Service).where(Service.name.ilike(f"%{name}%")))
    return result.scalar_one_or_none()


async def process_webhook_alert(
    db: AsyncSession,
    integration_id: int,
    payload: dict[str, Any],
    webhook_url: str,
) -> Optional[Alert]:
    integration = await db.get(WebhookIntegration, integration_id)
    if not integration or not integration.is_active:
        return None

    extracted = parse_webhook_payload(payload)
    service = None
    if extracted["service_name"]:
        service = await find_service_by_name(db, extracted["service_name"])

    alert = Alert(
        title=extracted["title"],
        description=extracted["description"],
        priority=map_webhook_priority(extracted["priority"]),
        status=AlertStatus.TRIGGERED,
        source=extracted["source"],
        service_id=service.id if service else None,
        enrichment_data=json.dumps(extracted["raw"]),
    )
    db.add(alert)
    await db.flush()

    db.add(
        AlertTimelineEntry(
            alert_id=alert.id,
            entry_type="webhook",
            content=f"Alert ingested from webhook integration '{integration.name}' via {webhook_url}",
        )
    )

    integration.last_alert_at = datetime.now(timezone.utc)
    integration.alert_count += 1

    await db.commit()
    await db.refresh(alert)
    await notify_alert_created(alert.id, title=alert.title, priority=alert.priority.value)
    return alert
