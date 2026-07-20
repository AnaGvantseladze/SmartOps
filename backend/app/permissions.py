from enum import Enum

from fastapi import Depends, HTTPException, status

from app.models.entities import User, UserRole


class Permission(str, Enum):
    # Dashboard
    DASHBOARD_VIEW = "dashboard:view"
    DASHBOARD_EXECUTIVE = "dashboard:executive"
    DASHBOARD_MANAGE = "dashboard:manage"
    # Alerts & incidents
    ALERTS_VIEW = "alerts:view"
    ALERTS_MANAGE = "alerts:manage"
    INCIDENTS_VIEW = "incidents:view"
    INCIDENTS_MANAGE = "incidents:manage"
    INCIDENTS_COMMAND = "incidents:command"
    # Changes
    CHANGES_VIEW = "changes:view"
    CHANGES_SUBMIT = "changes:submit"
    CHANGES_APPROVE = "changes:approve"
    CHANGES_MANAGE = "changes:manage"
    # Services & system
    SERVICES_VIEW = "services:view"
    SERVICES_MANAGE = "services:manage"
    SYSTEM_CONFIG = "system:config"
    INTEGRATIONS_MANAGE = "integrations:manage"
    # Settings & policies
    SETTINGS_VIEW = "settings:view"
    SETTINGS_NOTIFICATIONS = "settings:notifications"
    SETTINGS_ON_CALL = "settings:on_call"
    SETTINGS_ADMIN = "settings:admin"
    SCHEDULES_MANAGE = "schedules:manage"
    # Administration
    USERS_MANAGE = "users:manage"
    TEAMS_MANAGE = "teams:manage"
    AUDIT_VIEW = "audit:view"
    EXPORT_DATA = "export:data"
    ALERT_RULES_MANAGE = "alert_rules:manage"
    NOTIFICATION_CHANNELS_MANAGE = "notifications:channels"
    SEVERITY_MANAGE = "severity:manage"
    CATEGORIES_MANAGE = "categories:manage"
    PERMISSIONS_MANAGE = "permissions:manage"
    BACKUP_RESTORE = "backup:restore"
    AUTH_CONFIG = "auth:config"


# Explicit Administrator permissions per product spec
ADMIN_PERMISSIONS: set[str] = {
    Permission.USERS_MANAGE,
    Permission.TEAMS_MANAGE,
    Permission.SYSTEM_CONFIG,
    Permission.INTEGRATIONS_MANAGE,
    Permission.SERVICES_VIEW,
    Permission.SERVICES_MANAGE,
    Permission.ALERTS_VIEW,
    Permission.ALERTS_MANAGE,
    Permission.INCIDENTS_VIEW,
    Permission.INCIDENTS_MANAGE,
    Permission.CHANGES_VIEW,
    Permission.CHANGES_MANAGE,
    Permission.CHANGES_APPROVE,
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_ADMIN,
    Permission.SETTINGS_NOTIFICATIONS,
    Permission.SETTINGS_ON_CALL,
    Permission.SCHEDULES_MANAGE,
    Permission.DASHBOARD_VIEW,
    Permission.DASHBOARD_MANAGE,
    Permission.DASHBOARD_EXECUTIVE,
    Permission.AUDIT_VIEW,
    Permission.EXPORT_DATA,
    Permission.ALERT_RULES_MANAGE,
    Permission.NOTIFICATION_CHANNELS_MANAGE,
    Permission.SEVERITY_MANAGE,
    Permission.CATEGORIES_MANAGE,
    Permission.PERMISSIONS_MANAGE,
    Permission.BACKUP_RESTORE,
    Permission.AUTH_CONFIG,
    Permission.INCIDENTS_COMMAND,
    Permission.CHANGES_SUBMIT,
}

# Engineer baseline used by manager role expansion
ENGINEER_PERMISSIONS: set[str] = {
    Permission.DASHBOARD_VIEW,
    Permission.ALERTS_VIEW,
    Permission.ALERTS_MANAGE,
    Permission.INCIDENTS_VIEW,
    Permission.INCIDENTS_MANAGE,
    Permission.CHANGES_VIEW,
    Permission.CHANGES_SUBMIT,
    Permission.SERVICES_VIEW,
    Permission.SERVICES_MANAGE,
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_NOTIFICATIONS,
    Permission.SETTINGS_ON_CALL,
}

MANAGER_EXTRA_PERMISSIONS: set[str] = {
    Permission.DASHBOARD_EXECUTIVE,
    Permission.DASHBOARD_MANAGE,
    Permission.EXPORT_DATA,
    Permission.AUDIT_VIEW,
    Permission.INCIDENTS_COMMAND,
    Permission.CHANGES_APPROVE,
}

ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.ADMIN: ADMIN_PERMISSIONS,
    UserRole.ENGINEER: set(ENGINEER_PERMISSIONS),
    UserRole.MANAGER: set(ENGINEER_PERMISSIONS) | MANAGER_EXTRA_PERMISSIONS,
    UserRole.CHANGE_MANAGER: {
        Permission.DASHBOARD_VIEW,
        Permission.CHANGES_VIEW,
        Permission.CHANGES_APPROVE,
        Permission.CHANGES_MANAGE,
        Permission.SERVICES_VIEW,
        Permission.SETTINGS_VIEW,
        Permission.SETTINGS_NOTIFICATIONS,
    },
}

