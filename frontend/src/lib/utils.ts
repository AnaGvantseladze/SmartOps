import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import type { AlertPriority, ChangeRisk, ChangeStatus, IncidentSeverity, IncidentStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDateTime(date: string) {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function statusLabel(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function priorityBadge(priority: AlertPriority | IncidentSeverity) {
  const map: Record<string, string> = {
    P0: 'bg-red-50 text-red-700 border-red-200',
    P1: 'bg-red-50 text-red-700 border-red-200',
    P2: 'bg-amber-50 text-amber-700 border-amber-200',
    P3: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    P4: 'bg-slate-50 text-slate-600 border-slate-200',
    P5: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  return map[priority] ?? map.P4;
}

export function changeStatusColor(status: ChangeStatus) {
  const map: Record<ChangeStatus, string> = {
    submitted: 'text-slate-600',
    reviewing: 'text-blue-600',
    approved: 'text-green-600',
    scheduled: 'text-cyan-600',
    in_progress: 'text-amber-600',
    completed: 'text-green-700',
    rolled_back: 'text-orange-600',
    failed: 'text-red-600',
    rejected: 'text-red-700',
  };
  return map[status] ?? 'text-slate-600';
}

export function changeStatusBadge(status: ChangeStatus) {
  const map: Record<ChangeStatus, string> = {
    submitted: 'bg-slate-50 text-slate-600 border-slate-200',
    reviewing: 'bg-blue-50 text-blue-600 border-blue-200',
    approved: 'bg-green-50 text-green-600 border-green-200',
    scheduled: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    in_progress: 'bg-amber-50 text-amber-600 border-amber-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    rolled_back: 'bg-orange-50 text-orange-600 border-orange-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };
  return map[status] ?? map.submitted;
}

export function riskColor(risk: ChangeRisk) {
  const map: Record<ChangeRisk, string> = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600',
  };
  return map[risk];
}

export function riskBadge(risk: ChangeRisk) {
  const map: Record<ChangeRisk, string> = {
    low: 'bg-green-50 text-green-700 border-green-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
  };
  return map[risk];
}

export const incidentColumns: { status: IncidentStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'pending_teams', label: 'Pending Teams' },
  { status: 'closed', label: 'Closed' },
];

export function tierLabel(tier: number) {
  const labels: Record<number, string> = {
    1: 'Business',
    2: 'Software',
    3: 'Microservice',
  };
  return labels[tier] ?? `Tier ${tier}`;
}

export function healthColor(score: number) {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
}

export function healthBadge(score: number) {
  if (score >= 90) return 'bg-green-50 text-green-700 border-green-200';
  if (score >= 70) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

export function statusBadge(status: string) {
  const map: Record<string, string> = {
    triggered: 'bg-red-50 text-red-700 border-red-200',
    acknowledged: 'bg-blue-50 text-blue-700 border-blue-200',
    snoozed: 'bg-purple-50 text-purple-700 border-purple-200',
    resolved: 'bg-green-50 text-green-700 border-green-200',
    open: 'bg-red-50 text-red-700 border-red-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    pending_teams: 'bg-orange-50 text-orange-700 border-orange-200',
    closed: 'bg-slate-50 text-slate-600 border-slate-200',
    connected: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return map[status] ?? 'bg-slate-50 text-slate-600 border-slate-200';
}
