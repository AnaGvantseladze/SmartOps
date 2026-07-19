from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.entities import AzureIntegration, User
from app.models.audit import AuditLog
from app.permissions import Permission, require_permission
from app.schemas.azure_schemas import (
    AzureIntegrationCreate,
    AzureIntegrationResponse,
    AzureIntegrationUpdate,
)
from app.services.audit_service import write_audit_log
from app.services.azure_service import process_azure_alert

router = APIRouter(prefix="/azure", tags=["azure"])


def _webhook_url(request: Request, integration_id: int) -> str:
    # Build a public webhook URL. In production this should come from config.
    base = str(request.base_url).rstrip("/")
    return f"{base}/api/v1/webhooks/azure/{integration_id}"


@router.get("/integrations", response_model=list[AzureIntegrationResponse])
async def list_integrations(
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INTEGRATIONS_MANAGE.value))] = None,
) -> list[AzureIntegrationResponse]:
    result = await db.execute(select(AzureIntegration).order_by(AzureIntegration.created_at.desc()))
    integrations = result.scalars().all()
    return [
        AzureIntegrationResponse(
            **AzureIntegrationResponse.model_validate(i).model_dump(),
            webhook_url=_webhook_url(None, i.id) if not request else _webhook_url(request, i.id),
        )
        for i in integrations
    ]


@router.post("/integrations", response_model=AzureIntegrationResponse, status_code=201)
async def create_integration(
    payload: AzureIntegrationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INTEGRATIONS_MANAGE.value))] = None,
) -> AzureIntegrationResponse:
    integration = AzureIntegration(
        name=payload.name,
        description=payload.description,
        tenant_id=payload.tenant_id,
        subscription_id=payload.subscription_id,
        resource_group=payload.resource_group,
        webhook_url="",  # set after commit when we have the id
    )
    db.add(integration)
    await db.flush()
    integration.webhook_url = _webhook_url(request, integration.id)
    await db.flush()

    await write_audit_log(
        db,
        user_id=current_user.id,
        action="azure_integration.created",
        resource_type="azure_integration",
        resource_id=str(integration.id),
        details=f"Created Azure integration '{integration.name}'",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(integration)
    return AzureIntegrationResponse(
        **AzureIntegrationResponse.model_validate(integration).model_dump(),
        webhook_url=integration.webhook_url,
    )


@router.patch("/integrations/{integration_id}", response_model=AzureIntegrationResponse)
async def update_integration(
    integration_id: int,
    payload: AzureIntegrationUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INTEGRATIONS_MANAGE.value))] = None,
) -> AzureIntegrationResponse:
    integration = await db.get(AzureIntegration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Azure integration not found")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(integration, key, value)

    await write_audit_log(
        db,
        user_id=current_user.id,
        action="azure_integration.updated",
        resource_type="azure_integration",
        resource_id=str(integration.id),
        details=f"Updated Azure integration '{integration.name}': {list(updates.keys())}",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(integration)
    return AzureIntegrationResponse(
        **AzureIntegrationResponse.model_validate(integration).model_dump(),
        webhook_url=_webhook_url(request, integration.id),
    )


@router.delete("/integrations/{integration_id}", status_code=204)
async def delete_integration(
    integration_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INTEGRATIONS_MANAGE.value))] = None,
) -> None:
    integration = await db.get(AzureIntegration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Azure integration not found")

    await db.delete(integration)
    await write_audit_log(
        db,
        user_id=current_user.id,
        action="azure_integration.deleted",
        resource_type="azure_integration",
        resource_id=str(integration_id),
        details=f"Deleted Azure integration '{integration.name}'",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()


@router.post("/webhooks/test")
async def test_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Annotated[User, Depends(require_permission(Permission.INTEGRATIONS_MANAGE.value))] = None,
) -> dict:
    """Send a test Azure-style alert payload to the local webhook handler."""
    # Create a temporary integration if none exists for testing
    integration = await db.scalar(select(AzureIntegration).limit(1))
    if not integration:
        integration = AzureIntegration(
            name="Test Azure Integration",
            webhook_url="",
        )
        db.add(integration)
        await db.flush()
        integration.webhook_url = _webhook_url(request, integration.id)
        await db.commit()
        await db.refresh(integration)

    payload = {
        "schemaId": "azureMonitorCommonAlertSchema",
        "data": {
            "essentials": {
                "alertRule": "Test Azure Alert",
                "severity": "2",
                "description": "Test alert from SmartOps Azure integration",
                "alertTargetIDs": ["/subscriptions/test/resourceGroups/test/providers/Microsoft.Compute/virtualMachines/test-vm"],
                "configurationItems": ["test-rg"],
                "subscriptionId": "test-sub",
            }
        },
    }
    alert = await process_azure_alert(db, integration.id, payload, integration.webhook_url)
    if not alert:
        raise HTTPException(status_code=400, detail="Failed to process test alert")
    return {"status": "ok", "alert_id": alert.id, "integration_id": integration.id}


@router.post("/webhooks/azure/{integration_id}")
async def azure_webhook(
    integration_id: int,
    payload: dict[str, Any],
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Public webhook endpoint for Azure Monitor alerts."""
    alert = await process_azure_alert(db, integration_id, payload, _webhook_url(request, integration_id))
    if not alert:
        raise HTTPException(status_code=404, detail="Azure integration not found or inactive")
    return {"status": "received", "alert_id": alert.id}
