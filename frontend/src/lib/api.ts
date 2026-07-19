import { getStoredToken } from '@/context/AuthContext';
import type {
  AISuggestion,
  Alert,
  Change,
  DashboardStats,
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
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    fetchJson<{ access_token: string; user: UserProfile; landing_page: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => fetchJson<UserProfile>('/auth/me'),
  getDashboardStats: () => fetchJson<DashboardStats>('/dashboard/stats'),
  getFreezeBanner: () => fetchJson<FreezeBanner>('/dashboard/freeze'),
  getAlerts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJson<Alert[]>(`/alerts${qs}`);
  },
  getAlert: (id: number) => fetchJson<Alert>(`/alerts/${id}`),
  acknowledgeAlert: (id: number) =>
    fetchJson<Alert>(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  updateAlert: (id: number, data: Partial<Alert>) =>
    fetchJson<Alert>(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getIncidents: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJson<Incident[]>(`/incidents${qs}`);
  },
  getIncident: (id: number) => fetchJson<Incident>(`/incidents/${id}`),
  updateIncident: (id: number, data: Partial<Incident>) =>
    fetchJson<Incident>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getChanges: () => fetchJson<Change[]>('/changes'),
  getChange: (id: number) => fetchJson<Change>(`/changes/${id}`),
  getServices: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchJson<Service[]>(`/services${qs}`);
  },
  getService: (id: number) => fetchJson<Service>(`/services/${id}`),
  getAISuggestions: (contextType: string, contextId?: number) => {
    const params = new URLSearchParams({ context_type: contextType });
    if (contextId) params.set('context_id', String(contextId));
    return fetchJson<AISuggestion[]>(`/ai/suggestions?${params}`);
  },
  getNotificationPolicies: () => fetchJson<NotificationPolicy[]>('/notification-policies'),
  getEffectiveNotificationPolicies: () => fetchJson<NotificationPolicy[]>('/notification-policies/effective'),
  getNotificationLog: () => fetchJson<NotificationLog[]>('/notification-log'),
  testNotification: () => fetchJson<{ status: string; message: string }>('/notification-policies/test', { method: 'POST' }),
  getOnCallSchedules: () => fetchJson<OnCallSchedule[]>('/on-call/schedules'),
  getCurrentOnCall: () => fetchJson<CurrentOnCall[]>('/on-call/current'),
  getEscalationPolicies: () => fetchJson<EscalationPolicy[]>('/escalation-policies'),
  getAdminUsers: () => fetchJson<AdminUser[]>('/admin/users'),
  createAdminUser: (data: { name: string; email: string; password: string; role: string; team_id?: number }) =>
    fetchJson<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  getAdminTeams: () => fetchJson<AdminTeam[]>('/admin/teams'),
  getAuditLogs: () => fetchJson<AuditLogEntry[]>('/admin/audit-logs'),
  getIntegrations: () => fetchJson<Integration[]>('/admin/integrations'),
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
};
