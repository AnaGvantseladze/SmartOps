import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Clock, Columns3, GitCommit, StickyNote, X, Check, PauseCircle, CheckCircle2, Siren, ChevronDown } from 'lucide-react';
import { AISuggestionsPanel } from '@/components/AISuggestionsPanel';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { useAuth } from '@/context/AuthContext';
import { useToastContext } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { PERMISSIONS } from '@/lib/permissions';
import { cn, formatDateTime, statusLabel, timeAgo } from '@/lib/utils';
import type { Alert, AlertPriority, AlertStatus, AISuggestion } from '@/types';

const ALERT_STATUSES: AlertStatus[] = ['triggered', 'acknowledged', 'snoozed', 'resolved'];
const ALERT_PRIORITIES: AlertPriority[] = ['P1', 'P2', 'P3', 'P4', 'P5'];

const DEFAULT_STATUS_FILTER: AlertStatus[] = ['triggered', 'acknowledged', 'snoozed'];
const DEFAULT_PRIORITY_FILTER: AlertPriority[] = ALERT_PRIORITIES;

const STATUS_STORAGE_KEY = 'alerts-status-filter';
const PRIORITY_STORAGE_KEY = 'alerts-priority-filter';

function loadStatusFilter(): AlertStatus[] {
  try {
    const stored = localStorage.getItem(STATUS_STORAGE_KEY);
    if (!stored) return DEFAULT_STATUS_FILTER;
    const parsed = JSON.parse(stored) as AlertStatus[];
    return parsed.filter((status) => ALERT_STATUSES.includes(status));
  } catch {
    return DEFAULT_STATUS_FILTER;
  }
}

function loadPriorityFilter(): AlertPriority[] {
  try {
    const stored = localStorage.getItem(PRIORITY_STORAGE_KEY);
    if (!stored) return DEFAULT_PRIORITY_FILTER;
    const parsed = JSON.parse(stored) as AlertPriority[];
    return parsed.filter((priority) => ALERT_PRIORITIES.includes(priority));
  } catch {
    return DEFAULT_PRIORITY_FILTER;
  }
}

type AlertColumnKey = 'status' | 'created' | 'assignee' | 'responsible_team' | 'note';

const ALERT_COLUMNS: { key: AlertColumnKey; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'created', label: 'Created' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'responsible_team', label: 'Responsible Team' },
  { key: 'note', label: 'Note' },
];

const DEFAULT_COLUMN_VISIBILITY: Record<AlertColumnKey, boolean> = {
  status: true,
  created: true,
  assignee: true,
  responsible_team: true,
  note: true,
};

const COLUMN_STORAGE_KEY = 'alerts-column-visibility';

