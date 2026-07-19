import type {
  AISuggestion,
  Alert,
  Change,
  DashboardStats,
  FreezeBanner,
  Incident,
  Service,
} from '@/types';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
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
