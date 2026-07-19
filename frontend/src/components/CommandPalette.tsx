import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  to: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const { can, canNav } = useAuth();

  const commands = useMemo<Command[]>(() => {
    const all: Command[] = [
      { id: 'dashboard', label: 'Go to Dashboard', to: '/', shortcut: 'G D' },
      { id: 'alerts', label: 'Go to Alerts', to: '/alerts', shortcut: 'G A' },
      { id: 'incidents', label: 'Go to Incidents', to: '/incidents', shortcut: 'G I' },
      { id: 'changes', label: 'Go to Changes', to: '/changes', shortcut: 'G C' },
      { id: 'services', label: 'Go to Services', to: '/services', shortcut: 'G S' },
      { id: 'settings', label: 'Go to Settings', to: '/settings', shortcut: 'G P' },
      { id: 'notifications', label: 'Go to Notification Settings', to: '/settings/notifications' },
      { id: 'on-call', label: 'Go to On-Call Schedules', to: '/settings/on-call' },
      { id: 'admin', label: 'Go to Admin Console', to: '/settings/admin' },
      { id: 'users', label: 'Go to Users & Teams', to: '/settings/users-teams' },
      { id: 'system', label: 'Go to System Configuration', to: '/settings/system' },
      { id: 'audit', label: 'Go to Audit Logs', to: '/settings/audit' },
      { id: 'export', label: 'Go to Export Data', to: '/settings/export' },
    ];
    return all.filter((cmd) => {
      if (cmd.to.startsWith('/settings')) {
        if (cmd.to === '/settings') return true;
        if (cmd.to === '/settings/admin' || cmd.to === '/settings/users-teams') return canNav('administration');
      }
      return canNav(cmd.id.split('-')[0]);
    });
  }, [can, canNav]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' && filtered[selected]) {
        e.preventDefault();
        navigate(filtered[selected].to);
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, filtered, selected, navigate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-24">
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Search pages and actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">No results found</div>
          )}
          {filtered.map((cmd, idx) => (
            <button
              key={cmd.id}
              onClick={() => {
                navigate(cmd.to);
                setOpen(false);
                setQuery('');
              }}
              className={cn(
                'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors',
                idx === selected ? 'bg-brand-50 text-brand-900' : 'text-slate-700 hover:bg-slate-50'
              )}
            >
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{cmd.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
