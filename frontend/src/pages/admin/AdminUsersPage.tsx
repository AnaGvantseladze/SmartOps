import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/permissions';

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: api.getAdminUsers });
  const { data: teams = [] } = useQuery({ queryKey: ['admin-teams'], queryFn: api.getAdminTeams });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'engineer', team_id: '' });

  const createUser = useMutation({
    mutationFn: api.createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'engineer', team_id: '' });
    },
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading users...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users & Teams</h1>
          <p className="text-slate-400">Add and manage users, teams, and their roles</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Add User</button>
      </div>

      {showForm && (
        <form
          className="card mb-6 grid gap-4 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
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
          <button type="submit" className="btn-primary sm:col-span-2" disabled={createUser.isPending}>
            {createUser.isPending ? 'Creating...' : 'Create User'}
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ops-border bg-ops-bg text-left text-slate-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ops-border">
                <td className="px-4 py-3 text-white">{u.name}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3 text-blue-300">{ROLE_LABELS[u.role] ?? u.role}</td>
                <td className="px-4 py-3 text-slate-400">{u.team?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-4 mt-8 text-lg font-semibold text-white">Teams</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {teams.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="font-medium text-white">{t.name}</div>
            <div className="text-sm text-slate-500">{t.member_count} members</div>
            {t.description && <p className="mt-1 text-xs text-slate-400">{t.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
