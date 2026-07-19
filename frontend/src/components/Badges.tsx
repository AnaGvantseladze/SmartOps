import { cn, priorityBadge, statusBadge, statusLabel } from '@/lib/utils';
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
  return (
    <span className={cn('badge border', statusBadge(status), className)}>
      {statusLabel(status)}
    </span>
  );
}
