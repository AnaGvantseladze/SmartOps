import { NavLink, Outlet } from 'react-router-dom';
import {
  Bell,
  CalendarClock,
  Download,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const generalNav = [
  { to: '/settings', icon: User, label: 'Profile', end: true, permission: PERMISSIONS.SETTINGS_VIEW },
  { to: '/settings/notifications', icon: Bell, label: 'Notification Policies', permission: PERMISSIONS.SETTINGS_NOTIFICATIONS },
  { to: '/settings/on-call', icon: CalendarClock, label: 'On-Call Schedules', permission: PERMISSIONS.SETTINGS_ON_CALL },
];

const adminNav = [
  { to: '/settings/admin', icon: Shield, label: 'Admin Console', end: true, permission: PERMISSIONS.USERS_MANAGE },
  { to: '/settings/users-teams', icon: Users, label: 'Users & Teams', permission: PERMISSIONS.USERS_MANAGE },
  { to: '/settings/system', icon: Wrench, label: 'System & Integrations', permission: PERMISSIONS.SYSTEM_CONFIG },
  { to: '/settings/dashboard-config', icon: LayoutDashboard, label: 'Dashboard Parameters', permission: PERMISSIONS.DASHBOARD_MANAGE },
  { to: '/settings/audit', icon: ScrollText, label: 'Audit Logs', permission: PERMISSIONS.AUDIT_VIEW },
  { to: '/settings/export', icon: Download, label: 'Export Data', permission: PERMISSIONS.EXPORT_DATA },
];

export function SettingsLayout() {
  const { can } = useAuth();
  const visibleGeneral = generalNav.filter((item) => can(item.permission));
  const visibleAdmin = adminNav.filter((item) => can(item.permission));

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Settings className="h-5 w-5 text-slate-400" />
          <h2 className="font-display font-semibold text-slate-900">Settings</h2>
        </div>

        {visibleGeneral.length > 0 && (
          <nav className="space-y-1">
            {visibleGeneral.map(({ to, icon: Icon, label, end }) => (
              <NavItem key={to} to={to} icon={Icon} label={label} end={end} />
            ))}
          </nav>
        )}

        {visibleAdmin.length > 0 && (
          <>
            <div className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Administration
            </div>
            <nav className="space-y-1">
              {visibleAdmin.map(({ to, icon: Icon, label, end }) => (
                <NavItem key={to} to={to} icon={Icon} label={label} end={end} />
              ))}
            </nav>
          </>
        )}
      </aside>
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet />
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-50 text-brand-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}
