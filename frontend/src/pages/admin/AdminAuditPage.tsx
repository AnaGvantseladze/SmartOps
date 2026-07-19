import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';

export function AdminAuditPage() {
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['admin-audit'], queryFn: api.getAuditLogs });

  if (isLoading) return <div className="p-8 text-slate-400">Loading audit logs...</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="text-slate-400">Immutable record of all platform actions — who, what, when</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ops-border bg-ops-bg text-left text-slate-400">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-ops-border">
                <td className="px-4 py-3 text-slate-500">{timeAgo(log.created_at)}</td>
                <td className="px-4 py-3 text-white">{log.user?.name ?? 'System'}</td>
                <td className="px-4 py-3 font-mono text-xs text-blue-300">{log.action}</td>
                <td className="px-4 py-3 text-slate-400">{log.resource_type}/{log.resource_id}</td>
                <td className="px-4 py-3 text-slate-400">{log.details}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.ip_address ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
