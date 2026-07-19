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
import { getStoredToken } from '@/context/AuthContext';

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
};
