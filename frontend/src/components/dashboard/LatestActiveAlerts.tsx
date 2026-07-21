import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, ArrowRight, Circle, Info } from 'lucide-react';
import { PriorityBadge } from '@/components/Badges';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import type { Alert, AlertPriority, AlertStatus } from '@/types';

const ACTIVE_STATUSES: AlertStatus[] = ['triggered', 'acknowledged', 'snoozed'];

const SEVERITY_ICON: Record<
  AlertPriority,
  { icon: React.ElementType; className: string; label: string }
> = {
  P1: { icon: AlertTriangle, className: 'text-red-500', label: 'Critical' },
  P2: { icon: AlertTriangle, className: 'text-orange-500', label: 'High' },
  P3: { icon: AlertCircle, className: 'text-yellow-500', label: 'Medium' },
  P4: { icon: Info, className: 'text-blue-500', label: 'Low' },
  P5: { icon: Circle, className: 'text-slate-400', label: 'Info' },
};

function AlertSeverityIcon({ priority }: { priority: AlertPriority }) {
  const config = SEVERITY_ICON[priority];
  const Icon = config.icon;

  return (
    <span
      className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800', config.className)}
      title={config.label}
      aria-label={`${config.label} severity`}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

function LatestActiveAlertsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LatestActiveAlerts() {
  const navigate = useNavigate();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', 'latest-active'],
    queryFn: () => api.getAlerts({ status: ACTIVE_STATUSES }),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const latestAlerts = alerts.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div>
          <CardTitle>Latest Active Alerts</CardTitle>
          <CardDescription>Most recent alerts requiring attention</CardDescription>
        </div>
        <button
          type="button"
          onClick={() => navigate('/alerts')}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-300"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <LatestActiveAlertsSkeleton />
        ) : latestAlerts.length === 0 ? (
          <EmptyState title="No active alerts" message="All alerts are resolved. Nothing needs attention right now." />
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12">
                    <span className="sr-only">Severity</span>
                  </th>
                  <th>Alert Name</th>
                  <th className="hidden sm:table-cell">Source</th>
                  <th className="whitespace-nowrap">Time</th>
                  <th className="whitespace-nowrap">Priority</th>
                </tr>
              </thead>
              <tbody>
                {latestAlerts.map((alert: Alert) => (
                  <tr
                    key={alert.id}
                    onClick={() => navigate(`/alerts?alertId=${alert.id}`)}
                    className="cursor-pointer"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/alerts?alertId=${alert.id}`);
                      }
                    }}
                  >
                    <td>
                      <AlertSeverityIcon priority={alert.priority} />
                    </td>
                    <td>
                      <div className="max-w-[220px] truncate font-medium text-slate-900 dark:text-slate-100 sm:max-w-xs lg:max-w-md">
                        {alert.title}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400 sm:hidden">
                        {alert.source}
                      </div>
                    </td>
                    <td className="hidden whitespace-nowrap text-slate-600 dark:text-slate-400 sm:table-cell">
                      {alert.source}
                    </td>
                    <td className="whitespace-nowrap text-slate-600 dark:text-slate-400" title={formatDateTime(alert.created_at)}>
                      {timeAgo(alert.created_at)}
                    </td>
                    <td>
                      <PriorityBadge priority={alert.priority} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
