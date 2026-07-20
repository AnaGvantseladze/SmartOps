from copy import deepcopy

DEFAULT_ALERT_RULES = [
    {
        "id": "cpu-high",
        "name": "CPU utilization high",
        "source": "azure_monitor",
        "condition": "cpu_percent > 85 for 5m",
        "priority": "P2",
        "enabled": True,
    },
    {
        "id": "error-rate",
        "name": "Application error rate spike",
        "source": "application_insights",
        "condition": "exceptions/count > 50 in 5m",
        "priority": "P1",
        "enabled": True,
    },
    {
        "id": "latency-p99",
        "name": "P99 latency threshold",
        "source": "api_gateway",
        "condition": "response_time_p99 > 2000ms",
        "priority": "P2",
        "enabled": True,
    },
]

DEFAULT_SEVERITY_LEVELS = [
    {"code": "P0", "label": "Critical", "description": "Complete service outage or data loss", "enabled": True},
    {"code": "P1", "label": "High", "description": "Major functionality impaired", "enabled": True},
    {"code": "P2", "label": "Medium", "description": "Degraded performance or partial outage", "enabled": True},
    {"code": "P3", "label": "Low", "description": "Minor issue with workaround", "enabled": True},
    {"code": "P4", "label": "Informational", "description": "No immediate user impact", "enabled": True},
    {"code": "P5", "label": "Planning", "description": "Tracking only", "enabled": True},
]

DEFAULT_CATEGORIES = [
    {"id": "application", "name": "Application", "description": "Application-layer failures", "enabled": True},
    {"id": "infrastructure", "name": "Infrastructure", "description": "Hosts, networks, and platform issues", "enabled": True},
    {"id": "monitoring", "name": "Monitoring", "description": "Synthetic and observability alerts", "enabled": True},
    {"id": "security", "name": "Security", "description": "Security and compliance events", "enabled": True},
]

DEFAULT_NOTIFICATION_CHANNELS = [
    {"id": "email", "name": "Email", "enabled": True, "config": {"from_address": "alerts@smartops.local"}},
    {"id": "teams", "name": "Microsoft Teams", "enabled": True, "config": {"webhook_url": "https://outlook.office.com/webhook/..."}},
    {"id": "slack", "name": "Slack", "enabled": False, "config": {"webhook_url": ""}},
    {"id": "sms", "name": "SMS", "enabled": True, "config": {"provider": "twilio"}},
]

DEFAULT_AUTH_CONFIG = {
    "sso_enabled": False,
    "sso_provider": "azure_ad",
    "ldap_enabled": False,
    "ldap_host": "",
    "ldap_base_dn": "",
    "session_timeout_minutes": 480,
    "mfa_required": False,
}

_alert_rules: list[dict] = deepcopy(DEFAULT_ALERT_RULES)
_severity_levels: list[dict] = deepcopy(DEFAULT_SEVERITY_LEVELS)
_categories: list[dict] = deepcopy(DEFAULT_CATEGORIES)
_notification_channels: list[dict] = deepcopy(DEFAULT_NOTIFICATION_CHANNELS)
_auth_config: dict = deepcopy(DEFAULT_AUTH_CONFIG)
_last_backup_at: str | None = None


def get_platform_config() -> dict:
    return {
        "alert_rules": deepcopy(_alert_rules),
        "severity_levels": deepcopy(_severity_levels),
        "categories": deepcopy(_categories),
        "notification_channels": deepcopy(_notification_channels),
        "auth_config": deepcopy(_auth_config),
        "last_backup_at": _last_backup_at,
    }


def set_alert_rules(rules: list[dict]) -> None:
    global _alert_rules
    _alert_rules = deepcopy(rules)


def set_severity_levels(levels: list[dict]) -> None:
    global _severity_levels
    _severity_levels = deepcopy(levels)


def set_categories(categories: list[dict]) -> None:
    global _categories
    _categories = deepcopy(categories)


def set_notification_channels(channels: list[dict]) -> None:
    global _notification_channels
    _notification_channels = deepcopy(channels)


def set_auth_config(config: dict) -> None:
    global _auth_config
    _auth_config = {**_auth_config, **config}


def create_backup_snapshot() -> dict:
    global _last_backup_at
    from datetime import datetime, timezone

    snapshot = get_platform_config()
    _last_backup_at = datetime.now(timezone.utc).isoformat()
    snapshot["backed_up_at"] = _last_backup_at
    return snapshot


def restore_backup_snapshot(snapshot: dict) -> None:
    if "alert_rules" in snapshot:
        set_alert_rules(snapshot["alert_rules"])
    if "severity_levels" in snapshot:
        set_severity_levels(snapshot["severity_levels"])
    if "categories" in snapshot:
        set_categories(snapshot["categories"])
    if "notification_channels" in snapshot:
        set_notification_channels(snapshot["notification_channels"])
    if "auth_config" in snapshot:
        set_auth_config(snapshot["auth_config"])
