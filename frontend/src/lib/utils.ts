import { clsx, type ClassValue } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import type { AlertPriority, ChangeRisk, ChangeStatus, IncidentSeverity, IncidentStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

const priorityColors: Record<AlertPriority, string> = {
  P1: 'bg-red-500/20 text-red-400 border-red-500/30',
  P2: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  P3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  P4: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  P5: 'bg-slate-600/20 text-slate-500 border-slate-600/30',
};

export function priorityBadge(priority: AlertPriority | IncidentSeverity) {
  return priorityColors[priority as AlertPriority] ?? priorityColors.P4;
}

export function statusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const changeStatusColors: Record<ChangeStatus, string> = {
  submitted: 'text-slate-400',
  reviewing: 'text-blue-400',
  approved: 'text-green-400',
  scheduled: 'text-cyan-400',
  in_progress: 'text-amber-400',
  completed: 'text-green-500',
  rolled_back: 'text-orange-400',
  failed: 'text-red-400',
  rejected: 'text-red-500',
};

export function changeStatusColor(status: ChangeStatus) {
  return changeStatusColors[status] ?? 'text-slate-400';
}

const riskColors: Record<ChangeRisk, string> = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

export function riskColor(risk: ChangeRisk) {
  return riskColors[risk];
}

export const incidentColumns: { status: IncidentStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'pir_pending', label: 'PIR Pending' },
  { status: 'action_items_pending', label: 'Action Items' },
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
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  return 'text-red-400';
}
