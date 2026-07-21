import { Monitor, Moon, Sun } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { PERMISSIONS, ROLE_LABELS } from '@/lib/permissions';
import type { ThemeMode } from '@/lib/theme';
import { cn } from '@/lib/utils';

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun; description: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Bright backgrounds and high contrast' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Dimmed surfaces for low-light environments' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Match your device appearance setting' },
];

export function SettingsProfilePage() {
  const { user, can, landingPage } = useAuth();
  const { theme, setTheme } = useTheme();

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

      <div className="grid max-w-3xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="card p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-900 text-xl font-bold text-white dark:bg-brand-700">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">{user.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">Team</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{user.team?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">Role</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{ROLE_LABELS[user.role] ?? user.role}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Default landing page</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{landingPage}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-6">
          <div className="mb-4">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Appearance</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose how SmartOps looks on this device. Your preference is saved locally.
            </p>
          </div>

          <div className="space-y-2">
            {themeOptions.map(({ value, label, icon: Icon, description }) => {
              const selected = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                    selected
                      ? 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/40'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      selected
                        ? 'bg-brand-900 text-white dark:bg-brand-700'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
        {can(PERMISSIONS.SETTINGS_NOTIFICATIONS) && (
          <NavLink
            to="/settings/notifications"
            className="card block p-5 transition-all hover:border-brand-300 hover:shadow-md dark:hover:border-brand-600"
          >
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">Notification Policies</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Configure how and when you receive alerts, incidents, and change notifications.
            </p>
          </NavLink>
        )}
        {can(PERMISSIONS.SETTINGS_ON_CALL) && (
          <NavLink
            to="/on-call"
            className="card block p-5 transition-all hover:border-brand-300 hover:shadow-md dark:hover:border-brand-600"
          >
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">On-Call Schedules</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View rotations, upcoming shifts, overrides, and escalation policies.
            </p>
          </NavLink>
        )}
        {managementLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className="card block p-5 transition-all hover:border-brand-300 hover:shadow-md dark:hover:border-brand-600"
          >
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">{link.title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{link.description}</p>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
