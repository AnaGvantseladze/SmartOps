import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';

export function AdminAuditPage() {
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['admin-audit'], queryFn: api.getAuditLogs });

  if (isLoading) return <div className="page-container text-slate-500">Loading audit logs...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">Immutable record of all platform actions — who, what, when</p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Details</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="text-slate-500">{timeAgo(log.created_at)}</td>
                <td className="font-medium text-slate-900">{log.user?.name ?? 'System'}</td>
                <td className="font-mono text-xs text-brand-700">{log.action}</td>
                <td className="text-slate-600">{log.resource_type}/{log.resource_id}</td>
                <td className="text-slate-600">{log.details}</td>
                <td className="font-mono text-xs text-slate-400">{log.ip_address ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
