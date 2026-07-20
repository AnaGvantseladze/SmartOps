import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, AlertCircle, X, ChevronLeft, ChevronRight, List } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [selectedChangeId, setSelectedChangeId] = useState<number | null>(null);

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

  const updateChange = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Change> }) => api.updateChange(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['changes'] });
      queryClient.setQueryData(['change', updated.id], updated);
      toast.success('Change request updated');
    },
    onError: (error: Error) => toast.error('Failed to update change request', error.message),
  });

  const selectedChange = changes.find((c) => c.id === selectedChangeId);

  useEffect(() => {
    if (!selectedChangeId) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedChangeId(null);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedChangeId]);

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
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setViewMode((mode) => (mode === 'table' ? 'calendar' : 'table'))}
          >
            {viewMode === 'table' ? (
              <>
                <Calendar className="h-4 w-4" /> Calendar View
              </>
            ) : (
              <>
                <List className="h-4 w-4" /> Table View
              </>
            )}
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

      {viewMode === 'calendar' ? (
        <ChangesCalendarView
          changes={changes}
          onSelectChange={setSelectedChangeId}
          selectedChangeId={selectedChangeId}
        />
      ) : (
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
                <ChangeRow
                  key={change.id}
                  change={change}
                  selected={selectedChangeId === change.id}
                  onSelect={() => setSelectedChangeId(change.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedChange && (
        <ChangeDetailPanel
          change={selectedChange}
          canApprove={canApprove}
          isUpdating={updateChange.isPending}
          onClose={() => setSelectedChangeId(null)}
          onUpdate={(data) => updateChange.mutate({ id: selectedChange.id, data })}
        />
      )}

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

function ChangeRow({
  change,
  selected,
  onSelect,
}: {
  change: Change;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      className={cn('cursor-pointer transition-colors hover:bg-slate-50', selected && 'bg-brand-50')}
      onClick={onSelect}
    >
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

const NEXT_STATUS: Partial<Record<ChangeStatus, ChangeStatus>> = {
  submitted: 'reviewing',
  reviewing: 'approved',
  approved: 'scheduled',
  scheduled: 'completed',
};

function ChangeDetailPanel({
  change,
  canApprove,
  isUpdating,
  onClose,
  onUpdate,
}: {
  change: Change;
  canApprove: boolean;
  isUpdating: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<Change>) => void;
}) {
  const nextStatus = NEXT_STATUS[change.status];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30"
        aria-label="Close change details"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">CHG-{change.id}</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-2 py-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={cn('badge border', changeStatusBadge(change.status))}>
              {statusLabel(change.status)}
            </span>
            <span className={cn('badge border', riskBadge(change.risk))}>{change.risk.toUpperCase()}</span>
            <span className="badge border bg-slate-50 text-slate-700 border-slate-200 capitalize">
              {change.change_type}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-slate-900">{change.title}</h3>
          {change.description && <p className="mt-2 text-sm text-slate-600">{change.description}</p>}

          <div className="card mt-4 p-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Potential Impact</h4>
            <dl className="space-y-2 text-sm">
              {change.potential_business_impact && (
                <div>
                  <dt className="text-slate-500">Business impact</dt>
                  <dd className="text-slate-900">{change.potential_business_impact}</dd>
                </div>
              )}
              {change.affected_scope && (
                <div>
                  <dt className="text-slate-500">Affected users / systems</dt>
                  <dd className="text-slate-900">{change.affected_scope}</dd>
                </div>
              )}
              {change.expected_downtime && (
                <div>
                  <dt className="text-slate-500">Expected downtime</dt>
                  <dd className="text-slate-900">{change.expected_downtime}</dd>
                </div>
              )}
            </dl>
          </div>

          {(change.implementation_plan || change.rollback_plan) && (
            <div className="card mt-4 space-y-3 p-4">
              {change.implementation_plan && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Implementation plan</h4>
                  <p className="mt-1 text-sm text-slate-600">{change.implementation_plan}</p>
                </div>
              )}
              {change.rollback_plan && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Rollback plan</h4>
                  <p className="mt-1 text-sm text-slate-600">{change.rollback_plan}</p>
                </div>
              )}
            </div>
          )}

          <div className="card mt-4 p-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-slate-500">Service:</span>{' '}
                <span className="text-slate-900">{change.service?.name ?? '—'}</span>
              </div>
              <div>
                <span className="text-slate-500">Submitter:</span>{' '}
                <span className="text-slate-900">{change.submitter?.name ?? '—'}</span>
              </div>
              <div>
                <span className="text-slate-500">Created:</span>{' '}
                <span className="text-slate-900">{timeAgo(change.created_at)}</span>
              </div>
              {change.risk_reasoning && (
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Risk assessment:</span>{' '}
                  <span className="text-slate-900">{change.risk_reasoning}</span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <ChangePipeline status={change.status} />
            </div>
          </div>

          {canApprove && (
            <div className="mt-4 flex flex-wrap gap-2">
              {change.status === 'submitted' && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={isUpdating}
                  onClick={() => onUpdate({ status: 'reviewing' })}
                >
                  Start review
                </button>
              )}
              {change.status === 'reviewing' && (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={isUpdating}
                    onClick={() => onUpdate({ status: 'approved' })}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-red-600"
                    disabled={isUpdating}
                    onClick={() => onUpdate({ status: 'rejected' })}
                  >
                    Reject
                  </button>
                </>
              )}
              {nextStatus && change.status !== 'reviewing' && change.status !== 'submitted' && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={isUpdating}
                  onClick={() => onUpdate({ status: nextStatus })}
                >
                  Advance to {statusLabel(nextStatus)}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChangesCalendarView({
  changes,
  onSelectChange,
  selectedChangeId,
}: {
  changes: Change[];
  onSelectChange: (id: number) => void;
  selectedChangeId: number | null;
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const days = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const startPad = firstDay.getDay();
    const cells: (Date | null)[] = Array.from({ length: startPad }, () => null);
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      cells.push(new Date(year, monthIndex, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const changesByDate = useMemo(() => {
    const map = new Map<string, Change[]>();
    for (const change of changes) {
      const dateKey = (change.scheduled_start ?? change.created_at).slice(0, 10);
      const list = map.get(dateKey) ?? [];
      list.push(change);
      map.set(dateKey, list);
    }
    return map;
  }, [changes]);

  function formatDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  return (
    <div className="card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary px-2 py-2"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-secondary px-2 py-1 text-sm"
            onClick={() => {
              const now = new Date();
              setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="btn-secondary px-2 py-2"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="min-h-24 rounded-lg bg-slate-50/50" />;
          const key = formatDateKey(date);
          const dayChanges = changesByDate.get(key) ?? [];
          const isToday = formatDateKey(new Date()) === key;
          return (
            <div
              key={key}
              className={cn(
                'min-h-24 rounded-lg border p-1.5',
                isToday ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200 bg-white'
              )}
            >
              <div className={cn('mb-1 text-xs font-medium', isToday ? 'text-brand-700' : 'text-slate-600')}>
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {dayChanges.slice(0, 3).map((change) => (
                  <button
                    key={change.id}
                    type="button"
                    onClick={() => onSelectChange(change.id)}
                    className={cn(
                      'block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium',
                      selectedChangeId === change.id
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-brand-100'
                    )}
                    title={change.title}
                  >
                    CHG-{change.id}
                  </button>
                ))}
                {dayChanges.length > 3 && (
                  <div className="text-[10px] text-slate-500">+{dayChanges.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
