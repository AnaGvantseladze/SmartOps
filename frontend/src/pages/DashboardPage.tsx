import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Siren, GitPullRequest, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, healthColor } from '@/lib/utils';

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
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <Icon className={cn('h-5 w-5', color ?? 'text-slate-500')} />
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.getDashboardStats,
    refetchInterval: 30000,
  });

  if (isLoading || !stats) {
    return <div className="p-8 text-slate-400">Loading dashboard...</div>;
  }

  const p1p2 = (stats.alerts_by_priority.P1 ?? 0) + (stats.alerts_by_priority.P2 ?? 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Executive Dashboard</h1>
        <p className="text-slate-400">Operational health overview — real-time</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Active Alerts"
          value={stats.active_alerts}
          icon={AlertTriangle}
          sub={`${p1p2} P1/P2 critical`}
          color="text-red-400"
        />
        <StatCard
          label="Open Incidents"
          value={stats.open_incidents}
          icon={Siren}
          sub={`${stats.incidents_by_severity.P1 ?? 0} P1 active`}
          color="text-amber-400"
        />
        <StatCard
          label="Pending Changes"
          value={stats.pending_changes}
          icon={GitPullRequest}
          color="text-blue-400"
        />
        <StatCard
          label="PIR Pending"
          value={stats.pir_pending}
          icon={Clock}
          color="text-orange-400"
        />
        <StatCard
          label="Open Action Items"
          value={stats.action_items_open}
          icon={CheckCircle2}
          color="text-yellow-400"
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
          <h2 className="mb-4 font-semibold text-white">Alerts by Priority</h2>
          <div className="space-y-2">
            {Object.entries(stats.alerts_by_priority).map(([priority, count]) => (
              <div key={priority} className="flex items-center gap-3">
                <span className="w-8 text-sm font-medium text-slate-400">{priority}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      priority === 'P1' ? 'bg-red-500' : priority === 'P2' ? 'bg-amber-500' : 'bg-slate-600'
                    }`}
                    style={{ width: `${Math.min(100, (count / Math.max(stats.active_alerts, 1)) * 100)}%` }}
                  />
                </div>
                <span className="w-6 text-right text-sm text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-white">Incidents by Severity</h2>
          <div className="space-y-2">
            {Object.entries(stats.incidents_by_severity)
              .filter(([, count]) => count > 0)
              .map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between rounded-md bg-ops-bg px-3 py-2">
                  <span className="font-medium text-slate-300">{severity}</span>
                  <span className="text-lg font-bold text-white">{count}</span>
                </div>
              ))}
            {Object.values(stats.incidents_by_severity).every((c) => c === 0) && (
              <p className="text-sm text-slate-500">No open incidents</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
