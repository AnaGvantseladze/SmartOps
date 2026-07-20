import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, AlertCircle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToastContext } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { PERMISSIONS } from '@/lib/permissions';
import { changeStatusBadge, cn, riskBadge, statusLabel, timeAgo } from '@/lib/utils';
import type { Change, ChangeStatus, ChangeType } from '@/types';

const pipelineSteps: ChangeStatus[] = ['submitted', 'reviewing', 'approved', 'scheduled', 'completed'];
const CHANGE_TYPES: ChangeType[] = ['standard', 'normal', 'emergency', 'custom'];

export function ChangesPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const canCreate = can(PERMISSIONS.CHANGES_SUBMIT) || can(PERMISSIONS.CHANGES_MANAGE);
  const canApprove = can(PERMISSIONS.CHANGES_APPROVE);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: changes = [], isLoading } = useQuery({
    queryKey: ['changes'],
    queryFn: api.getChanges,
  });

  const { data: freeze } = useQuery({
    queryKey: ['freeze-banner'],
    queryFn: api.getFreezeBanner,
  });

  const createChange = useMutation({
    mutationFn: api.createChange,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Change request submitted');
      setShowCreateForm(false);
    },
    onError: (error: Error) => toast.error('Failed to submit change request', error.message),
  });

  useEffect(() => {
    if (!showCreateForm) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !createChange.isPending) setShowCreateForm(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showCreateForm, createChange.isPending]);

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
          <button type="button" className="btn-secondary">
            <Calendar className="h-4 w-4" /> Calendar View
          </button>
          {canCreate && (
            <button type="button" className="btn-primary" onClick={() => setShowCreateForm(true)}>
              + New Request
            </button>
          )}
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

      {showCreateForm && (
        <NewChangeRequestModal
          isSubmitting={createChange.isPending}
          onClose={() => setShowCreateForm(false)}
          onSubmit={(data) => createChange.mutate(data)}
        />
      )}
    </div>
  );
}

function NewChangeRequestModal({
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    change_type: string;
    service_id?: number;
    implementation_plan?: string;
    rollback_plan?: string;
    potential_business_impact?: string;
    affected_scope?: string;
    expected_downtime?: string;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [changeType, setChangeType] = useState<ChangeType>('standard');
  const [serviceId, setServiceId] = useState('');
  const [potentialBusinessImpact, setPotentialBusinessImpact] = useState('');
  const [affectedScope, setAffectedScope] = useState('');
  const [expectedDowntime, setExpectedDowntime] = useState('');
  const [implementationPlan, setImplementationPlan] = useState('');
  const [rollbackPlan, setRollbackPlan] = useState('');

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.getServices(),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onSubmit({
      title: trimmedTitle,
      description: description.trim() || undefined,
      change_type: changeType,
      service_id: serviceId ? Number(serviceId) : undefined,
      potential_business_impact: potentialBusinessImpact.trim() || undefined,
      affected_scope: affectedScope.trim() || undefined,
      expected_downtime: expectedDowntime.trim() || undefined,
      implementation_plan: implementationPlan.trim() || undefined,
      rollback_plan: rollbackPlan.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30"
        aria-label="Close new change request form"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">New Change Request</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-2 py-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="change-title" className="mb-1 block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                id="change-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Brief summary of the change"
                className="input w-full"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="change-description" className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="change-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is changing and why?"
                rows={3}
                className="input w-full resize-y"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="change-type" className="mb-1 block text-sm font-medium text-slate-700">
                  Type
                </label>
                <select
                  id="change-type"
                  value={changeType}
                  onChange={(event) => setChangeType(event.target.value as ChangeType)}
                  className="input w-full"
                  disabled={isSubmitting}
                >
                  {CHANGE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {statusLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="change-service" className="mb-1 block text-sm font-medium text-slate-700">
                  Service
                </label>
                <select
                  id="change-service"
                  value={serviceId}
                  onChange={(event) => setServiceId(event.target.value)}
                  className="input w-full"
                  disabled={isSubmitting}
                >
                  <option value="">No service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Potential Impact</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="change-business-impact" className="mb-1 block text-sm font-medium text-slate-700">
                    Business impact
                  </label>
                  <textarea
                    id="change-business-impact"
                    value={potentialBusinessImpact}
                    onChange={(event) => setPotentialBusinessImpact(event.target.value)}
                    placeholder="What business outcomes could be affected? e.g. order processing delays, revenue loss..."
                    rows={3}
                    className="input w-full resize-y bg-white"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="change-affected-scope" className="mb-1 block text-sm font-medium text-slate-700">
                    Affected users / systems
                  </label>
                  <input
                    id="change-affected-scope"
                    type="text"
                    value={affectedScope}
                    onChange={(event) => setAffectedScope(event.target.value)}
                    placeholder="e.g. EU customers, mobile app users, payment gateway"
                    className="input w-full bg-white"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="change-expected-downtime" className="mb-1 block text-sm font-medium text-slate-700">
                    Expected downtime
                  </label>
                  <input
                    id="change-expected-downtime"
                    type="text"
                    value={expectedDowntime}
                    onChange={(event) => setExpectedDowntime(event.target.value)}
                    placeholder="e.g. None, 5 minutes, up to 30 minutes during migration"
                    className="input w-full bg-white"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="change-implementation" className="mb-1 block text-sm font-medium text-slate-700">
                Implementation plan
              </label>
              <textarea
                id="change-implementation"
                value={implementationPlan}
                onChange={(event) => setImplementationPlan(event.target.value)}
                placeholder="Steps to implement this change"
                rows={3}
                className="input w-full resize-y"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="change-rollback" className="mb-1 block text-sm font-medium text-slate-700">
                Rollback plan
              </label>
              <textarea
                id="change-rollback"
                value={rollbackPlan}
                onChange={(event) => setRollbackPlan(event.target.value)}
                placeholder="How to roll back if something goes wrong"
                rows={3}
                className="input w-full resize-y"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={
                isSubmitting ||
                !title.trim() ||
                !potentialBusinessImpact.trim() ||
                !affectedScope.trim() ||
                !expectedDowntime.trim()
              }
            >
              Submit request
            </button>
          </div>
        </form>
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
