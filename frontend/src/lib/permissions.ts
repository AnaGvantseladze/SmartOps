export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_EXECUTIVE: 'dashboard:executive',
  DASHBOARD_MANAGE: 'dashboard:manage',
  ALERTS_VIEW: 'alerts:view',
  ALERTS_MANAGE: 'alerts:manage',
  INCIDENTS_VIEW: 'incidents:view',
  INCIDENTS_MANAGE: 'incidents:manage',
  INCIDENTS_COMMAND: 'incidents:command',
  CHANGES_VIEW: 'changes:view',
  CHANGES_SUBMIT: 'changes:submit',
  CHANGES_APPROVE: 'changes:approve',
  CHANGES_MANAGE: 'changes:manage',
  SERVICES_VIEW: 'services:view',
  SERVICES_MANAGE: 'services:manage',
  SYSTEM_CONFIG: 'system:config',
  INTEGRATIONS_MANAGE: 'integrations:manage',
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_NOTIFICATIONS: 'settings:notifications',
  SETTINGS_ON_CALL: 'settings:on_call',
  SETTINGS_ADMIN: 'settings:admin',
  SCHEDULES_MANAGE: 'schedules:manage',
  USERS_MANAGE: 'users:manage',
  TEAMS_MANAGE: 'teams:manage',
  AUDIT_VIEW: 'audit:view',
  EXPORT_DATA: 'export:data',
  ALERT_RULES_MANAGE: 'alert_rules:manage',
  NOTIFICATION_CHANNELS_MANAGE: 'notifications:channels',
  SEVERITY_MANAGE: 'severity:manage',
  CATEGORIES_MANAGE: 'categories:manage',
  PERMISSIONS_MANAGE: 'permissions:manage',
  BACKUP_RESTORE: 'backup:restore',
  AUTH_CONFIG: 'auth:config',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const NAV_PERMISSIONS: Record<string, Permission> = {
  dashboard: PERMISSIONS.DASHBOARD_VIEW,
  alerts: PERMISSIONS.ALERTS_VIEW,
  incidents: PERMISSIONS.INCIDENTS_VIEW,
  changes: PERMISSIONS.CHANGES_VIEW,
  services: PERMISSIONS.SERVICES_VIEW,
  administration: PERMISSIONS.USERS_MANAGE,
  settings: PERMISSIONS.SETTINGS_VIEW,
};

export const ROUTE_PERMISSIONS: Record<string, Permission | Permission[]> = {
  '/': PERMISSIONS.DASHBOARD_VIEW,
  '/alerts': PERMISSIONS.ALERTS_VIEW,
  '/incidents': PERMISSIONS.INCIDENTS_VIEW,
  '/changes': PERMISSIONS.CHANGES_VIEW,
  '/services': PERMISSIONS.SERVICES_VIEW,
  '/settings': PERMISSIONS.SETTINGS_VIEW,
  '/settings/admin': PERMISSIONS.USERS_MANAGE,
  '/settings/users-teams': PERMISSIONS.USERS_MANAGE,
  '/settings/system': PERMISSIONS.SYSTEM_CONFIG,
  '/settings/dashboard-config': PERMISSIONS.DASHBOARD_MANAGE,
  '/settings/notifications': PERMISSIONS.SETTINGS_NOTIFICATIONS,
  '/settings/on-call': PERMISSIONS.SETTINGS_ON_CALL,
  '/settings/audit': PERMISSIONS.AUDIT_VIEW,
  '/settings/export': PERMISSIONS.EXPORT_DATA,
  '/settings/webhooks': PERMISSIONS.INTEGRATIONS_MANAGE,
  '/settings/platform': PERMISSIONS.SYSTEM_CONFIG,
  '/settings/permissions': PERMISSIONS.PERMISSIONS_MANAGE,
};

export const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrator',
  engineer: 'SRE Engineer',
  manager: 'Manager',
  change_manager: 'Change Manager',
};

export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}

export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  return required.some((p) => permissions.includes(p));
}

export function canAccessRoute(permissions: string[], path: string): boolean {
  const required = ROUTE_PERMISSIONS[path];
  if (!required) return true;
  if (Array.isArray(required)) return hasAnyPermission(permissions, required);
  return hasPermission(permissions, required);
}

export function canNav(permissions: string[], navItems: string[], item: string): boolean {
  if (navItems.length > 0) return navItems.includes(item);
  const perm = NAV_PERMISSIONS[item];
  return perm ? hasPermission(permissions, perm) : false;
}

export function isAdmin(permissions: string[]): boolean {
  return hasPermission(permissions, PERMISSIONS.USERS_MANAGE);
}
