import { getStoredToken } from '@/context/AuthContext';
import type {
  Alert,
  Change,
  DashboardStats,
  DashboardPeriod,
  FreezeBanner,
  Incident,
  Service,
  UserProfile,
} from '@/types';
import type {
  CurrentOnCall,
  EscalationPolicy,
  NotificationLog,
  NotificationPolicy,
  OnCallSchedule,
} from '@/types/notifications';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  team_id?: number;
  is_active: boolean;
  team?: { id: number; name: string };
}

export interface AdminTeam {
  id: number;
  name: string;
  description?: string;
  member_count: number;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
  user?: { id: number; name: string; email: string; role: string };
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
}

export interface DashboardConfig {
  refresh_interval_seconds: number;
  default_date_range_days: number;
  tv_rotation_seconds: number;
  show_tier1_only: boolean;
  executive_summary_enabled: boolean;
  shared_with_organization: boolean;
}

export interface AlertRuleConfig {
  id: string;
  name: string;
  source: string;
  condition: string;
  priority: string;
  enabled: boolean;
}

export interface SeverityLevelConfig {
  code: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface CategoryConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface NotificationChannelConfig {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, string>;
}

export interface AuthConfig {
  sso_enabled: boolean;
  sso_provider: string;
  ldap_enabled: boolean;
  ldap_host: string;
  ldap_base_dn: string;
  session_timeout_minutes: number;
  mfa_required: boolean;
}

export interface PlatformConfig {
  alert_rules: AlertRuleConfig[];
  severity_levels: SeverityLevelConfig[];
  categories: CategoryConfig[];
  notification_channels: NotificationChannelConfig[];
  auth_config: AuthConfig;
  last_backup_at?: string;
}

export interface RolePermissionMatrix {
  role: string;
  role_label: string;
  permissions: string[];
}

export interface PermissionCatalogEntry {
  value: string;
  label: string;
  group: string;
}

export interface WebhookIntegration {
  id: number;
  name: string;
  description?: string;
  webhook_secret?: string;
  webhook_url: string;
  is_active: boolean;
  created_at: string;
  last_alert_at?: string;
  alert_count: number;
}

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401 && !url.includes('/auth/')) {
    localStorage.removeItem('opscore_token');
    localStorage.removeItem('opscore_user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') message = body.detail;
      else if (Array.isArray(body?.detail)) message = body.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(', ');
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    fetchJson<{ access_token: string; user: UserProfile; landing_page: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => fetchJson<UserProfile>('/auth/me'),
  getDashboardStats: (period: DashboardPeriod = 'week') =>
    fetchJson<DashboardStats>(`/dashboard/stats?period=${period}`),
  getFreezeBanner: () => fetchJson<FreezeBanner>('/dashboard/freeze'),
  getAssignableUsers: () => fetchJson<UserProfile[]>('/users/assignable'),
  getAlerts: (params?: { status?: string[]; priority?: string[]; service_id?: string }) => {
    const search = new URLSearchParams();
    if (params?.status?.length) {
      params.status.forEach((value) => search.append('status', value));
    }
    if (params?.priority?.length) {
      params.priority.forEach((value) => search.append('priority', value));
    }
    if (params?.service_id) search.set('service_id', params.service_id);
    const qs = search.toString();
    return fetchJson<Alert[]>(`/alerts${qs ? `?${qs}` : ''}`);
  },
  getAlert: (id: number) => fetchJson<Alert>(`/alerts/${id}`),
  acknowledgeAlert: (id: number) =>
    fetchJson<Alert>(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  addAlertNote: (id: number, content: string) =>
    fetchJson<Alert>(`/alerts/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
  createIncidentFromAlert: (alertId: number) =>
    fetchJson<Incident>(`/alerts/${alertId}/incident`, { method: 'POST' }),
  updateAlert: (id: number, data: Partial<Alert>) =>
    fetchJson<Alert>(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getIncidents: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJson<Incident[]>(`/incidents${qs}`);
  },
  getIncident: (id: number) => fetchJson<Incident>(`/incidents/${id}`),
  updateIncident: (id: number, data: Partial<Incident>) =>
    fetchJson<Incident>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createIncidentActionItem: (
    incidentId: number,
    data: { title: string; description?: string; priority?: string },
  ) =>
    fetchJson<Incident>(`/incidents/${incidentId}/action-items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateIncidentActionItem: (
    incidentId: number,
    actionItemId: number,
    data: { title?: string; description?: string; status?: string; priority?: string },
  ) =>
    fetchJson<Incident>(`/incidents/${incidentId}/action-items/${actionItemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getChanges: () => fetchJson<Change[]>('/changes'),
  getChange: (id: number) => fetchJson<Change>(`/changes/${id}`),
  createChange: (data: {
    title: string;
    description?: string;
    change_type: string;
    service_id?: number;
    implementation_plan?: string;
    rollback_plan?: string;
    potential_business_impact?: string;
    affected_scope?: string;
    expected_downtime?: string;
  }) => fetchJson<Change>('/changes', { method: 'POST', body: JSON.stringify(data) }),
  updateChange: (id: number, data: Partial<Change>) =>
    fetchJson<Change>(`/changes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getServices: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJson<Service[]>(`/services${qs}`);
  },
  getService: (id: number) => fetchJson<Service>(`/services/${id}`),
  getNotificationPolicies: () => fetchJson<NotificationPolicy[]>('/notification-policies'),
  getEffectiveNotificationPolicies: () => fetchJson<NotificationPolicy[]>('/notification-policies/effective'),
  getNotificationLog: () => fetchJson<NotificationLog[]>('/notification-log'),
  testNotification: () => fetchJson<{ status: string; message: string }>('/notification-policies/test', { method: 'POST' }),
  updateNotificationRule: (ruleId: number, data: { channels?: string[]; suppress?: boolean }) =>
    fetchJson<import('@/types/notifications').NotificationPolicy>(`/notification-policies/rules/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getOnCallSchedules: () => fetchJson<OnCallSchedule[]>('/on-call/schedules'),
  getCurrentOnCall: () => fetchJson<CurrentOnCall[]>('/on-call/current'),
  createOnCallOverride: (data: {
    schedule_id: number;
    original_user_id: number;
    override_user_id: number;
    start_time: string;
    end_time: string;
    reason?: string;
  }) =>
    fetchJson<import('@/types/notifications').OnCallOverride>('/on-call/overrides', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getEscalationPolicies: () => fetchJson<EscalationPolicy[]>('/escalation-policies'),
  getAdminUsers: () => fetchJson<AdminUser[]>('/admin/users'),
  createAdminUser: (data: { name: string; email: string; password: string; role: string; team_id?: number }) =>
    fetchJson<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminUser: (id: number, data: Partial<{ name: string; role: string; team_id: number; is_active: boolean; password: string }>) =>
    fetchJson<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAdminUser: (id: number) => fetchJson<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  getAdminTeams: () => fetchJson<AdminTeam[]>('/admin/teams'),
  createAdminTeam: (data: { name: string; description?: string }) =>
    fetchJson<AdminTeam>('/admin/teams', { method: 'POST', body: JSON.stringify(data) }),
  getAuditLogs: () => fetchJson<AuditLogEntry[]>('/admin/audit-logs'),
  getIntegrations: () => fetchJson<Integration[]>('/admin/integrations'),
  updateIntegration: (id: string, data: Partial<Pick<Integration, 'status' | 'description'>>) =>
    fetchJson<Integration>(`/admin/integrations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getPlatformConfig: () => fetchJson<PlatformConfig>('/admin/platform-config'),
  updateAlertRules: (rules: AlertRuleConfig[]) =>
    fetchJson<PlatformConfig>('/admin/alert-rules', { method: 'PUT', body: JSON.stringify({ rules }) }),
  updateSeverityLevels: (levels: SeverityLevelConfig[]) =>
    fetchJson<PlatformConfig>('/admin/severity-levels', { method: 'PUT', body: JSON.stringify({ levels }) }),
  updateCategories: (categories: CategoryConfig[]) =>
    fetchJson<PlatformConfig>('/admin/categories', { method: 'PUT', body: JSON.stringify({ categories }) }),
  updateNotificationChannels: (channels: NotificationChannelConfig[]) =>
    fetchJson<PlatformConfig>('/admin/notification-channels', { method: 'PUT', body: JSON.stringify({ channels }) }),
  updateAuthConfig: (data: Partial<AuthConfig>) =>
    fetchJson<AuthConfig>('/admin/auth-config', { method: 'PATCH', body: JSON.stringify(data) }),
  getPermissionsMatrix: () => fetchJson<RolePermissionMatrix[]>('/admin/permissions'),
  getPermissionCatalog: () => fetchJson<PermissionCatalogEntry[]>('/admin/permissions/catalog'),
  updateRolePermissions: (role: string, permissions: string[]) =>
    fetchJson<RolePermissionMatrix>(`/admin/permissions/${role}`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),
  resetRolePermissions: (role: string) =>
    fetchJson<RolePermissionMatrix>(`/admin/permissions/${role}/reset`, { method: 'POST' }),
  backupPlatformConfig: () => fetchJson<{ backed_up_at: string; snapshot: Record<string, unknown> }>('/admin/backup', { method: 'POST' }),
  restorePlatformConfig: (snapshot: Record<string, unknown>) =>
    fetchJson<PlatformConfig>('/admin/restore', { method: 'POST', body: JSON.stringify({ snapshot }) }),
  getDashboardConfig: () => fetchJson<DashboardConfig>('/admin/dashboard-config'),
  updateDashboardConfig: (data: Partial<DashboardConfig>) =>
    fetchJson<DashboardConfig>('/admin/dashboard-config', { method: 'PATCH', body: JSON.stringify(data) }),
  exportData: async (resource: string, format: string) => {
    const token = getStoredToken();
    const res = await fetch('/api/v1/admin/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ resource, format }),
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  },
  getWebhookIntegrations: () => fetchJson<WebhookIntegration[]>('/integrations/webhooks'),
  createWebhookIntegration: (data: { name: string; description?: string; webhook_secret?: string }) =>
    fetchJson<WebhookIntegration>('/integrations/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  updateWebhookIntegration: (id: number, data: Partial<WebhookIntegration>) =>
    fetchJson<WebhookIntegration>(`/integrations/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteWebhookIntegration: (id: number) => fetchJson<void>(`/integrations/webhooks/${id}`, { method: 'DELETE' }),
  testWebhookIntegration: (id: number) =>
    fetchJson<{ status: string; alert_id: number; integration_id: number }>(`/integrations/webhooks/${id}/test`, { method: 'POST' }),
};
