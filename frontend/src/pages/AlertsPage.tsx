import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Columns3, GitCommit, StickyNote, X } from 'lucide-react';
import { AISuggestionsPanel } from '@/components/AISuggestionsPanel';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { PERMISSIONS } from '@/lib/permissions';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import type { Alert, AlertStatus, AISuggestion } from '@/types';

const statusFilters: { value: AlertStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'triggered', label: 'Triggered' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'snoozed', label: 'Snoozed' },
  { value: 'resolved', label: 'Resolved' },
];

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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [columnVisibility, setColumnVisibility] = useState(loadColumnVisibility);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
        setShowColumnPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn: () => api.getAlerts(statusFilter !== 'all' ? { status: statusFilter } : undefined),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const addNote = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => api.addAlertNote(id, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const visibleColumns = ALERT_COLUMNS.filter((column) => columnVisibility[column.key]);

  function toggleColumn(key: AlertColumnKey) {
    setColumnVisibility((current) => ({ ...current, [key]: !current[key] }));
  }

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

      <div className="mb-4 flex flex-wrap gap-2">
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
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <AlertTableRow
                key={alert.id}
                alert={alert}
                selected={selected?.id === alert.id}
                visibleColumns={columnVisibility}
                onSelect={() => setSelectedId(alert.id)}
                onAddNote={(content) => addNote.mutate({ id: alert.id, content })}
                isAddingNote={addNote.isPending && addNote.variables?.id === alert.id}
              />
            ))}
          </tbody>
        </table>
        {alerts.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">No alerts match filters</p>
        )}
      </div>

      {selected && (
        <AlertDetailPanel
          alert={selected}
          suggestions={suggestions}
          onClose={() => setSelectedId(null)}
          onAcknowledge={() => acknowledge.mutate(selected.id)}
          isAcknowledging={acknowledge.isPending}
          canManage={canManage}
        />
      )}
    </div>
  );
}

function AlertTableRow({
  alert,
  selected,
  visibleColumns,
  onSelect,
  onAddNote,
  isAddingNote,
}: {
  alert: Alert;
  selected: boolean;
  visibleColumns: Record<AlertColumnKey, boolean>;
  onSelect: () => void;
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
    </tr>
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
  isAcknowledging,
  canManage,
}: {
  alert: Alert;
  suggestions: AISuggestion[];
  onClose: () => void;
  onAcknowledge: () => void;
  isAcknowledging: boolean;
  canManage: boolean;
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
            isAcknowledging={isAcknowledging}
            canManage={canManage}
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
  isAcknowledging,
  canManage,
}: {
  alert: Alert;
  onAcknowledge: () => void;
  isAcknowledging: boolean;
  canManage: boolean;
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
