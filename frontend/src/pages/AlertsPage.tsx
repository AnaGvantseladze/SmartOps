import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, GitCommit } from 'lucide-react';
import { AISuggestionsPanel } from '@/components/AISuggestionsPanel';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { PERMISSIONS } from '@/lib/permissions';
import { cn, timeAgo } from '@/lib/utils';
import type { Alert, AlertStatus } from '@/types';

const statusFilters: { value: AlertStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'triggered', label: 'Triggered' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'snoozed', label: 'Snoozed' },
  { value: 'resolved', label: 'Resolved' },
];

export function AlertsPage() {
  const { can, alertScope } = useAuth();
  const canManage = can(PERMISSIONS.ALERTS_MANAGE);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn: () => api.getAlerts(statusFilter !== 'all' ? { status: statusFilter } : undefined),
    refetchInterval: 10000,
  });

  const selected = alerts.find((a) => a.id === selectedId) ?? alerts[0];

  const { data: suggestions = [] } = useQuery({
    queryKey: ['ai-suggestions', 'alert', selected?.id],
    queryFn: () => api.getAISuggestions('alert', selected?.id),
    enabled: !!selected,
  });

  const acknowledge = useMutation({
    mutationFn: (id: number) => api.acknowledgeAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  if (isLoading) return <div className="page-container text-slate-500">Loading alerts...</div>;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Alert Console</h1>
            <p className="page-subtitle">Live feed — operations console</p>
          </div>
          {alertScope === 'critical_only' && (
            <span className="badge border bg-amber-50 text-amber-700 border-amber-200">P1/P2 only (Manager)</span>
          )}
          {alertScope === 'my_services' && (
            <span className="badge border bg-blue-50 text-blue-700 border-blue-200">My services only</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-6 py-3">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={statusFilter === f.value ? 'filter-chip-active' : 'filter-chip-inactive'}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden bg-slate-50">
        <div className="w-1/2 overflow-y-auto border-r border-slate-200 bg-white">
          {alerts.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              selected={selected?.id === alert.id}
              onClick={() => setSelectedId(alert.id)}
            />
          ))}
          {alerts.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-500">No alerts match filters</p>
          )}
        </div>

        {selected && (
          <div className="flex w-1/2 flex-col overflow-y-auto">
            <AlertDetail
              alert={selected}
              onAcknowledge={() => acknowledge.mutate(selected.id)}
              isAcknowledging={acknowledge.isPending}
              canManage={canManage}
            />
            <div className="border-t border-slate-200 p-4">
              <AISuggestionsPanel suggestions={suggestions} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert, selected, onClick }: { alert: Alert; selected: boolean; onClick: () => void }) {
  const isP1 = alert.priority === 'P1' && alert.status === 'triggered';
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50',
        selected && 'bg-brand-50',
        isP1 && 'alert-pulse'
      )}
    >
      <PriorityBadge priority={alert.priority} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-slate-900">{alert.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <StatusBadge status={alert.status} />
          <span>{timeAgo(alert.created_at)}</span>
          <span>·</span>
          <span>{alert.source}</span>
          {alert.service && (
            <>
              <span>·</span>
              <span>{alert.service.name}</span>
            </>
          )}
        </div>
      </div>
      {alert.occurrence_count > 1 && (
        <span className="badge border bg-slate-100 text-slate-600">×{alert.occurrence_count}</span>
      )}
    </button>
  );
}

function AlertDetail({
  alert,
  onAcknowledge,
  isAcknowledging,
  canManage,
}: {
  alert: Alert;
  onAcknowledge: () => void;
  isAcknowledging: boolean;
  canManage: boolean;
}) {
  return (
    <div className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <PriorityBadge priority={alert.priority} />
            <StatusBadge status={alert.status} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{alert.title}</h2>
          {alert.description && <p className="mt-1 text-sm text-slate-600">{alert.description}</p>}
        </div>
      </div>

      {alert.service && (
        <div className="card mb-4 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Service Context</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-500">Service:</span> <span className="text-slate-900">{alert.service.name}</span></div>
            <div><span className="text-slate-500">Tier:</span> <span className="text-slate-900">{alert.service.tier}</span></div>
            <div><span className="text-slate-500">Health:</span> <span className="text-slate-900">{alert.service.health_score}%</span></div>
            <div><span className="text-slate-500">Source:</span> <span className="text-slate-900">{alert.source}</span></div>
          </div>
        </div>
      )}

      <div className="card mb-4 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <GitCommit className="h-4 w-4 text-slate-400" /> Enrichment
        </h3>
        <ul className="space-y-1 text-sm text-slate-600">
          <li>• Recent commits in last 24h (GitHub integration)</li>
          <li>• Confluence runbook snippet available</li>
          <li>• 2 change requests in last 72h</li>
          <li>• 3 similar past alerts on this service</li>
        </ul>
      </div>

      {alert.snooze_reason && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-700">
          <Clock className="h-4 w-4" />
          Snoozed: {alert.snooze_reason}
        </div>
      )}

      {canManage && (
        <div className="mb-4 flex flex-wrap gap-2">
          {alert.status === 'triggered' && (
            <button className="btn-primary" onClick={onAcknowledge} disabled={isAcknowledging}>
              Acknowledge
            </button>
          )}
          <button className="btn-secondary">Snooze</button>
          <button className="btn-secondary">Escalate</button>
          <button className="btn-secondary">Create Incident</button>
          <button className="btn-secondary">Resolve</button>
        </div>
      )}

      {alert.timeline.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Timeline</h3>
          <div className="space-y-3">
            {alert.timeline.map((entry) => (
              <div key={entry.id} className="border-l-2 border-slate-200 pl-3">
                <div className="text-xs text-slate-500">{timeAgo(entry.created_at)}</div>
                <div className="text-sm text-slate-700">{entry.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
