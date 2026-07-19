import { cn, priorityBadge, statusLabel } from '@/lib/utils';
import type { AlertPriority } from '@/types';

interface PriorityBadgeProps {
  priority: AlertPriority | string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span className={cn('badge border', priorityBadge(priority as AlertPriority), className)}>
      {priority}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    triggered: 'bg-red-500/20 text-red-400',
    acknowledged: 'bg-blue-500/20 text-blue-400',
    snoozed: 'bg-purple-500/20 text-purple-400',
    resolved: 'bg-green-500/20 text-green-400',
    open: 'bg-red-500/20 text-red-400',
    in_progress: 'bg-amber-500/20 text-amber-400',
    pir_pending: 'bg-orange-500/20 text-orange-400',
    action_items_pending: 'bg-yellow-500/20 text-yellow-400',
    closed: 'bg-slate-500/20 text-slate-400',
  };
  return (
    <span className={cn('badge', colors[status] ?? 'bg-slate-500/20 text-slate-400', className)}>
      {statusLabel(status)}
    </span>
  );
}
