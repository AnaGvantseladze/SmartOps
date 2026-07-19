import { NavLink, Outlet } from 'react-router-dom';
import { Bell, CalendarClock, Settings, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const settingsNav = [
  { to: '/settings', icon: User, label: 'Profile', end: true, permission: PERMISSIONS.SETTINGS_VIEW },
  { to: '/settings/notifications', icon: Bell, label: 'Notification Policies', permission: PERMISSIONS.SETTINGS_NOTIFICATIONS },
  { to: '/settings/on-call', icon: CalendarClock, label: 'On-Call Schedules', permission: PERMISSIONS.SETTINGS_ON_CALL },
];

export function SettingsLayout() {
  const { can } = useAuth();
  const visible = settingsNav.filter((item) => can(item.permission));

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-56 shrink-0 border-r border-ops-border bg-ops-surface p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Settings className="h-5 w-5 text-slate-400" />
          <h2 className="font-semibold text-white">Settings</h2>
        </div>
        <nav className="space-y-1">
          {visible.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-ops-accent/20 text-blue-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
