import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Siren, GitPullRequest, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, healthBadge, healthColor } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';

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
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.getDashboardStats,
    refetchInterval: 30000,
  });

  if (isLoading || !stats) {
    return <div className="page-container text-slate-500">Loading dashboard...</div>;
  }

  const p1p2 = (stats.alerts_by_priority.P1 ?? 0) + (stats.alerts_by_priority.P2 ?? 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{isExecutive ? 'Executive Dashboard' : 'Operations Dashboard'}</h1>
        <p className="page-subtitle">
          {isExecutive ? 'Organizational health and KPI overview' : 'Operational health overview — real-time'}
        </p>
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
          label="PIR Pending"
          value={stats.pir_pending}
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
            {Object.entries(stats.alerts_by_priority).map(([priority, count]) => (
              <div key={priority} className="flex items-center gap-3">
                <span className="w-8 text-sm font-semibold text-slate-700">{priority}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      priority === 'P1' ? 'bg-red-600' : priority === 'P2' ? 'bg-amber-500' : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.min(100, (count / Math.max(stats.active_alerts, 1)) * 100)}%` }}
                  />
                </div>
                <span className="w-6 text-right text-sm font-medium text-slate-700">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-4">Incidents by Severity</h2>
          <div className="space-y-2">
            {Object.entries(stats.incidents_by_severity)
              .filter(([, count]) => count > 0)
              .map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <span className="font-medium text-slate-700">{severity}</span>
                  <span className="text-lg font-semibold text-slate-900">{count}</span>
                </div>
              ))}
            {Object.values(stats.incidents_by_severity).every((c) => c === 0) && (
              <p className="text-sm text-slate-500">No open incidents</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="section-title mb-3">Changes by Status</h2>
          <div className="space-y-2">
            {Object.entries(stats.changes_by_status ?? {}).filter(([,c]) => c > 0).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm capitalize text-slate-700">{status.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-3">Top At-Risk Services</h2>
          {(stats.top_risk_services ?? []).length === 0 && (
            <p className="text-sm text-slate-500">No at-risk services</p>
          )}
          <div className="space-y-3">
            {(stats.top_risk_services ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-500">Tier {s.tier}</div>
                </div>
                <span className={cn('badge border', healthBadge(s.health_score))}>{s.health_score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-3">Open PIRs</h2>
          {(stats.open_pirs ?? []).length === 0 && (
            <p className="text-sm text-slate-500">No open post-incident reviews</p>
          )}
          <div className="space-y-3">
            {(stats.open_pirs ?? []).map((pir) => (
              <div key={pir.id} className="rounded-lg border-l-4 border-orange-500 bg-slate-50 p-3">
                <div className="text-sm font-medium text-slate-900">{pir.title}</div>
                <div className="mt-1 text-xs text-slate-500">Due {timeAgo(pir.pir_due_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(date?: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString();
}
