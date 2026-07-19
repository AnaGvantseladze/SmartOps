import { Bell, LayoutDashboard, AlertTriangle, Siren, GitPullRequest, Server, Search, LogOut, CalendarClock, Settings, ChevronDown } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS, ROLE_LABELS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const allNavItems = [
  { key: 'dashboard', to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'alerts', to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { key: 'incidents', to: '/incidents', icon: Siren, label: 'Incidents' },
  { key: 'changes', to: '/changes', icon: GitPullRequest, label: 'Changes' },
  { key: 'services', to: '/services', icon: Server, label: 'Services' },
];

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, canNav, can } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleNav = allNavItems.filter((item) => canNav(item.key));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const goTo = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-ops-border bg-ops-surface/95 backdrop-blur">
        <div className="flex h-14 items-center gap-6 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ops-accent text-sm">OC</div>
            <span>OpsCore</span>
          </NavLink>

          <nav className="flex items-center gap-1">
            {visibleNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive ? 'bg-ops-accent/20 text-blue-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-md border border-ops-border px-3 py-1.5 text-sm text-slate-400 hover:border-slate-500 hover:text-white">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="rounded bg-slate-800 px-1.5 text-xs">⌘K</kbd>
            </button>
            <button className="relative rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                3
              </span>
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-md border border-ops-border px-3 py-1.5 hover:bg-slate-800"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold">
                  {user ? initials(user.name) : '??'}
                </div>
                <div className="hidden text-left sm:block">
                  <div className="text-sm text-white">{user?.name}</div>
                  <div className="text-xs text-slate-500">{user ? ROLE_LABELS[user.role] ?? user.role : ''}</div>
                </div>
                <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform', menuOpen && 'rotate-180')} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-ops-border bg-ops-surface py-1 shadow-xl">
                  <div className="border-b border-ops-border px-4 py-3">
                    <div className="text-sm font-medium text-white">{user?.name}</div>
                    <div className="text-xs text-slate-500">{user?.email}</div>
                  </div>
                  {can(PERMISSIONS.SETTINGS_VIEW) && (
                    <button
                      onClick={() => goTo('/settings')}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      <Settings className="h-4 w-4" />
                      Settings & Configuration
                    </button>
                  )}
                  {can(PERMISSIONS.SETTINGS_NOTIFICATIONS) && (
                    <button
                      onClick={() => goTo('/settings/notifications')}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      <Bell className="h-4 w-4" />
                      Notification Policies
                    </button>
                  )}
                  {can(PERMISSIONS.SETTINGS_ON_CALL) && (
                    <button
                      onClick={() => goTo('/settings/on-call')}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      <CalendarClock className="h-4 w-4" />
                      On-Call Schedules
                    </button>
                  )}
                  <div className="my-1 border-t border-ops-border" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-800"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
