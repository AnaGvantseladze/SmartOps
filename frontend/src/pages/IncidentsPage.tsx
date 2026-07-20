import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Video, X, ExternalLink, AlertTriangle, Plus } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { useAuth } from '@/context/AuthContext';
import { useToastContext } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { PERMISSIONS } from '@/lib/permissions';
import { cn, formatDateTime, incidentColumns, statusLabel, timeAgo } from '@/lib/utils';
import type { AlertPriority, Incident, IncidentSeverity, IncidentStatus } from '@/types';

const INCIDENT_PRIORITIES: IncidentSeverity[] = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5'];
const ACTION_ITEM_PRIORITIES: AlertPriority[] = ['P1', 'P2', 'P3', 'P4', 'P5'];

export function IncidentsPage() {
  const { can } = useAuth();
  const canManage = can(PERMISSIONS.INCIDENTS_MANAGE);
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => api.getIncidents(),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

  const { data: selectedIncident } = useQuery({
    queryKey: ['incident', selectedId],
    queryFn: () => api.getIncident(selectedId!),
    enabled: selectedId != null,
    staleTime: 15000,
  });

  const selected = selectedIncident ?? incidents.find((incident) => incident.id === selectedId);

  const updateIncident = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Incident> }) => api.updateIncident(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.setQueryData(['incident', updated.id], updated);
      toast.success('Incident updated');
    },
    onError: (error: Error) => toast.error('Failed to update incident', error.message),
  });

  const addActionItem = useMutation({
    mutationFn: ({
      incidentId,
      data,
    }: {
      incidentId: number;
      data: { title: string; description?: string; priority?: string };
    }) => api.createIncidentActionItem(incidentId, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.setQueryData(['incident', updated.id], updated);
      toast.success('Action item added');
    },
    onError: (error: Error) => toast.error('Failed to add action item', error.message),
  });

  useEffect(() => {
    if (!selectedId) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedId(null);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedId]);

  if (isLoading) return <div className="page-container text-slate-500">Loading incidents...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Incident Board</h1>
        <p className="page-subtitle">Kanban view — track incidents through resolution</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {incidentColumns.map((col) => {
          const columnIncidents = incidents.filter((i) => i.status === col.status);
          return (
            <div key={col.status} className="w-72 shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{col.label}</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {columnIncidents.length}
                </span>
              </div>
              <div className="space-y-3">
                {columnIncidents.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    selected={selectedId === incident.id}
                    onSelect={() => setSelectedId(incident.id)}
                  />
                ))}
                {columnIncidents.length === 0 && (
                  <div className="empty-state">No incidents</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <IncidentDetailPanel
          incident={selected}
          canManage={canManage}
          isUpdating={updateIncident.isPending}
          isAddingActionItem={addActionItem.isPending}
          onClose={() => setSelectedId(null)}
          onUpdate={(data) => updateIncident.mutate({ id: selected.id, data })}
          onAddActionItem={(data) =>
            addActionItem.mutateAsync({ incidentId: selected.id, data })
          }
        />
      )}
    </div>
  );
}

