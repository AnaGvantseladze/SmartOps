from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import Alert, AlertPriority, AlertStatus, AlertTimelineEntry, AzureIntegration, Service


def map_azure_severity(severity: Optional[str]) -> AlertPriority:
    """Map Azure Monitor severity to SmartOps priority."""
    if not severity:
        return AlertPriority.P3
    severity = severity.lower()
    if severity in ("0", "critical", "sev0"):
        return AlertPriority.P1
    if severity in ("1", "error", "high", "sev1"):
        return AlertPriority.P2
    if severity in ("2", "warning", "medium", "sev2"):
        return AlertPriority.P3
    if severity in ("3", "informational", "low", "sev3"):
        return AlertPriority.P4
    return AlertPriority.P3


def _extract_from_data(data: dict[str, Any]) -> dict[str, Any]:
    """Extract normalized alert fields from Azure Monitor common alert schema."""
    alert_context = data.get("alertContext", {}) or {}
    essentials = data.get("essentials", {}) or {}

    title = essentials.get("alertRule") or alert_context.get("condition", {}).get("allOf", [{}])[0].get("metricName") or "Azure Alert"
    description = essentials.get("description") or alert_context.get("description") or "Alert received from Azure Monitor"
    severity = essentials.get("severity") or alert_context.get("severity")
    resource_id = essentials.get("alertTargetIDs", [None])[0] or essentials.get("targetResourceId") or ""
    resource_group = essentials.get("configurationItems", [None])[0] or ""
    subscription_id = essentials.get("subscriptionId") or ""

    # Try to derive service name from resource ID
    service_name = "Azure"
    if resource_id:
        parts = resource_id.split("/")
        if parts:
            service_name = parts[-1]

    return {
        "title": str(title),
        "description": str(description),
        "severity": str(severity) if severity else None,
        "resource_id": str(resource_id),
        "resource_group": str(resource_group),
        "subscription_id": str(subscription_id),
        "service_name": service_name,
        "raw": data,
    }


async def find_service_by_name(db: AsyncSession, name: str) -> Optional[Service]:
    """Best-effort match an Azure resource name to a SmartOps service."""
    result = await db.execute(select(Service).where(Service.name.ilike(f"%{name}%")))
    return result.scalar_one_or_none()


async def process_azure_alert(
    db: AsyncSession,
    integration_id: int,
    payload: dict[str, Any],
    webhook_url: str,
) -> Optional[Alert]:
    """Parse an Azure webhook payload and create an Alert."""
    integration = await db.get(AzureIntegration, integration_id)
    if not integration or not integration.is_active:
        return None

    # The common alert schema wraps the payload in a "data" field.
    data = payload.get("data") or payload
    extracted = _extract_from_data(data)

    service = await find_service_by_name(db, extracted["service_name"])
    priority = map_azure_severity(extracted["severity"])

    title = f"Azure: {extracted['title']}"
    description = (
        f"{extracted['description']}\n\n"
        f"Resource: {extracted['resource_id']}\n"
        f"Resource Group: {extracted['resource_group']}\n"
        f"Subscription: {extracted['subscription_id']}"
    )

    alert = Alert(
        title=title,
        description=description,
        priority=priority,
        status=AlertStatus.TRIGGERED,
        source="Azure Monitor",
        service_id=service.id if service else None,
        enrichment_data=str(extracted["raw"]),
    )
    db.add(alert)
    await db.flush()

    db.add(
        AlertTimelineEntry(
            alert_id=alert.id,
            entry_type="azure-webhook",
            content=f"Alert ingested from Azure integration '{integration.name}' via webhook {webhook_url}",
        )
    )

    integration.last_alert_at = datetime.now(timezone.utc)
    integration.alert_count += 1

    await db.commit()
    await db.refresh(alert)
    return alert
