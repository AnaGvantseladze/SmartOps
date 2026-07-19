import { useQuery } from '@tanstack/react-query';
import { Calendar, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { changeStatusColor, riskColor, statusLabel, timeAgo } from '@/lib/utils';
import type { Change, ChangeStatus } from '@/types';

const pipelineSteps: ChangeStatus[] = ['submitted', 'reviewing', 'approved', 'scheduled', 'completed'];

export function ChangesPage() {
  const { data: changes = [], isLoading } = useQuery({
    queryKey: ['changes'],
    queryFn: api.getChanges,
  });

  const { data: freeze } = useQuery({
    queryKey: ['freeze-banner'],
    queryFn: api.getFreezeBanner,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['ai-suggestions', 'change'],
    queryFn: () => api.getAISuggestions('change'),
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading changes...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Change Management</h1>
          <p className="text-slate-400">Review, approve, and track changes</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">
            <Calendar className="h-4 w-4" /> Calendar View
          </button>
          <button className="btn-primary">+ New Request</button>
        </div>
      </div>

      {freeze?.title && !freeze.active && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Upcoming freeze: <strong>{freeze.title}</strong>
            {freeze.reason && ` — ${freeze.reason}`}
          </span>
        </div>
      )}

      {freeze?.active && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            FREEZE ACTIVE: <strong>{freeze.title}</strong>
            {freeze.reason && ` — ${freeze.reason}`}
          </span>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ops-border bg-ops-bg text-left text-slate-400">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <ChangeRow key={change.id} change={change} />
            ))}
          </tbody>
        </table>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-6 card p-4">
          <h3 className="mb-3 font-semibold text-blue-300">AI Risk Intelligence</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {suggestions.map((s) => (
              <div key={s.id} className="rounded-md bg-ops-bg p-3">
                <div className="font-medium text-white">{s.title}</div>
                <p className="mt-1 text-xs text-slate-400">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChangeRow({ change }: { change: Change }) {
  return (
    <tr className="border-b border-ops-border hover:bg-slate-800/30">
      <td className="px-4 py-3 font-mono text-slate-400">CHG-{change.id}</td>
      <td className="px-4 py-3 font-medium text-white">{change.title}</td>
      <td className="px-4 py-3 capitalize text-slate-400">{change.change_type}</td>
      <td className="px-4 py-3">
        <span className={riskColor(change.risk)}>
          {change.risk.toUpperCase()} ({change.risk_score}%)
        </span>
      </td>
      <td className={`px-4 py-3 capitalize ${changeStatusColor(change.status)}`}>
        {statusLabel(change.status)}
      </td>
      <td className="px-4 py-3 text-slate-400">{change.service?.name ?? '—'}</td>
      <td className="px-4 py-3 text-slate-500">{timeAgo(change.created_at)}</td>
    </tr>
  );
}

export function ChangePipeline({ status }: { status: ChangeStatus }) {
  const currentIdx = pipelineSteps.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {pipelineSteps.map((step, idx) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={`h-2 w-2 rounded-full ${
              idx <= currentIdx ? 'bg-ops-accent' : 'bg-slate-700'
            }`}
          />
          {idx < pipelineSteps.length - 1 && (
            <div className={`h-0.5 w-6 ${idx < currentIdx ? 'bg-ops-accent' : 'bg-slate-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
