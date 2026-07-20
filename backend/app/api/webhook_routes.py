from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.entities import User, WebhookIntegration
from app.permissions import Permission, require_permission
from app.schemas.webhook_schemas import (
    WebhookIntegrationCreate,
    WebhookIntegrationResponse,
    WebhookIntegrationUpdate,
)
from app.services.audit_service import write_audit_log
from app.services.webhook_service import process_webhook_alert

admin_router = APIRouter(prefix="/integrations/webhooks", tags=["webhooks"])
public_router = APIRouter(tags=["webhooks"])


def _webhook_url(integration_id: int) -> str:
    base = settings.public_base_url.rstrip("/")
    return f"{base}/api/v1/webhooks/{integration_id}"


async def _handle_webhook(
    integration_id: int,
    payload: dict[str, Any],
    request: Request,
    db: AsyncSession,
) -> dict:
    integration = await db.get(WebhookIntegration, integration_id)
    if not integration:
        raise HTTPException(
            status_code=404,
            detail=f"Webhook integration #{integration_id} does not exist. Create one in Settings → Webhook Integrations.",
        )
    if not integration.is_active:
        raise HTTPException(
            status_code=404,
            detail=f"Webhook integration #{integration_id} is paused. Click Activate in Settings → Webhook Integrations.",
        )

    _check_webhook_secret(integration, request)

    alert = await process_webhook_alert(db, integration_id, payload, _webhook_url(integration_id))
    if not alert:
        raise HTTPException(status_code=400, detail="Failed to process webhook alert")
    return {"status": "received", "alert_id": alert.id}


def _to_response(integration: WebhookIntegration) -> WebhookIntegrationResponse:
    return WebhookIntegrationResponse.model_validate(integration).model_copy(
        update={"webhook_url": _webhook_url(integration.id)}
    )


def _check_webhook_secret(integration: WebhookIntegration, request: Request) -> None:
    if not integration.webhook_secret:
        return
    provided = request.headers.get("X-Webhook-Secret")
    if provided != integration.webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")


@admin_router.get("", response_model=list[WebhookIntegrationResponse])
async def list_integrations(
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INTEGRATIONS_MANAGE.value))] = None,
) -> list[WebhookIntegrationResponse]:
    result = await db.execute(select(WebhookIntegration).order_by(WebhookIntegration.created_at.desc()))
    return [_to_response(i) for i in result.scalars().all()]


@admin_router.post("", response_model=WebhookIntegrationResponse, status_code=201)
async def create_integration(
    payload: WebhookIntegrationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INTEGRATIONS_MANAGE.value))] = None,
) -> WebhookIntegrationResponse:
    integration = WebhookIntegration(
        name=payload.name,
        description=payload.description,
        webhook_secret=payload.webhook_secret,
        webhook_url="",
    )
    db.add(integration)
    await db.flush()
    integration.webhook_url = _webhook_url(integration.id)
    await db.flush()

    await write_audit_log(
        db,
        user_id=current_user.id,
        action="webhook_integration.created",
        resource_type="webhook_integration",
        resource_id=str(integration.id),
        details=f"Created webhook integration '{integration.name}'",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(integration)
    return _to_response(integration)


@admin_router.patch("/{integration_id}", response_model=WebhookIntegrationResponse)
async def update_integration(
    integration_id: int,
    payload: WebhookIntegrationUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INTEGRATIONS_MANAGE.value))] = None,
) -> WebhookIntegrationResponse:
    integration = await db.get(WebhookIntegration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Webhook integration not found")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(integration, key, value)

    integration.webhook_url = _webhook_url(integration.id)

    await write_audit_log(
        db,
        user_id=current_user.id,
        action="webhook_integration.updated",
        resource_type="webhook_integration",
        resource_id=str(integration.id),
        details=f"Updated webhook integration '{integration.name}': {list(updates.keys())}",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(integration)
    return _to_response(integration)


@admin_router.delete("/{integration_id}", status_code=204)
async def delete_integration(
    integration_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INTEGRATIONS_MANAGE.value))] = None,
) -> None:
    integration = await db.get(WebhookIntegration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Webhook integration not found")

    await db.delete(integration)
    await write_audit_log(
        db,
        user_id=current_user.id,
        action="webhook_integration.deleted",
        resource_type="webhook_integration",
        resource_id=str(integration_id),
        details=f"Deleted webhook integration '{integration.name}'",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()


@admin_router.post("/{integration_id}/test")
async def test_webhook(
    integration_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INTEGRATIONS_MANAGE.value))] = None,
) -> dict:
    integration = await db.get(WebhookIntegration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Webhook integration not found")

    payload = {
        "title": "Test Webhook Alert",
        "description": "Test alert sent from SmartOps",
        "priority": "P3",
        "source": "smartops-test",
        "service": "api-gateway",
    }
    alert = await process_webhook_alert(db, integration.id, payload, integration.webhook_url)
    if not alert:
        raise HTTPException(status_code=400, detail="Failed to process test alert")
    return {"status": "ok", "alert_id": alert.id, "integration_id": integration.id}


@public_router.get("/ping")
async def webhook_ping() -> dict:
    """Health check — verify the webhook API is reachable (no auth required)."""
    return {"status": "ok", "message": "Webhook API is running. POST alerts to /api/v1/webhooks/{integration_id}"}


@public_router.post("/{integration_id}")
async def receive_webhook(
    integration_id: int,
    payload: dict[str, Any],
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Public webhook endpoint — send alerts via POST from Postman or any HTTP client."""
    return await _handle_webhook(integration_id, payload, request, db)


@public_router.post("/azure/{integration_id}")
async def receive_webhook_legacy(
    integration_id: int,
    payload: dict[str, Any],
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Legacy Azure webhook path — same handler as /webhooks/{integration_id}."""
    return await _handle_webhook(integration_id, payload, request, db)
