import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Siren, GitPullRequest, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, healthColor } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { PageHeaderSkeleton, StatCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import type { DashboardPeriod } from '@/types';

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'day', label: 'Last day' },
  { value: 'week', label: 'Last week' },
  { value: 'month', label: 'Last month' },
  { value: 'year', label: 'Last year' },
];

const PRIORITY_ORDER = ['P1', 'P2', 'P3', 'P4', 'P5'];

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="stat-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <Icon className={cn('h-5 w-5', color ?? 'text-slate-400')} />
      </div>
      <div className="stat-value">{value}</div>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { can } = useAuth();
  const isExecutive = can(PERMISSIONS.DASHBOARD_EXECUTIVE);
  const [period, setPeriod] = useState<DashboardPeriod>('week');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', period],
    queryFn: () => api.getDashboardStats(period),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  if (isLoading || !stats) {
    return (
      <div className="page-container">
        <PageHeaderSkeleton />
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const p1p2 = (stats.alerts_by_priority.P1 ?? 0) + (stats.alerts_by_priority.P2 ?? 0);
  const totalAlertsInPeriod = Object.values(stats.alerts_by_priority).reduce((sum, count) => sum + count, 0);
  const maxResolved = Math.max(...stats.alerts_resolved_by_engineer.map((row) => row.count), 1);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="page-title">{isExecutive ? 'Executive Dashboard' : 'Operations Dashboard'}</h1>
            <p className="page-subtitle">
              {isExecutive ? 'Organizational health and KPI overview' : 'Operational health overview — real-time'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  period === option.value
                    ? 'bg-brand-900 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Active Alerts"
          value={stats.active_alerts}
          icon={AlertTriangle}
          sub={`${p1p2} P1/P2 critical`}
          color="text-red-600"
        />
        <StatCard
          label="Open Incidents"
          value={stats.open_incidents}
          icon={Siren}
          sub={`${stats.incidents_by_severity.P1 ?? 0} P1 active`}
          color="text-amber-600"
        />
        <StatCard
          label="Pending Changes"
          value={stats.pending_changes}
          icon={GitPullRequest}
          color="text-blue-600"
        />
        <StatCard
          label="Pending Teams"
          value={stats.pending_teams}
          icon={Clock}
          color="text-orange-600"
        />
        <StatCard
          label="Open Action Items"
          value={stats.action_items_open}
          icon={CheckCircle2}
          color="text-yellow-600"
        />
        <StatCard
          label="Tier 1 Health"
          value={`${stats.tier1_health_avg}%`}
          icon={Activity}
          sub={stats.recent_mttr_hours ? `MTTR: ${stats.recent_mttr_hours}h` : undefined}
          color={healthColor(stats.tier1_health_avg)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title mb-4">Alerts by Priority</h2>
          <div className="space-y-3">
            {totalAlertsInPeriod === 0 ? (
              <EmptyState title="No alerts" message="No alerts were created in this time range." />
            ) : (
              PRIORITY_ORDER.map((priority) => {
                const count = stats.alerts_by_priority[priority] ?? 0;
                return (
                  <div key={priority} className="flex items-center gap-3">
                    <span className="w-8 text-sm font-semibold text-slate-700">{priority}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          priority === 'P1' ? 'bg-red-600' : priority === 'P2' ? 'bg-amber-500' : 'bg-slate-400'
                        )}
                        style={{ width: `${Math.min(100, (count / totalAlertsInPeriod) * 100)}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-sm font-medium text-slate-700">{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-4">Alerts Resolved by Engineer</h2>
          <div className="space-y-3">
            {stats.alerts_resolved_by_engineer.length === 0 ? (
              <EmptyState title="No resolved alerts" message="No alerts were resolved in this time range." />
            ) : (
              stats.alerts_resolved_by_engineer.map((row) => (
                <div key={row.engineer_id} className="flex items-center gap-3">
                  <span className="w-28 truncate text-sm font-medium text-slate-700">{row.engineer_name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{ width: `${Math.min(100, (row.count / maxResolved) * 100)}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-semibold text-slate-900">{row.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="card p-5">
          <h2 className="section-title mb-4">Incidents by Severity</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(stats.incidents_by_severity)
              .filter(([, count]) => count > 0)
              .map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <span className="font-medium text-slate-700">{severity}</span>
                  <span className="text-lg font-semibold text-slate-900">{count}</span>
                </div>
              ))}
            {Object.values(stats.incidents_by_severity).every((c) => c === 0) && (
              <p className="text-sm text-slate-500">No open incidents in this time range</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