function loadColumnVisibility(): Record<AlertColumnKey, boolean> {
  try {
    const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (!stored) return DEFAULT_COLUMN_VISIBILITY;
    return { ...DEFAULT_COLUMN_VISIBILITY, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_COLUMN_VISIBILITY;
  }
}

function getLatestNote(alert: Alert): string | undefined {
  const notes = alert.timeline.filter((entry) => entry.entry_type === 'note');
  if (notes.length === 0) return undefined;
  return [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0].content;
}

export function AlertsPage() {
  const { can, alertScope } = useAuth();
  const canManage = can(PERMISSIONS.ALERTS_MANAGE);
  const canManageIncidents = can(PERMISSIONS.INCIDENTS_MANAGE);
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<AlertStatus[]>(loadStatusFilter);
  const [priorityFilter, setPriorityFilter] = useState<AlertPriority[]>(loadPriorityFilter);
  const [columnVisibility, setColumnVisibility] = useState(loadColumnVisibility);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const priorityFilterRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const toast = useToastContext();

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(statusFilter));
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem(PRIORITY_STORAGE_KEY, JSON.stringify(priorityFilter));
  }, [priorityFilter]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (columnPickerRef.current && !columnPickerRef.current.contains(target)) {
        setShowColumnPicker(false);
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(target)) {
        setShowStatusFilter(false);
      }
      if (priorityFilterRef.current && !priorityFilterRef.current.contains(target)) {
        setShowPriorityFilter(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedStatusFilter = [...statusFilter].sort();
  const sortedPriorityFilter = [...priorityFilter].sort();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', sortedStatusFilter, sortedPriorityFilter],
    queryFn: () =>
      api.getAlerts({
        status: sortedStatusFilter,
        priority: sortedPriorityFilter,
      }),
    enabled: statusFilter.length > 0 && priorityFilter.length > 0,
    refetchInterval: 10000,
  });

  const selected = alerts.find((a) => a.id === selectedId);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['ai-suggestions', 'alert', selected?.id],
    queryFn: () => api.getAISuggestions('alert', selected?.id),
    enabled: !!selected,
  });

  useEffect(() => {
    if (!selectedId) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedId(null);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedId]);

  const acknowledge = useMutation({
    mutationFn: (id: number) => api.acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert acknowledged');
    },
    onError: () => toast.error('Failed to acknowledge alert'),
  });

  const snooze = useMutation({
    mutationFn: ({ id, reason, hours }: { id: number; reason: string; hours: number }) =>
      api.updateAlert(id, {
        status: 'snoozed',
        snooze_reason: reason,
        snoozed_until: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert snoozed');
    },
    onError: () => toast.error('Failed to snooze alert'),
  });

  const resolve = useMutation({
    mutationFn: (id: number) => api.updateAlert(id, { status: 'resolved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert resolved');
    },
    onError: () => toast.error('Failed to resolve alert'),
  });

  const createIncident = useMutation({
    mutationFn: (id: number) => api.createIncidentFromAlert(id),
    onSuccess: (incident) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident created', `INC-${incident.id} is now on the Incident board`);
    },
    onError: (error: Error) => toast.error('Failed to create incident', error.message),
  });

  const isUpdating =
    acknowledge.isPending ||
    snooze.isPending ||
    resolve.isPending ||
    createIncident.isPending;

  function handleSnooze(id: number, reason: string, hours: number) {
    snooze.mutate({ id, reason, hours });
  }

  const addNote = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => api.addAlertNote(id, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const visibleColumns = ALERT_COLUMNS.filter((column) => columnVisibility[column.key]);

  function toggleColumn(key: AlertColumnKey) {
    setColumnVisibility((current) => ({ ...current, [key]: !current[key] }));
  }

  function toggleStatus(status: AlertStatus) {
    setStatusFilter((current) =>
      current.includes(status) ? current.filter((value) => value !== status) : [...current, status]
    );
  }

  function selectActiveStatuses() {
    setStatusFilter(DEFAULT_STATUS_FILTER);
  }

  function selectAllStatuses() {
    setStatusFilter(ALERT_STATUSES);
  }

  function togglePriority(priority: AlertPriority) {
    setPriorityFilter((current) =>
      current.includes(priority) ? current.filter((value) => value !== priority) : [...current, priority]
    );
  }

  function selectAllPriorities() {
    setPriorityFilter(ALERT_PRIORITIES);
  }

  const statusFilterLabel =
    statusFilter.length === 0
      ? 'No statuses selected'
      : statusFilter.length === ALERT_STATUSES.length
        ? 'All statuses'
        : statusFilter.length === DEFAULT_STATUS_FILTER.length &&
            DEFAULT_STATUS_FILTER.every((status) => statusFilter.includes(status)) &&
            statusFilter.every((status) => DEFAULT_STATUS_FILTER.includes(status))
          ? 'Active alerts'
          : `${statusFilter.length} statuses`;

  const priorityFilterLabel =
    priorityFilter.length === 0
      ? 'No priorities selected'
      : priorityFilter.length === ALERT_PRIORITIES.length
        ? 'All priorities'
        : `${priorityFilter.length} priorities`;

  if (isLoading) return <div className="page-container text-slate-500">Loading alerts...</div>;

  return (
    <div className="page-container flex h-[calc(100vh-3.5rem)] flex-col pb-0">
      <div className="mb-4 flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Alert Console</h1>
          <p className="page-subtitle">Live feed — operations console</p>
        </div>
        <div className="flex items-center gap-2">
          {alertScope === 'critical_only' && (
            <span className="badge border bg-amber-50 text-amber-700 border-amber-200">P1/P2 only (Manager)</span>
          )}
          {alertScope === 'my_services' && (
            <span className="badge border bg-blue-50 text-blue-700 border-blue-200">My services only</span>
          )}
          <div className="relative" ref={columnPickerRef}>
            <button
              type="button"
              onClick={() => setShowColumnPicker((open) => !open)}
              className="btn-secondary"
            >
              <Columns3 className="h-4 w-4" />
              Columns
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Show fields
                </p>
                <div className="space-y-1">
                  {ALERT_COLUMNS.map((column) => (
                    <label
                      key={column.key}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={columnVisibility[column.key]}
                        onChange={() => toggleColumn(column.key)}
                        className="rounded border-slate-300 text-brand-900 focus:ring-brand-500"
                      />
                      {column.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative" ref={statusFilterRef}>
          <button
            type="button"
            onClick={() => setShowStatusFilter((open) => !open)}
            className="btn-secondary"
          >
            Status: {statusFilterLabel}
            <ChevronDown className="h-4 w-4" />
          </button>
          {showStatusFilter && (
            <div className="absolute left-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Filter by status
                </p>
                <div className="flex gap-2 text-xs">
                  <button type="button" className="text-brand-700 hover:underline" onClick={selectActiveStatuses}>
                    Active
                  </button>
                  <button type="button" className="text-brand-700 hover:underline" onClick={selectAllStatuses}>
                    All
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {ALERT_STATUSES.map((status) => (
                  <label
                    key={status}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(status)}
                      onChange={() => toggleStatus(status)}
                      className="rounded border-slate-300 text-brand-900 focus:ring-brand-500"
                    />
                    {statusLabel(status)}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="relative" ref={priorityFilterRef}>
          <button
            type="button"
            onClick={() => setShowPriorityFilter((open) => !open)}
            className="btn-secondary"
          >
            Priority: {priorityFilterLabel}
            <ChevronDown className="h-4 w-4" />
          </button>
          {showPriorityFilter && (
            <div className="absolute left-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Filter by priority
                </p>
                <button type="button" className="text-xs text-brand-700 hover:underline" onClick={selectAllPriorities}>
                  All
                </button>
              </div>
              <div className="space-y-1">
                {ALERT_PRIORITIES.map((priority) => (
                  <label
                    key={priority}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={priorityFilter.includes(priority)}
                      onChange={() => togglePriority(priority)}
                      className="rounded border-slate-300 text-brand-900 focus:ring-brand-500"
                    />
                    {priority}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="table-container min-h-0 flex-1 overflow-auto">
        <table className="data-table">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-16">Priority</th>
              <th>Title</th>
              {visibleColumns.map((column) => (
                <th key={column.key} className={column.key === 'note' ? 'min-w-[180px]' : undefined}>
                  {column.label}
                </th>
              ))}
              {(canManage || canManageIncidents) && <th className="min-w-[280px]">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <AlertTableRow
                key={alert.id}
                alert={alert}
                selected={selected?.id === alert.id}
                visibleColumns={columnVisibility}
                canManage={canManage}
                canManageIncidents={canManageIncidents}
                onSelect={() => setSelectedId(alert.id)}
                onAcknowledge={() => acknowledge.mutate(alert.id)}
                onSnooze={(reason, hours) => handleSnooze(alert.id, reason, hours)}
                onResolve={() => resolve.mutate(alert.id)}
                onCreateIncident={() => createIncident.mutate(alert.id)}
                onViewIncident={() => navigate('/incidents')}
                isUpdating={isUpdating}
                onAddNote={(content) => addNote.mutate({ id: alert.id, content })}
                isAddingNote={addNote.isPending && addNote.variables?.id === alert.id}
              />
            ))}
          </tbody>
        </table>
        {alerts.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">
            {statusFilter.length === 0 || priorityFilter.length === 0
              ? 'Select at least one status and priority to show alerts'
              : 'No alerts match the selected filters'}
          </p>
        )}
      </div>

      {selected && (
        <AlertDetailPanel
          alert={selected}
          suggestions={suggestions}
          onClose={() => setSelectedId(null)}
          onAcknowledge={() => acknowledge.mutate(selected.id)}
          onSnooze={(reason, hours) => handleSnooze(selected.id, reason, hours)}
          onResolve={() => resolve.mutate(selected.id)}
          onCreateIncident={() => createIncident.mutate(selected.id)}
          onViewIncident={() => navigate('/incidents')}
          isUpdating={isUpdating}
          canManage={canManage}
          canManageIncidents={canManageIncidents}
        />
      )}
    </div>
  );
}

function AlertTableRow({
  alert,
  selected,
  visibleColumns,
  canManage,
  canManageIncidents,
  onSelect,
  onAcknowledge,
  onSnooze,
  onResolve,
  onCreateIncident,
  onViewIncident,
  isUpdating,
  onAddNote,
  isAddingNote,
}: {
  alert: Alert;
  selected: boolean;
  visibleColumns: Record<AlertColumnKey, boolean>;
  canManage: boolean;
  canManageIncidents: boolean;
  onSelect: () => void;
  onAcknowledge: () => void;
  onSnooze: (reason: string, hours: number) => void;
  onResolve: () => void;
  onCreateIncident: () => void;
  onViewIncident: () => void;
  isUpdating: boolean;
  onAddNote: (content: string) => void;
  isAddingNote: boolean;
}) {
  const isP1 = alert.priority === 'P1' && alert.status === 'triggered';
  const latestNote = getLatestNote(alert);

  return (
    <tr
      onClick={onSelect}
      className={cn(
        'cursor-pointer',
        selected && 'bg-brand-50',
        isP1 && 'alert-pulse'
      )}
    >
      <td>
        <PriorityBadge priority={alert.priority} />
      </td>
      <td>
        <div className="font-medium text-slate-900">{alert.title}</div>
        <div className="mt-0.5 text-xs text-slate-500">
          {alert.source}
          {alert.service ? ` · ${alert.service.name}` : ''}
          {alert.occurrence_count > 1 ? ` · ×${alert.occurrence_count}` : ''}
        </div>
      </td>
      {visibleColumns.status && (
        <td>
          <StatusBadge status={alert.status} />
        </td>
      )}
      {visibleColumns.created && (
        <td className="whitespace-nowrap text-slate-600" title={formatDateTime(alert.created_at)}>
          {timeAgo(alert.created_at)}
        </td>
      )}
      {visibleColumns.assignee && (
        <td className="text-slate-600">{alert.assignee?.name ?? '—'}</td>
      )}
      {visibleColumns.responsible_team && (
        <td className="text-slate-600">{alert.responsible_team?.name ?? '—'}</td>
      )}
      {visibleColumns.note && (
        <td onClick={(event) => event.stopPropagation()}>
          <AlertNoteCell
            note={latestNote}
            onSave={onAddNote}
            isSaving={isAddingNote}
          />
        </td>
      )}
      {(canManage || canManageIncidents) && (
        <td onClick={(event) => event.stopPropagation()}>
          <AlertActions
            alert={alert}
            compact
            disabled={isUpdating}
            canManage={canManage}
            canManageIncidents={canManageIncidents}
            onAcknowledge={onAcknowledge}
            onSnooze={onSnooze}
            onResolve={onResolve}
            onCreateIncident={onCreateIncident}
            onViewIncident={onViewIncident}
          />
        </td>
      )}
    </tr>
  );
}

function AlertActions({
  alert,
  compact = false,
  disabled = false,
  canManage = true,
  canManageIncidents = false,
  onAcknowledge,
  onSnooze,
  onResolve,
  onCreateIncident,
  onViewIncident,
}: {
  alert: Alert;
  compact?: boolean;
  disabled?: boolean;
  canManage?: boolean;
  canManageIncidents?: boolean;
  onAcknowledge: () => void;
  onSnooze: (reason: string, hours: number) => void;
  onResolve: () => void;
  onCreateIncident: () => void;
  onViewIncident: () => void;
}) {
  const [showSnooze, setShowSnooze] = useState(false);
  const [snoozeReason, setSnoozeReason] = useState('');
  const [snoozeHours, setSnoozeHours] = useState('1');
  const snoozeRef = useRef<HTMLDivElement>(null);

  const canAcknowledge = canManage && alert.status === 'triggered';
  const canSnooze = canManage && (alert.status === 'triggered' || alert.status === 'acknowledged');
  const canResolve = canManage && alert.status !== 'resolved';
  const canCreateIncident = canManageIncidents && !alert.incident_id && alert.status !== 'resolved';
  const hasLinkedIncident = !!alert.incident_id;

  useEffect(() => {
    if (!showSnooze) return;
    function handleClickOutside(event: MouseEvent) {
      if (snoozeRef.current && !snoozeRef.current.contains(event.target as Node)) {
        setShowSnooze(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSnooze]);

  function handleSnoozeSubmit() {
    const reason = snoozeReason.trim();
    if (!reason) return;
    onSnooze(reason, Number(snoozeHours));
    setShowSnooze(false);
    setSnoozeReason('');
    setSnoozeHours('1');
  }

  const buttonClass = compact ? 'btn-secondary px-2 py-1 text-xs' : 'btn-secondary';

  if (!canAcknowledge && !canSnooze && !canResolve && !canCreateIncident && !hasLinkedIncident) {
    return <span className="text-xs text-slate-400">No actions</span>;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', compact ? '' : 'gap-2')}>
      {hasLinkedIncident && (
        <button type="button" className={buttonClass} onClick={onViewIncident}>
          <Siren className="h-3.5 w-3.5" />
          INC-{alert.incident_id}
        </button>
      )}
      {canAcknowledge && (
        <button
          type="button"
          className={cn(compact ? 'btn-primary px-2 py-1 text-xs' : 'btn-primary')}
          onClick={onAcknowledge}
          disabled={disabled}
        >
          <Check className="h-3.5 w-3.5" />
          Acknowledge
        </button>
      )}
      {canSnooze && (
        <div className="relative" ref={snoozeRef}>
          <button
            type="button"
            className={buttonClass}
            onClick={() => setShowSnooze((open) => !open)}
            disabled={disabled}
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Snooze
          </button>
          {showSnooze && (
            <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <p className="mb-2 text-xs font-semibold text-slate-700">Snooze alert</p>
              <textarea
                value={snoozeReason}
                onChange={(event) => setSnoozeReason(event.target.value)}
                rows={2}
                placeholder="Reason for snooze..."
                className="input mb-2 w-full resize-none text-xs"
              />
              <select
                value={snoozeHours}
                onChange={(event) => setSnoozeHours(event.target.value)}
                className="select mb-2 w-full text-xs"
              >
                <option value="1">1 hour</option>
                <option value="4">4 hours</option>
                <option value="8">8 hours</option>
                <option value="24">24 hours</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary flex-1 px-2 py-1 text-xs"
                  onClick={handleSnoozeSubmit}
                  disabled={!snoozeReason.trim() || disabled}
                >
                  Snooze
                </button>
                <button
                  type="button"
                  className="btn-secondary px-2 py-1 text-xs"
                  onClick={() => setShowSnooze(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {canResolve && (
        <button type="button" className={buttonClass} onClick={onResolve} disabled={disabled}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Resolve
        </button>
      )}
      {canCreateIncident && (
        <button type="button" className={buttonClass} onClick={onCreateIncident} disabled={disabled}>
          <Siren className="h-3.5 w-3.5" />
          Create Incident
        </button>
      )}
    </div>
  );
}

function AlertNoteCell({
  note,
  onSave,
  isSaving,
}: {
  note?: string;
  onSave: (content: string) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(note ?? '');
  }, [note, editing]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="Add a note..."
          className="input w-full resize-none text-xs"
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary px-2 py-1 text-xs"
            onClick={handleSave}
            disabled={isSaving || !draft.trim()}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="btn-secondary px-2 py-1 text-xs"
            onClick={() => {
              setDraft(note ?? '');
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        'flex w-full items-start gap-1.5 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors hover:border-brand-300 hover:bg-brand-50',
        note ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-dashed border-slate-300 text-slate-400'
      )}
    >
      <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="line-clamp-2">{note ?? 'Add note...'}</span>
    </button>
  );
}

function AlertDetailPanel({
  alert,
  suggestions,
  onClose,
  onAcknowledge,
  onSnooze,
  onResolve,
  onCreateIncident,
  onViewIncident,
  isUpdating,
  canManage,
  canManageIncidents,
}: {
  alert: Alert;
  suggestions: AISuggestion[];
  onClose: () => void;
  onAcknowledge: () => void;
  onSnooze: (reason: string, hours: number) => void;
  onResolve: () => void;
  onCreateIncident: () => void;
  onViewIncident: () => void;
  isUpdating: boolean;
  canManage: boolean;
  canManageIncidents: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30"
        aria-label="Close alert details"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Alert Details</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-2 py-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AlertDetail
            alert={alert}
            onAcknowledge={onAcknowledge}
            onSnooze={onSnooze}
            onResolve={onResolve}
            onCreateIncident={onCreateIncident}
            onViewIncident={onViewIncident}
            isUpdating={isUpdating}
            canManage={canManage}
            canManageIncidents={canManageIncidents}
          />
          <div className="border-t border-slate-200 p-4">
            <AISuggestionsPanel suggestions={suggestions} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertDetail({
  alert,
  onAcknowledge,
  onSnooze,
  onResolve,
  onCreateIncident,
  onViewIncident,
  isUpdating,
  canManage,
  canManageIncidents,
}: {
  alert: Alert;
  onAcknowledge: () => void;
  onSnooze: (reason: string, hours: number) => void;
  onResolve: () => void;
  onCreateIncident: () => void;
  onViewIncident: () => void;
  isUpdating: boolean;
  canManage: boolean;
  canManageIncidents: boolean;
}) {
  const latestNote = getLatestNote(alert);

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

      <div className="card mb-4 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Details</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-slate-500">Created:</span>{' '}
            <span className="text-slate-900">{formatDateTime(alert.created_at)}</span>
          </div>
          <div>
            <span className="text-slate-500">Assignee:</span>{' '}
            <span className="text-slate-900">{alert.assignee?.name ?? 'Unassigned'}</span>
          </div>
          <div>
            <span className="text-slate-500">Responsible team:</span>{' '}
            <span className="text-slate-900">{alert.responsible_team?.name ?? '—'}</span>
          </div>
          <div>
            <span className="text-slate-500">Source:</span>{' '}
            <span className="text-slate-900">{alert.source}</span>
          </div>
        </div>
        {latestNote && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <div className="mb-1 text-xs font-medium text-slate-500">Latest note</div>
            {latestNote}
          </div>
        )}
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

      {(canManage || canManageIncidents) && (
        <div className="card mb-4 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Actions</h3>
          <AlertActions
            alert={alert}
            disabled={isUpdating}
            canManage={canManage}
            canManageIncidents={canManageIncidents}
            onAcknowledge={onAcknowledge}
            onSnooze={onSnooze}
            onResolve={onResolve}
            onCreateIncident={onCreateIncident}
            onViewIncident={onViewIncident}
          />
        </div>
      )}

      {alert.incident_id && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <Siren className="h-4 w-4 shrink-0" />
          Linked to incident <strong>INC-{alert.incident_id}</strong>
          <button type="button" className="ml-auto text-xs font-medium underline" onClick={onViewIncident}>
            View on board
          </button>
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
