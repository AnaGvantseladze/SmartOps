import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS, ROLE_LABELS } from '@/lib/permissions';

export function SettingsProfilePage() {
  const { user, can, landingPage } = useAuth();

  if (!user) return null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Profile & Configuration</h1>
        <p className="text-slate-400">Manage your account and operational preferences</p>
      </div>

      <div className="card max-w-lg p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold">
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{user.name}</h2>
            <p className="text-sm text-slate-400">{user.email}</p>
            <p className="text-sm text-blue-400">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-ops-border pb-3">
            <dt className="text-slate-500">Team</dt>
            <dd className="text-white">{user.team?.name ?? '—'}</dd>
          </div>
          <div className="flex justify-between border-b border-ops-border pb-3">
            <dt className="text-slate-500">Role</dt>
            <dd className="text-white">{ROLE_LABELS[user.role] ?? user.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Default landing page</dt>
            <dd className="text-white">{landingPage}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
        {can(PERMISSIONS.SETTINGS_NOTIFICATIONS) && (
          <NavLink
            to="/settings/notifications"
            className="card block p-5 transition-colors hover:border-blue-500/30"
          >
            <h3 className="font-semibold text-white">Notification Policies</h3>
            <p className="mt-1 text-sm text-slate-400">
              Configure how and when you receive alerts, incidents, and change notifications.
            </p>
          </NavLink>
        )}
        {can(PERMISSIONS.SETTINGS_ON_CALL) && (
          <NavLink
            to="/settings/on-call"
            className="card block p-5 transition-colors hover:border-blue-500/30"
          >
            <h3 className="font-semibold text-white">On-Call Schedules</h3>
            <p className="mt-1 text-sm text-slate-400">
              View rotations, upcoming shifts, overrides, and escalation policies.
            </p>
          </NavLink>
        )}
      </div>
    </div>
  );
}
