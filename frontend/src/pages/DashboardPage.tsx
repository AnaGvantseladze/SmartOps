import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  FileDown,
  GitPullRequest,
  ShieldCheck,
  Siren,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { PageHeaderSkeleton, StatCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { AlertsTrendChart } from '@/components/dashboard/AlertsTrendChart';
import { AlertsByPriorityDonut } from '@/components/dashboard/AlertsByPriorityDonut';
import type { DashboardPeriod } from '@/types';

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'day', label: '24h' },
  { value: 'week', label: '7d' },
  { value: 'month', label: '30d' },
  { value: 'year', label: '1y' },
];

const SEVERITY_VARIANT: Record<string, 'danger' | 'warning' | 'secondary' | 'outline'> = {
  P1: 'danger',
  P2: 'warning',
  P3: 'warning',
  P4: 'secondary',
  P5: 'outline',
};

function DashboardSkeleton() {
  return (
    <div className="page-container max-w-[1600px]">
      <PageHeaderSkeleton />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Card>
            <CardContent>
              <div className="h-48 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </CardContent>
          </Card>
        </div>
        <div className="xl:col-span-4">
          <Card>
            <CardContent>
              <div className="h-48 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { can } = useAuth();
  const isExecutive = can(PERMISSIONS.DASHBOARD_EXECUTIVE);
  const canExport = can(PERMISSIONS.EXPORT_DATA);
  const [period, setPeriod] = useState<DashboardPeriod>('week');

  const { data: stats, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-stats', period],
    queryFn: () => api.getDashboardStats(period),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  if (isLoading || !stats) {
    return <DashboardSkeleton />;
  }

  const p1p2 = (stats.alerts_by_priority.P1 ?? 0) + (stats.alerts_by_priority.P2 ?? 0);
  const maxResolved = Math.max(...stats.alerts_resolved_by_engineer.map((row) => row.count), 1);
  const openIncidents = Object.values(stats.incidents_by_severity).reduce((sum, count) => sum + count, 0);
  const periodLabel = PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? period;
  const lastUpdated = new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page-container max-w-[1600px]">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </Badge>
            <Badge variant="outline">Updated {lastUpdated}</Badge>
            <Badge variant="outline">{periodLabel} window</Badge>
          </div>
          <div>
            <h1 className="page-title">{isExecutive ? 'Executive Dashboard' : 'Operations Dashboard'}</h1>
            <p className="page-subtitle">
              {isExecutive
                ? 'Organization-wide health, SLA posture, and operational KPIs'
                : 'Real-time signal across alerts, incidents, changes, and team readiness'}
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                period === option.value
                  ? 'bg-brand-900 text-white shadow-sm dark:bg-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <AlertsTrendChart data={stats.alerts_trend} />

          <AlertsByPriorityDonut alertsByPriority={stats.alerts_by_priority} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Resolved by Engineer</CardTitle>
                <CardDescription>Alert resolution throughput by assignee</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {stats.alerts_resolved_by_engineer.length === 0 ? (
                  <EmptyState title="No resolved alerts" message="No alerts were resolved in this time range." />
                ) : (
                  <div className="space-y-4">
                    {stats.alerts_resolved_by_engineer.map((row) => (
                      <div key={row.engineer_id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                            {row.engineer_name}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                            {row.count}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-brand-600 dark:bg-brand-500"
                            style={{ width: `${Math.min(100, (row.count / maxResolved) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>Incidents by Severity</CardTitle>
                <CardDescription>{openIncidents} open incidents across severities</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {Object.values(stats.incidents_by_severity).every((c) => c === 0) ? (
                  <EmptyState title="No open incidents" message="No open incidents in this time range." />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(stats.incidents_by_severity)
                      .filter(([, count]) => count > 0)
                      .map(([severity, count]) => (
                        <div
                          key={severity}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50"
                        >
                          <Badge variant={SEVERITY_VARIANT[severity] ?? 'outline'}>{severity}</Badge>
                          <span className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4 xl:col-span-4">
          {isExecutive ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>SLA Compliance</CardTitle>
                  <CardDescription>Service-level posture for the selected period</CardDescription>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <div className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Compliance
                  </div>
                  <div className="mt-1 font-display text-3xl font-semibold text-emerald-800 dark:text-emerald-200">
                    {stats.sla_compliance_percent}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">At risk</div>
                    <div className="mt-1 text-2xl font-semibold text-amber-600">{stats.sla_at_risk}</div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Open over 4 hours</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending approval</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.pending_teams}</div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Awaiting sign-off</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Operational Snapshot</CardTitle>
                <CardDescription>Current workload indicators at a glance</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 pt-0">
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="text-xs text-slate-500">Critical alerts</div>
                  <div className="mt-1 text-xl font-semibold text-red-600">{p1p2}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="text-xs text-slate-500">Open incidents</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{openIncidents}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="text-xs text-slate-500">Pending changes</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{stats.pending_changes}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="text-xs text-slate-500">Team sign-offs</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{stats.pending_teams}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick Navigation</CardTitle>
              <CardDescription>Jump to operational workspaces</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 pt-0">
              {[
                { to: '/alerts', label: 'Alert Console', hint: `${stats.active_alerts} active`, icon: AlertTriangle },
                { to: '/incidents', label: 'Incident Board', hint: `${stats.open_incidents} open`, icon: Siren },
                { to: '/changes', label: 'Change Calendar', hint: `${stats.pending_changes} pending`, icon: GitPullRequest },
                { to: '/services', label: 'Service Catalog', hint: 'Health & ownership', icon: Activity },
              ].map(({ to, label, hint, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-all hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-brand-950 dark:group-hover:text-brand-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-700 dark:group-hover:text-brand-300" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {isExecutive && canExport && (
            <Card>
              <CardHeader>
                <CardTitle>Reports & Export</CardTitle>
                <CardDescription>Download operational datasets for reporting</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  Generate exports for incidents, alerts, changes, and audit activity.
                </p>
                <Link to="/settings/export" className="btn-secondary w-full justify-center">
                  <FileDown className="h-4 w-4" />
                  Export data
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
