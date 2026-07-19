from enum import Enum

from fastapi import Depends, HTTPException, status

from app.models.entities import User, UserRole


class Permission(str, Enum):
    DASHBOARD_VIEW = "dashboard:view"
    DASHBOARD_EXECUTIVE = "dashboard:executive"
    ALERTS_VIEW = "alerts:view"
    ALERTS_MANAGE = "alerts:manage"
    INCIDENTS_VIEW = "incidents:view"
    INCIDENTS_MANAGE = "incidents:manage"
    INCIDENTS_COMMAND = "incidents:command"
    CHANGES_VIEW = "changes:view"
    CHANGES_SUBMIT = "changes:submit"
    CHANGES_APPROVE = "changes:approve"
    CHANGES_MANAGE = "changes:manage"
    SERVICES_VIEW = "services:view"
    SERVICES_MANAGE = "services:manage"
    SETTINGS_VIEW = "settings:view"
    SETTINGS_NOTIFICATIONS = "settings:notifications"
    SETTINGS_ON_CALL = "settings:on_call"
    SETTINGS_ADMIN = "settings:admin"
    USERS_MANAGE = "users:manage"
    AUDIT_VIEW = "audit:view"


ALL_PERMISSIONS = {p.value for p in Permission}

ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.ADMIN: ALL_PERMISSIONS,
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
        Permission.AUDIT_VIEW,
    },
    UserRole.NOC_ANALYST: {
        Permission.DASHBOARD_VIEW,
        Permission.ALERTS_VIEW,
        Permission.ALERTS_MANAGE,
        Permission.INCIDENTS_VIEW,
        Permission.SERVICES_VIEW,
        Permission.SETTINGS_VIEW,
        Permission.SETTINGS_NOTIFICATIONS,
        Permission.SETTINGS_ON_CALL,
    },
    UserRole.INCIDENT_MANAGER: {
        Permission.DASHBOARD_VIEW,
        Permission.DASHBOARD_EXECUTIVE,
        Permission.ALERTS_VIEW,
        Permission.INCIDENTS_VIEW,
        Permission.INCIDENTS_MANAGE,
        Permission.SERVICES_VIEW,
        Permission.SETTINGS_VIEW,
        Permission.SETTINGS_NOTIFICATIONS,
        Permission.SETTINGS_ON_CALL,
        Permission.AUDIT_VIEW,
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
    UserRole.VIEWER: {
        Permission.DASHBOARD_VIEW,
        Permission.ALERTS_VIEW,
        Permission.INCIDENTS_VIEW,
        Permission.CHANGES_VIEW,
        Permission.SERVICES_VIEW,
    },
}

ROLE_LANDING_PAGES: dict[UserRole, str] = {
    UserRole.ADMIN: "/",
    UserRole.ENGINEER: "/alerts",
    UserRole.MANAGER: "/",
    UserRole.NOC_ANALYST: "/alerts",
    UserRole.INCIDENT_MANAGER: "/incidents",
    UserRole.CHANGE_MANAGER: "/changes",
    UserRole.VIEWER: "/",
}

ROLE_NAV_ITEMS: dict[UserRole, list[str]] = {
    UserRole.ADMIN: ["dashboard", "alerts", "incidents", "changes", "services"],
    UserRole.ENGINEER: ["dashboard", "alerts", "incidents", "changes", "services"],
    UserRole.MANAGER: ["dashboard", "alerts", "incidents", "changes", "services"],
    UserRole.NOC_ANALYST: ["dashboard", "alerts", "incidents", "services"],
    UserRole.INCIDENT_MANAGER: ["dashboard", "alerts", "incidents", "services"],
    UserRole.CHANGE_MANAGER: ["dashboard", "changes", "services"],
    UserRole.VIEWER: ["dashboard", "alerts", "incidents", "changes", "services"],
}

ROLE_LABELS: dict[UserRole, str] = {
    UserRole.ADMIN: "Administrator",
    UserRole.ENGINEER: "Engineer",
    UserRole.MANAGER: "Manager",
    UserRole.NOC_ANALYST: "NOC Analyst",
    UserRole.INCIDENT_MANAGER: "Incident Manager",
    UserRole.CHANGE_MANAGER: "Change Manager",
    UserRole.VIEWER: "Viewer",
}

# Alert visibility scope per role
ROLE_ALERT_SCOPE: dict[UserRole, str] = {
    UserRole.ADMIN: "all",
    UserRole.ENGINEER: "my_services",
    UserRole.MANAGER: "critical_only",
    UserRole.NOC_ANALYST: "all",
    UserRole.INCIDENT_MANAGER: "all",
    UserRole.CHANGE_MANAGER: "none",
    UserRole.VIEWER: "all",
}


def get_permissions(role: UserRole) -> set[str]:
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(role: UserRole, permission: str) -> bool:
    return permission in get_permissions(role)


def get_role_config(role: UserRole) -> dict:
    return {
        "role": role.value,
        "role_label": ROLE_LABELS.get(role, role.value),
        "permissions": sorted(get_permissions(role)),
        "landing_page": ROLE_LANDING_PAGES.get(role, "/"),
        "nav_items": ROLE_NAV_ITEMS.get(role, []),
        "alert_scope": ROLE_ALERT_SCOPE.get(role, "all"),
    }


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
