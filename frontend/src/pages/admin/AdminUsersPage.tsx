import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/permissions';

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'engineer', team_id: '' });
  const [error, setError] = useState('');

  const { data: users = [], isLoading, isError, error: loadError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: api.getAdminUsers,
  });
  const { data: teams = [] } = useQuery({ queryKey: ['admin-teams'], queryFn: api.getAdminTeams });

  const createUser = useMutation({
    mutationFn: api.createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'engineer', team_id: '' });
      setError('');
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    },
  });

  if (isLoading) return <div className="page-container text-slate-500">Loading users...</div>;

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Users & Teams</h1>
          <p className="page-subtitle">Add and manage users, teams, and their roles</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Add User</button>
      </div>

      {isError && (
        <p className="mb-4 text-sm text-red-600">
          Failed to load users: {loadError instanceof Error ? loadError.message : 'Unknown error'}
        </p>
      )}

      {showForm && (
        <form
          className="card mb-6 grid gap-4 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            createUser.mutate({
              ...form,
              team_id: form.team_id ? Number(form.team_id) : undefined,
            });
          }}
        >
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select className="input" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button type="submit" className="btn-primary sm:col-span-2" disabled={createUser.isPending}>
            {createUser.isPending ? 'Creating...' : 'Create User'}
          </button>
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Team</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-slate-900">{u.name}</td>
                <td className="text-slate-600">{u.email}</td>
                <td>
                  <span className="badge border bg-brand-50 text-brand-700 border-brand-200">{ROLE_LABELS[u.role] ?? u.role}</span>
                </td>
                <td className="text-slate-600">{u.team?.name ?? '—'}</td>
                <td>
                  <span className={`badge border ${u.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title mb-4 mt-8">Teams</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {teams.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="font-medium text-slate-900">{t.name}</div>
            <div className="text-sm text-slate-500">{t.member_count} members</div>
            {t.description && <p className="mt-1 text-xs text-slate-600">{t.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
