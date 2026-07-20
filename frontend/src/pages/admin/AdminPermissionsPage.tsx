import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/permissions';

export function AdminPermissionsPage() {
  const { data: matrix = [], isLoading } = useQuery({
    queryKey: ['permissions-matrix'],
    queryFn: api.getPermissionsMatrix,
  });

  if (isLoading) return <div className="page-container text-slate-500">Loading permissions...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Role Permissions</h1>
        <p className="page-subtitle">Review permission assignments for each platform role</p>
      </div>

      <div className="space-y-4">
        {matrix.map((entry) => (
          <div key={entry.role} className="card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  {ROLE_LABELS[entry.role] ?? entry.role_label}
                </h2>
                <p className="text-sm text-slate-500">{entry.permissions.length} permissions assigned</p>
              </div>
              <span className="badge border border-brand-200 bg-brand-50 text-brand-700">{entry.role}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.permissions.map((permission) => (
                <span key={permission} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                  {permission}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
