import { Bell, LayoutDashboard, AlertTriangle, Siren, GitPullRequest, Server, Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/incidents', icon: Siren, label: 'Incidents' },
  { to: '/changes', icon: GitPullRequest, label: 'Changes' },
  { to: '/services', icon: Server, label: 'Services' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-ops-border bg-ops-surface/95 backdrop-blur">
        <div className="flex h-14 items-center gap-6 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ops-accent text-sm">OC</div>
            <span>OpsCore</span>
          </NavLink>

          <nav className="flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, label }) => (
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
            <div className="flex items-center gap-2 rounded-md border border-ops-border px-3 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold">NN</div>
              <span className="text-sm">Nika NOC</span>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
