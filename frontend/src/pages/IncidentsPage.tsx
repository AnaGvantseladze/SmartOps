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
    refetchInterval: 15000,
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading incidents...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Incident Board</h1>
        <p className="text-slate-400">Kanban view — drag cards to update status (coming soon)</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {incidentColumns.map((col) => {
          const columnIncidents = incidents.filter((i) => i.status === col.status);
          return (
            <div key={col.status} className="w-72 shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-300">{col.label}</h2>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  {columnIncidents.length}
                </span>
              </div>
              <div className="space-y-3">
                {columnIncidents.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))}
                {columnIncidents.length === 0 && (
                  <div className="rounded-lg border border-dashed border-ops-border p-4 text-center text-xs text-slate-600">
                    No incidents
                  </div>
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
    <div className="card cursor-pointer p-4 transition-colors hover:border-blue-500/50">
      <div className="mb-2 flex items-center gap-2">
        <PriorityBadge priority={incident.severity} />
        {incident.commander && (
          <span title="Incident Commander assigned">
            <Users className="h-3.5 w-3.5 text-amber-400" />
          </span>
        )}
        {incident.war_room_url && (
          <a href={incident.war_room_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            <Video className="h-3.5 w-3.5 text-blue-400" />
          </a>
        )}
      </div>
      <h3 className="mb-2 line-clamp-2 text-sm font-medium text-white">{incident.title}</h3>
      {incident.services.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {incident.services.map((s) => (
            <span key={s.id} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{timeAgo(incident.created_at)}</span>
        {incident.pir_due_at && incident.status === 'pir_pending' && (
          <span className="text-orange-400">PIR due {timeAgo(incident.pir_due_at)}</span>
        )}
      </div>
      {incident.action_items.length > 0 && (
        <div className="mt-2 text-xs text-slate-400">
          Action items: {incident.action_items.filter((a) => a.status === 'completed' || a.status === 'verified').length}/
          {incident.action_items.length} done
        </div>
      )}
    </div>
  );
}