# Mutable copy used at runtime — admins can customize via the permissions UI
_effective_role_permissions: dict[UserRole, set[str]] = {
    role: set(perms) for role, perms in ROLE_PERMISSIONS.items()
}

PERMISSION_LABELS: dict[str, str] = {
    Permission.DASHBOARD_VIEW.value: "View dashboard",
    Permission.DASHBOARD_EXECUTIVE.value: "Executive dashboard",
    Permission.DASHBOARD_MANAGE.value: "Manage dashboard settings",
    Permission.ALERTS_VIEW.value: "View alerts",
    Permission.ALERTS_MANAGE.value: "Manage alerts",
    Permission.INCIDENTS_VIEW.value: "View incidents",
    Permission.INCIDENTS_MANAGE.value: "Manage incidents",
    Permission.INCIDENTS_COMMAND.value: "Incident command (assign, priority)",
    Permission.CHANGES_VIEW.value: "View changes",
    Permission.CHANGES_SUBMIT.value: "Submit change requests",
    Permission.CHANGES_APPROVE.value: "Approve changes",
    Permission.CHANGES_MANAGE.value: "Manage changes",
    Permission.SERVICES_VIEW.value: "View service catalog",
    Permission.SERVICES_MANAGE.value: "Manage services",
    Permission.SYSTEM_CONFIG.value: "System configuration",
    Permission.INTEGRATIONS_MANAGE.value: "Manage integrations",
    Permission.SETTINGS_VIEW.value: "View settings",
    Permission.SETTINGS_NOTIFICATIONS.value: "Notification settings",
    Permission.SETTINGS_ON_CALL.value: "On-call schedules",
    Permission.SETTINGS_ADMIN.value: "Admin settings",
    Permission.SCHEDULES_MANAGE.value: "Manage schedules",
    Permission.USERS_MANAGE.value: "Manage users",
    Permission.TEAMS_MANAGE.value: "Manage teams",
    Permission.AUDIT_VIEW.value: "View audit logs",
    Permission.EXPORT_DATA.value: "Export data",
    Permission.ALERT_RULES_MANAGE.value: "Manage alert rules",
    Permission.NOTIFICATION_CHANNELS_MANAGE.value: "Manage notification channels",
    Permission.SEVERITY_MANAGE.value: "Manage severity levels",
    Permission.CATEGORIES_MANAGE.value: "Manage categories",
    Permission.PERMISSIONS_MANAGE.value: "Manage permissions",
    Permission.BACKUP_RESTORE.value: "Backup and restore",
    Permission.AUTH_CONFIG.value: "Authentication configuration",
}

PERMISSION_GROUPS: list[dict] = [
    {
        "id": "dashboard",
        "label": "Dashboard",
        "permissions": [
            Permission.DASHBOARD_VIEW.value,
            Permission.DASHBOARD_EXECUTIVE.value,
            Permission.DASHBOARD_MANAGE.value,
        ],
    },
    {
        "id": "alerts_incidents",
        "label": "Alerts & Incidents",
        "permissions": [
            Permission.ALERTS_VIEW.value,
            Permission.ALERTS_MANAGE.value,
            Permission.INCIDENTS_VIEW.value,
            Permission.INCIDENTS_MANAGE.value,
            Permission.INCIDENTS_COMMAND.value,
        ],
    },
    {
        "id": "changes",
        "label": "Change Management",
        "permissions": [
            Permission.CHANGES_VIEW.value,
            Permission.CHANGES_SUBMIT.value,
            Permission.CHANGES_APPROVE.value,
            Permission.CHANGES_MANAGE.value,
        ],
    },
    {
        "id": "services",
        "label": "Services & System",
        "permissions": [
            Permission.SERVICES_VIEW.value,
            Permission.SERVICES_MANAGE.value,
            Permission.SYSTEM_CONFIG.value,
            Permission.INTEGRATIONS_MANAGE.value,
        ],
    },
    {
        "id": "settings",
        "label": "Settings",
        "permissions": [
            Permission.SETTINGS_VIEW.value,
            Permission.SETTINGS_NOTIFICATIONS.value,
            Permission.SETTINGS_ON_CALL.value,
            Permission.SETTINGS_ADMIN.value,
            Permission.SCHEDULES_MANAGE.value,
        ],
    },
    {
        "id": "administration",
        "label": "Administration",
        "permissions": [
            Permission.USERS_MANAGE.value,
            Permission.TEAMS_MANAGE.value,
            Permission.AUDIT_VIEW.value,
            Permission.EXPORT_DATA.value,
            Permission.ALERT_RULES_MANAGE.value,
            Permission.NOTIFICATION_CHANNELS_MANAGE.value,
            Permission.SEVERITY_MANAGE.value,
            Permission.CATEGORIES_MANAGE.value,
            Permission.PERMISSIONS_MANAGE.value,
            Permission.BACKUP_RESTORE.value,
            Permission.AUTH_CONFIG.value,
        ],
    },
]

