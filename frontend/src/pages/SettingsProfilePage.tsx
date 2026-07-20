import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS, ROLE_LABELS } from '@/lib/permissions';

export function SettingsProfilePage() {
  const { user, can, landingPage } = useAuth();

  if (!user) return null;

  const managementLinks = [
    {
      to: '/settings/dashboard-config',
      title: 'Dashboard Parameters',
      description: 'Configure refresh intervals, date ranges, and organization-wide visibility.',
      permission: PERMISSIONS.DASHBOARD_MANAGE,
    },
    {
      to: '/settings/export',
      title: 'Export Data',
      description: 'Generate reports and export alerts, incidents, changes, and audit data.',
      permission: PERMISSIONS.EXPORT_DATA,
    },
    {
      to: '/settings/audit',
      title: 'Audit Logs',
      description: 'Review operational actions and compliance history across the platform.',
      permission: PERMISSIONS.AUDIT_VIEW,
    },
  ].filter((link) => can(link.permission));

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Profile & Configuration</h1>
        <p className="page-subtitle">Manage your account and operational preferences</p>
      </div>

      <div className="card max-w-lg p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-900 text-xl font-bold text-white">
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">{user.name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            <p className="text-sm font-medium text-brand-700">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <dt className="text-slate-500">Team</dt>
            <dd className="font-medium text-slate-900">{user.team?.name ?? '—'}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-3">
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium text-slate-900">{ROLE_LABELS[user.role] ?? user.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Default landing page</dt>
            <dd className="font-medium text-slate-900">{landingPage}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
        {can(PERMISSIONS.SETTINGS_NOTIFICATIONS) && (
          <NavLink
            to="/settings/notifications"
            className="card block p-5 transition-all hover:border-brand-300 hover:shadow-md"
          >
            <h3 className="font-display font-semibold text-slate-900">Notification Policies</h3>
            <p className="mt-1 text-sm text-slate-500">
              Configure how and when you receive alerts, incidents, and change notifications.
            </p>
          </NavLink>
        )}
        {can(PERMISSIONS.SETTINGS_ON_CALL) && (
          <NavLink
            to="/on-call"
            className="card block p-5 transition-all hover:border-brand-300 hover:shadow-md"
          >
            <h3 className="font-display font-semibold text-slate-900">On-Call Schedules</h3>
            <p className="mt-1 text-sm text-slate-500">
              View rotations, upcoming shifts, overrides, and escalation policies.
            </p>
          </NavLink>
        )}
        {managementLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className="card block p-5 transition-all hover:border-brand-300 hover:shadow-md"
          >
            <h3 className="font-display font-semibold text-slate-900">{link.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{link.description}</p>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
