from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class WebhookIntegrationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    webhook_secret: Optional[str] = Field(None, max_length=255)


class WebhookIntegrationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    webhook_secret: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class WebhookIntegrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str]
    webhook_secret: Optional[str]
    webhook_url: str
    is_active: bool
    created_at: datetime
    last_alert_at: Optional[datetime]
    alert_count: int


class WebhookAlertPayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    source: Optional[str] = None
    service: Optional[str] = None
