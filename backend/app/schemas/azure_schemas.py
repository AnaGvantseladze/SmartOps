from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AzureIntegrationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    tenant_id: Optional[str] = None
    subscription_id: Optional[str] = None
    resource_group: Optional[str] = None


class AzureIntegrationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    tenant_id: Optional[str] = None
    subscription_id: Optional[str] = None
    resource_group: Optional[str] = None
    is_active: Optional[bool] = None


class AzureIntegrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str]
    tenant_id: Optional[str]
    subscription_id: Optional[str]
    resource_group: Optional[str]
    webhook_url: str
    is_active: bool
    created_at: datetime
    last_alert_at: Optional[datetime]
    alert_count: int


class AzureWebhookPayload(BaseModel):
    # Azure Monitor common alert schema is flexible; we accept any dict
    # and parse known fields in the service layer.
    schemaId: Optional[str] = None
    data: Optional[dict] = None
