import { useQuery } from '@tanstack/react-query';
import { Users, Video } from 'lucide-react';
import { PriorityBadge } from '@/components/Badges';
import { api } from '@/lib/api';
import { incidentColumns, timeAgo } from '@/lib/utils';
import type { Incident } from '@/types';

export function IncidentsPage() {
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => api.getIncidents(),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });

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
                  <IncidentCard key={incident.id} incident={incident} />
                ))}
                {columnIncidents.length === 0 && (
                  <div className="empty-state">No incidents</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  return (
    <div className="card cursor-pointer p-4 transition-all hover:border-brand-300 hover:shadow-md">
      <div className="mb-2 flex items-center gap-2">
        <PriorityBadge priority={incident.severity} />
        {incident.commander && (
          <span title="Incident Commander assigned">
            <Users className="h-3.5 w-3.5 text-amber-600" />
          </span>
        )}
        {incident.war_room_url && (
          <a href={incident.war_room_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            <Video className="h-3.5 w-3.5 text-blue-600" />
          </a>
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
    </div>
  );
}
