import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';

const PAGE_SIZE = 25;

export function AdminAuditPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(0);

  const { data: logs = [], isLoading } = useQuery({ queryKey: ['admin-audit'], queryFn: api.getAuditLogs });

  const actions = useMemo(() => {
    const unique = new Set(logs.map((log) => log.action));
    return Array.from(unique).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (!query) return true;
      const haystack = [
        log.user?.name,
        log.user?.email,
        log.action,
        log.resource_type,
        log.resource_id,
        log.details,
        log.ip_address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [logs, search, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageLogs = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (isLoading) return <div className="page-container text-slate-500">Loading audit logs...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">Immutable record of all platform actions — who, what, when</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          className="input min-w-[220px]"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <select
          className="input"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
        <span className="self-center text-sm text-slate-500">
          {filtered.length} result{filtered.length === 1 ? '' : 's'}
        </span>
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
            {pageLogs.map((log) => (
              <tr key={log.id}>
                <td className="text-slate-500">{timeAgo(log.created_at)}</td>
                <td className="font-medium text-slate-900">{log.user?.name ?? 'System'}</td>
                <td className="font-mono text-xs text-brand-700">{log.action}</td>
                <td className="text-slate-600">{log.resource_type}/{log.resource_id}</td>
                <td className="text-slate-600">{log.details}</td>
                <td className="font-mono text-xs text-slate-400">{log.ip_address ?? '—'}</td>
              </tr>
            ))}
            {pageLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">No audit logs match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            className="btn-secondary"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