ROLE_LANDING_PAGES: dict[UserRole, str] = {
    UserRole.ADMIN: "/settings",
    UserRole.ENGINEER: "/alerts",
    UserRole.MANAGER: "/",
    UserRole.CHANGE_MANAGER: "/changes",
}

ROLE_NAV_ITEMS: dict[UserRole, list[str]] = {
    UserRole.ADMIN: ["dashboard", "alerts", "incidents", "changes", "on-call", "services", "administration"],
    UserRole.ENGINEER: ["dashboard", "alerts", "incidents", "changes", "on-call", "services", "settings"],
    UserRole.MANAGER: ["dashboard", "alerts", "incidents", "changes", "on-call", "services", "settings"],
    UserRole.CHANGE_MANAGER: ["dashboard", "changes", "services"],
}

ROLE_LABELS: dict[UserRole, str] = {
    UserRole.ADMIN: "Administrator",
    UserRole.ENGINEER: "SRE Engineer",
    UserRole.MANAGER: "Manager",
    UserRole.CHANGE_MANAGER: "Change Manager",
}

ROLE_ALERT_SCOPE: dict[UserRole, str] = {
    UserRole.ADMIN: "all",
    UserRole.ENGINEER: "my_services",
    UserRole.MANAGER: "all",
    UserRole.CHANGE_MANAGER: "none",
}

# Human-readable capability groups returned to admin UI
ADMIN_CAPABILITIES = [
    {"id": "users", "label": "Users & Teams", "description": "Create, edit, delete users and assign roles"},
    {"id": "integrations", "label": "Integrations", "description": "Configure Azure Monitor, Application Insights, APIs, and servers"},
    {"id": "alert_rules", "label": "Alert Rules", "description": "Configure alert ingestion and routing rules"},
    {"id": "notifications", "label": "Notification Channels", "description": "Configure Email, Teams, Slack, and SMS delivery"},
    {"id": "taxonomy", "label": "Severity & Categories", "description": "Manage severity levels and incident categories"},
    {"id": "permissions", "label": "Permissions", "description": "Review and manage role permission assignments"},
    {"id": "dashboard", "label": "Dashboard Parameters", "description": "Configure dashboard refresh, date ranges, and visibility"},
    {"id": "auth", "label": "Authentication", "description": "Configure SSO, LDAP, and session policies"},
    {"id": "backup", "label": "Backup & Restore", "description": "Backup and restore platform configuration"},
    {"id": "audit", "label": "Audit Logs", "description": "View audit trail of all platform actions"},
    {"id": "export", "label": "Export Data", "description": "Export alerts, incidents, changes, and audit data"},
]


def get_permissions(role: UserRole) -> set[str]:
    return set(_effective_role_permissions.get(role, set()))


def get_all_permission_values() -> list[str]:
    return sorted(p.value for p in Permission)


def get_permission_catalog() -> list[dict]:
    return [
        {
            "value": perm.value,
            "label": PERMISSION_LABELS.get(perm.value, perm.value),
            "group": next(
                (group["label"] for group in PERMISSION_GROUPS if perm.value in group["permissions"]),
                "Other",
            ),
        }
        for perm in Permission
    ]


def set_role_permissions(role: UserRole, permissions: list[str]) -> set[str]:
    valid = {p.value for p in Permission}
    unknown = set(permissions) - valid
    if unknown:
        raise ValueError(f"Unknown permissions: {', '.join(sorted(unknown))}")
    _effective_role_permissions[role] = set(permissions)
    return _effective_role_permissions[role]


def reset_role_permissions(role: UserRole) -> set[str]:
    _effective_role_permissions[role] = set(ROLE_PERMISSIONS.get(role, set()))
    return _effective_role_permissions[role]


def has_permission(role: UserRole, permission: str) -> bool:
    return permission in get_permissions(role)


def get_role_config(role: UserRole) -> dict:
    config = {
        "role": role.value,
        "role_label": ROLE_LABELS.get(role, role.value),
        "permissions": sorted(get_permissions(role)),
        "landing_page": ROLE_LANDING_PAGES.get(role, "/"),
        "nav_items": ROLE_NAV_ITEMS.get(role, []),
        "alert_scope": ROLE_ALERT_SCOPE.get(role, "all"),
    }
    if role == UserRole.ADMIN:
        config["admin_capabilities"] = ADMIN_CAPABILITIES
    return config


def require_permission(*permissions: str):
    from app.api.auth import get_current_user

    async def checker(user: User = Depends(get_current_user)) -> User:
        user_perms = get_permissions(user.role)
        if not any(p in user_perms for p in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {', '.join(permissions)}",
            )
        return user

    return checker


def require_any_permission(*permissions: str):
    from app.api.auth import get_current_user

    async def checker(user: User = Depends(get_current_user)) -> User:
        user_perms = get_permissions(user.role)
        if not any(p in user_perms for p in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required one of: {', '.join(permissions)}",
            )
        return user

    return checker
