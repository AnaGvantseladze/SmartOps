import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Video, X, ExternalLink } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '@/components/Badges';
import { api } from '@/lib/api';
import { cn, formatDateTime, incidentColumns, statusLabel, timeAgo } from '@/lib/utils';
import type { Incident } from '@/types';

export function IncidentsPage() {
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
        <IncidentDetailPanel incident={selected} onClose={() => setSelectedId(null)} />
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

function IncidentDetailPanel({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30"
        aria-label="Close incident details"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Incident Details</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-2 py-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-center gap-2">
            <PriorityBadge priority={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{incident.title}</h3>
          {incident.description && <p className="mt-2 text-sm text-slate-600">{incident.description}</p>}

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
                <span className="text-slate-500">Created:</span>{' '}
                <span className="text-slate-900">{formatDateTime(incident.created_at)}</span>
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

          {incident.action_items.length > 0 && (
            <div className="card mt-4 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Action Items</h4>
              <div className="space-y-2">
                {incident.action_items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900">{item.title}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.owner && (
                      <p className="mt-1 text-xs text-slate-500">Owner: {item.owner.name}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