function IncidentCard({
  incident,
  selected,
  onSelect,
}: {
  incident: Incident;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'card w-full p-4 text-left transition-all hover:border-brand-300 hover:shadow-md',
        selected && 'border-brand-400 bg-brand-50'
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <PriorityBadge priority={incident.severity} />
        {incident.commander && (
          <span title="Incident Commander assigned">
            <Users className="h-3.5 w-3.5 text-amber-600" />
          </span>
        )}
        {incident.war_room_url && (
          <span title="War room available">
            <Video className="h-3.5 w-3.5 text-blue-600" />
          </span>
        )}
      </div>
      <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-slate-900">{incident.title}</h3>
      {incident.services.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {incident.services.map((s) => (
            <span key={s.id} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{timeAgo(incident.created_at)}</span>
      </div>
    </button>
  );
}

function IncidentDetailPanel({
  incident,
  canManage,
  isUpdating,
  isAddingActionItem,
  onClose,
  onUpdate,
  onAddActionItem,
}: {
  incident: Incident;
  canManage: boolean;
  isUpdating: boolean;
  isAddingActionItem: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<Incident>) => void;
  onAddActionItem: (data: {
    title: string;
    description?: string;
    priority?: string;
  }) => Promise<void>;
}) {
  const navigate = useNavigate();
  const [description, setDescription] = useState(incident.description ?? '');
  const [showActionItemForm, setShowActionItemForm] = useState(false);
  const [actionItemTitle, setActionItemTitle] = useState('');
  const [actionItemDescription, setActionItemDescription] = useState('');
  const [actionItemPriority, setActionItemPriority] = useState<AlertPriority>('P3');
  const sourceAlerts = incident.source_alerts ?? [];

  useEffect(() => {
    setDescription(incident.description ?? '');
  }, [incident.id, incident.description]);

  useEffect(() => {
    setShowActionItemForm(false);
    setActionItemTitle('');
    setActionItemDescription('');
    setActionItemPriority('P3');
  }, [incident.id]);

  function handleDescriptionSave() {
    const trimmed = description.trim();
    if (trimmed === (incident.description ?? '').trim()) return;
    onUpdate({ description: trimmed || undefined });
  }

  function handleActionItemSubmit(event: React.FormEvent) {
    event.preventDefault();
    const title = actionItemTitle.trim();
    if (!title) return;
    void onAddActionItem({
      title,
      description: actionItemDescription.trim() || undefined,
      priority: actionItemPriority,
    }).then(() => {
      setShowActionItemForm(false);
      setActionItemTitle('');
      setActionItemDescription('');
      setActionItemPriority('P3');
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30"
        aria-label="Close incident details"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Incident Details</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-2 py-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{incident.title}</h3>

          <div className="card mt-4 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Timeframe</h4>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-slate-500">Created:</span>{' '}
                <span className="font-medium text-slate-900">{formatDateTime(incident.created_at)}</span>
              </div>
              <div>
                <span className="text-slate-500">Last updated:</span>{' '}
                <span className="text-slate-900">{formatDateTime(incident.updated_at)}</span>
              </div>
              {incident.resolved_at && (
                <div>
                  <span className="text-slate-500">Resolved:</span>{' '}
                  <span className="text-slate-900">{formatDateTime(incident.resolved_at)}</span>
                </div>
              )}
              {incident.closed_at && (
                <div>
                  <span className="text-slate-500">Closed:</span>{' '}
                  <span className="text-slate-900">{formatDateTime(incident.closed_at)}</span>
                </div>
              )}
            </div>
          </div>

          {sourceAlerts.length > 0 && (
            <div className="card mt-4 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Source alert</h4>
              <div className="space-y-2">
                {sourceAlerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => navigate(`/alerts?alertId=${alert.id}`)}
                    className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={alert.priority} />
                        <StatusBadge status={alert.status} />
                      </div>
                      <div className="text-sm font-medium text-slate-900">{alert.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Alert #{alert.id} · created {formatDateTime(alert.created_at)}
                      </div>
                    </div>
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {canManage && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="incident-priority" className="mb-1 block text-sm font-medium text-slate-700">
                  Priority
                </label>
                <select
                  id="incident-priority"
                  value={incident.severity}
                  disabled={isUpdating}
                  onChange={(event) => onUpdate({ severity: event.target.value as IncidentSeverity })}
                  className="input w-full"
                >
                  {INCIDENT_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="incident-status" className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  id="incident-status"
                  value={incident.status}
                  disabled={isUpdating}
                  onChange={(event) => onUpdate({ status: event.target.value as IncidentStatus })}
                  className="input w-full"
                >
                  {incidentColumns.map((column) => (
                    <option key={column.status} value={column.status}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <label htmlFor="incident-description" className="text-sm font-medium text-slate-700">
                Description
              </label>
              {canManage && (
                <button
                  type="button"
                  className="btn-primary px-3 py-1 text-xs"
                  disabled={isUpdating || description.trim() === (incident.description ?? '').trim()}
                  onClick={handleDescriptionSave}
                >
                  Save
                </button>
              )}
            </div>
            {canManage ? (
              <textarea
                id="incident-description"
                value={description}
                rows={6}
                disabled={isUpdating}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add incident details, impact notes, investigation findings..."
                className="input w-full min-h-[9rem] resize-y"
              />
            ) : (
              <div className="input min-h-[9rem] w-full whitespace-pre-wrap bg-slate-50 text-sm text-slate-700">
                {incident.description || 'No description provided.'}
              </div>
            )}
          </div>

          {incident.war_room_url && (
            <a
              href={incident.war_room_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900"
            >
              <Video className="h-4 w-4" />
              Join war room
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <div className="card mt-4 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Priority:</span>{' '}
                <span className="text-slate-900">{incident.severity}</span>
              </div>
              <div>
                <span className="text-slate-500">Status:</span>{' '}
                <span className="text-slate-900">{statusLabel(incident.status)}</span>
              </div>
              {incident.category && (
                <div>
                  <span className="text-slate-500">Category:</span>{' '}
                  <span className="text-slate-900">{incident.category}</span>
                </div>
              )}
              {incident.manager && (
                <div>
                  <span className="text-slate-500">Manager:</span>{' '}
                  <span className="text-slate-900">{incident.manager.name}</span>
                </div>
              )}
              {incident.commander && (
                <div>
                  <span className="text-slate-500">Commander:</span>{' '}
                  <span className="text-slate-900">{incident.commander.name}</span>
                </div>
              )}
            </div>
          </div>

          {incident.business_impact && (
            <div className="card mt-4 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Business Impact</h4>
              <p className="text-sm text-slate-600">{incident.business_impact}</p>
            </div>
          )}

          {incident.services.length > 0 && (
            <div className="card mt-4 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Affected Services</h4>
              <div className="flex flex-wrap gap-2">
                {incident.services.map((service) => (
                  <span key={service.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {service.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(incident.resolution_summary || incident.root_cause) && (
            <div className="card mt-4 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Resolution</h4>
              {incident.resolution_summary && (
                <p className="text-sm text-slate-600">{incident.resolution_summary}</p>
              )}
              {incident.root_cause && (
                <p className="mt-2 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">Root cause:</span> {incident.root_cause}
                </p>
              )}
            </div>
          )}

          <div className="card mt-4 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900">Action Items</h4>
              {canManage && (
                <button
                  type="button"
                  className="btn-secondary px-2.5 py-1 text-xs"
                  disabled={isAddingActionItem}
                  onClick={() => setShowActionItemForm((open) => !open)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              )}
            </div>

            {showActionItemForm && canManage && (
              <form onSubmit={handleActionItemSubmit} className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div>
                  <label htmlFor="action-item-title" className="mb-1 block text-xs font-medium text-slate-700">
                    Title
                  </label>
                  <input
                    id="action-item-title"
                    type="text"
                    value={actionItemTitle}
                    onChange={(event) => setActionItemTitle(event.target.value)}
                    placeholder="What needs to be done?"
                    className="input w-full"
                    required
                    disabled={isAddingActionItem}
                  />
                </div>
                <div>
                  <label htmlFor="action-item-description" className="mb-1 block text-xs font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    id="action-item-description"
                    value={actionItemDescription}
                    onChange={(event) => setActionItemDescription(event.target.value)}
                    placeholder="Optional details..."
                    rows={2}
                    className="input w-full resize-y"
                    disabled={isAddingActionItem}
                  />
                </div>
                <div>
                  <label htmlFor="action-item-priority" className="mb-1 block text-xs font-medium text-slate-700">
                    Priority
                  </label>
                  <select
                    id="action-item-priority"
                    value={actionItemPriority}
                    onChange={(event) => setActionItemPriority(event.target.value as AlertPriority)}
                    className="input w-full"
                    disabled={isAddingActionItem}
                  >
                    {ACTION_ITEM_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1 text-xs"
                    disabled={isAddingActionItem}
                    onClick={() => setShowActionItemForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-3 py-1 text-xs"
                    disabled={isAddingActionItem || !actionItemTitle.trim()}
                  >
                    Add action item
                  </button>
                </div>
              </form>
            )}

            {incident.action_items.length > 0 ? (
              <div className="space-y-2">
                {incident.action_items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900">{item.title}</span>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={item.priority} />
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                    )}
                    {item.owner && (
                      <p className="mt-1 text-xs text-slate-500">Owner: {item.owner.name}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No action items yet.</p>
            )}
          </div>

          {incident.timeline.length > 0 && (
            <div className="card mt-4 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Timeline</h4>
              <div className="space-y-3">
                {incident.timeline.map((entry) => (
                  <div key={entry.id} className="border-l-2 border-slate-200 pl-3">
                    <div className="text-xs text-slate-500">
                      {timeAgo(entry.created_at)}
                      {entry.author ? ` · ${entry.author.name}` : ''}
                    </div>
                    <div className="text-sm text-slate-700">{entry.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
