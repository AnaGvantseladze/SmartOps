import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Save, X } from 'lucide-react';
import { api, type PermissionCatalogEntry, type RolePermissionMatrix } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/permissions';
import { useToastContext } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

export function AdminPermissionsPage() {
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const { data: matrix = [], isLoading } = useQuery({
    queryKey: ['permissions-matrix'],
    queryFn: api.getPermissionsMatrix,
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: api.getPermissionCatalog,
  });

  const savePermissions = useMutation({
    mutationFn: ({ role, permissions }: { role: string; permissions: string[] }) =>
      api.updateRolePermissions(role, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions-matrix'] });
      setEditingRole(null);
      toast.success('Role permissions saved');
    },
    onError: (err: Error) => toast.error('Failed to save permissions', err.message),
  });

  const resetPermissions = useMutation({
    mutationFn: api.resetRolePermissions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions-matrix'] });
      setEditingRole(null);
      toast.success('Role permissions reset to defaults');
    },
    onError: (err: Error) => toast.error('Failed to reset permissions', err.message),
  });

  if (isLoading) return <div className="page-container text-slate-500">Loading permissions...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Role Permissions</h1>
        <p className="page-subtitle">Review and customize permission assignments for each platform role</p>
      </div>

      <div className="space-y-4">
        {matrix.map((entry) => (
          <RolePermissionCard
            key={entry.role}
            entry={entry}
            catalog={catalog}
            isEditing={editingRole === entry.role}
            isSaving={savePermissions.isPending}
            isResetting={resetPermissions.isPending}
            onEdit={() => setEditingRole(entry.role)}
            onCancel={() => setEditingRole(null)}
            onSave={(permissions) => savePermissions.mutate({ role: entry.role, permissions })}
            onReset={() => {
              if (window.confirm(`Reset ${ROLE_LABELS[entry.role] ?? entry.role_label} to default permissions?`)) {
                resetPermissions.mutate(entry.role);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function RolePermissionCard({
  entry,
  catalog,
  isEditing,
  isSaving,
  isResetting,
  onEdit,
  onCancel,
  onSave,
  onReset,
}: {
  entry: RolePermissionMatrix;
  catalog: PermissionCatalogEntry[];
  isEditing: boolean;
  isSaving: boolean;
  isResetting: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (permissions: string[]) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<string[]>(entry.permissions);
  const [addSelection, setAddSelection] = useState('');

  useEffect(() => {
    if (isEditing) setDraft(entry.permissions);
  }, [isEditing, entry.permissions]);

  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, PermissionCatalogEntry[]>();
    for (const item of catalog) {
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    }
    return Array.from(groups.entries());
  }, [catalog]);

  const unassigned = catalog.filter((item) => !draft.includes(item.value));

  function togglePermission(value: string) {
    setDraft((current) =>
      current.includes(value) ? current.filter((perm) => perm !== value) : [...current, value].sort(),
    );
  }

  function addPermission() {
    if (!addSelection || draft.includes(addSelection)) return;
    setDraft((current) => [...current, addSelection].sort());
    setAddSelection('');
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            {ROLE_LABELS[entry.role] ?? entry.role_label}
          </h2>
          <p className="text-sm text-slate-500">
            {isEditing ? `${draft.length} permissions selected` : `${entry.permissions.length} permissions assigned`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isEditing ? (
            <>
              <button type="button" className="btn-primary text-sm" onClick={onEdit}>
                Edit permissions
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={isResetting}
                onClick={onReset}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset defaults
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={isSaving}
                onClick={() => onSave(draft)}
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={onCancel}>
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="min-w-[220px] flex-1">
              <label htmlFor={`add-perm-${entry.role}`} className="mb-1 block text-xs font-medium text-slate-600">
                Add permission
              </label>
              <select
                id={`add-perm-${entry.role}`}
                className="input w-full"
                value={addSelection}
                onChange={(e) => setAddSelection(e.target.value)}
              >
                <option value="">Select a permission...</option>
                {unassigned.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label} ({item.value})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-secondary"
              disabled={!addSelection}
              onClick={addPermission}
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {groupedCatalog.map(([group, items]) => (
            <div key={group}>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">{group}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => {
                  const checked = draft.includes(item.value);
                  return (
                    <label
                      key={item.value}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                        checked ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => togglePermission(item.value)}
                      />
                      <span>
                        <span className="block font-medium text-slate-900">{item.label}</span>
                        <span className="font-mono text-xs text-slate-500">{item.value}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {entry.permissions.map((permission) => {
            const label = catalog.find((item) => item.value === permission)?.label ?? permission;
            return (
              <span
                key={permission}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                title={permission}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
