import { useQuery } from '@tanstack/react-query';
import { Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { PERMISSIONS } from '@/lib/permissions';
import { changeStatusBadge, riskBadge, statusLabel, timeAgo } from '@/lib/utils';
import type { Change, ChangeStatus } from '@/types';

const pipelineSteps: ChangeStatus[] = ['submitted', 'reviewing', 'approved', 'scheduled', 'completed'];

export function ChangesPage() {
  const { can } = useAuth();
  const canSubmit = can(PERMISSIONS.CHANGES_SUBMIT);
  const canApprove = can(PERMISSIONS.CHANGES_APPROVE);
  const { data: changes = [], isLoading } = useQuery({
    queryKey: ['changes'],
    queryFn: api.getChanges,
  });

  const { data: freeze } = useQuery({
    queryKey: ['freeze-banner'],
    queryFn: api.getFreezeBanner,
  });

  if (isLoading) return <div className="page-container text-slate-500">Loading changes...</div>;

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Change Management</h1>
          <p className="page-subtitle">
            {canApprove ? 'Review, approve, and track changes' : 'View and submit change requests'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">
            <Calendar className="h-4 w-4" /> Calendar View
          </button>
          {canSubmit && <button className="btn-primary">+ New Request</button>}
        </div>
      </div>

      {freeze?.title && !freeze.active && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Upcoming freeze: <strong>{freeze.title}</strong>
            {freeze.reason && ` — ${freeze.reason}`}
          </span>
        </div>
      )}

      {freeze?.active && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            FREEZE ACTIVE: <strong>{freeze.title}</strong>
            {freeze.reason && ` — ${freeze.reason}`}
          </span>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Type</th>
              <th>Risk</th>
              <th>Status</th>
              <th>Pipeline</th>
              <th>Service</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <ChangeRow key={change.id} change={change} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChangeRow({ change }: { change: Change }) {
  return (
    <tr>
      <td className="font-mono text-slate-500">CHG-{change.id}</td>
      <td className="font-medium text-slate-900">{change.title}</td>
      <td className="capitalize text-slate-600">{change.change_type}</td>
      <td>
        <span className={cn('badge border', riskBadge(change.risk))}>
          {change.risk.toUpperCase()}
        </span>
      </td>
      <td>
        <span className={cn('badge border', changeStatusBadge(change.status))}>
          {statusLabel(change.status)}
        </span>
      </td>
      <td>
        <ChangePipeline status={change.status} />
      </td>
      <td className="text-slate-600">{change.service?.name ?? '—'}</td>
      <td className="text-slate-500">{timeAgo(change.created_at)}</td>
    </tr>
  );
}

import { cn } from '@/lib/utils';

export function ChangePipeline({ status }: { status: ChangeStatus }) {
  const currentIdx = pipelineSteps.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {pipelineSteps.map((step, idx) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={`h-2 w-2 rounded-full ${
              idx <= currentIdx ? 'bg-brand-600' : 'bg-slate-200'
            }`}
          />
          {idx < pipelineSteps.length - 1 && (
            <div className={`h-0.5 w-6 ${idx < currentIdx ? 'bg-brand-600' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
