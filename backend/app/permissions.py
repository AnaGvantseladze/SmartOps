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
}

ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.ADMIN: ADMIN_PERMISSIONS,
    UserRole.ENGINEER: {
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
    },
    UserRole.MANAGER: {
        Permission.DASHBOARD_VIEW,
        Permission.DASHBOARD_EXECUTIVE,
        Permission.ALERTS_VIEW,
        Permission.INCIDENTS_VIEW,
        Permission.INCIDENTS_COMMAND,
        Permission.CHANGES_VIEW,
        Permission.CHANGES_APPROVE,
        Permission.SERVICES_VIEW,
        Permission.SETTINGS_VIEW,
        Permission.SETTINGS_NOTIFICATIONS,
    },
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

ROLE_LANDING_PAGES: dict[UserRole, str] = {
    UserRole.ADMIN: "/settings",
    UserRole.ENGINEER: "/alerts",
    UserRole.MANAGER: "/",
    UserRole.CHANGE_MANAGER: "/changes",
}

ROLE_NAV_ITEMS: dict[UserRole, list[str]] = {
    UserRole.ADMIN: ["dashboard", "alerts", "incidents", "changes", "services", "administration"],
    UserRole.ENGINEER: ["dashboard", "alerts", "incidents", "changes", "services"],
    UserRole.MANAGER: ["dashboard", "alerts", "incidents", "changes", "services"],
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
    UserRole.MANAGER: "critical_only",
    UserRole.CHANGE_MANAGER: "none",
}

# Human-readable capability groups returned to admin UI
ADMIN_CAPABILITIES = [
    {"id": "users", "label": "Users & Teams", "description": "Add and manage users, teams, and their roles"},
    {"id": "system", "label": "System Configuration", "description": "Add services, integrations, and system parameters"},
    {"id": "alerts_incidents", "label": "Alerts & Incidents", "description": "View, edit, and change status of alerts and incidents"},
    {"id": "schedules", "label": "Schedules & Policies", "description": "Manage on-call schedules and notification policies"},
    {"id": "dashboard", "label": "Dashboard Parameters", "description": "Configure dashboard refresh, date ranges, and display options"},
    {"id": "audit", "label": "Audit Logs", "description": "View audit trail of all platform actions"},
    {"id": "export", "label": "Export Data", "description": "Export alerts, incidents, changes, services, and audit data"},
]


def get_permissions(role: UserRole) -> set[str]:
    return ROLE_PERMISSIONS.get(role, set())


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
