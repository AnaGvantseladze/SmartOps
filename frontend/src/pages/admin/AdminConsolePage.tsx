import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  Download,
  LayoutDashboard,
  ScrollText,
  Shield,
  Users,
  Wrench,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PERMISSIONS } from '@/lib/permissions';
import { useAuth } from '@/context/AuthContext';

const adminLinks = [
  { to: '/settings/users-teams', icon: Users, label: 'Users & Teams', perm: PERMISSIONS.USERS_MANAGE, desc: 'Add and manage users, teams, and their roles' },
  { to: '/settings/system', icon: Wrench, label: 'System Configuration', perm: PERMISSIONS.SYSTEM_CONFIG, desc: 'Add services, integrations, and system parameters' },
  { to: '/alerts', icon: Bell, label: 'Alerts & Incidents', perm: PERMISSIONS.ALERTS_MANAGE, desc: 'View, edit, and change status of alerts and incidents' },
  { to: '/settings/notifications', icon: Bell, label: 'Schedules & Policies', perm: PERMISSIONS.SCHEDULES_MANAGE, desc: 'Manage notification policies and on-call schedules' },
  { to: '/settings/dashboard-config', icon: LayoutDashboard, label: 'Dashboard Parameters', perm: PERMISSIONS.DASHBOARD_MANAGE, desc: 'Configure refresh intervals, date ranges, and display options' },
  { to: '/settings/audit', icon: ScrollText, label: 'Audit Logs', perm: PERMISSIONS.AUDIT_VIEW, desc: 'View audit trail of all platform actions' },
  { to: '/settings/export', icon: Download, label: 'Export Data', perm: PERMISSIONS.EXPORT_DATA, desc: 'Export alerts, incidents, changes, and audit data' },
];

export function AdminConsolePage() {
  const { can } = useAuth();
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: api.getAdminUsers, enabled: can(PERMISSIONS.USERS_MANAGE) });
  const { data: teams = [] } = useQuery({ queryKey: ['admin-teams'], queryFn: api.getAdminTeams, enabled: can(PERMISSIONS.TEAMS_MANAGE) });
  const { data: audit = [] } = useQuery({ queryKey: ['admin-audit'], queryFn: api.getAuditLogs, enabled: can(PERMISSIONS.AUDIT_VIEW) });

  const links = adminLinks.filter((l) => can(l.perm));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Shield className="h-8 w-8 text-ops-accent" />
        <div>
          <h1 className="text-2xl font-bold text-white">Administration Console</h1>
          <p className="text-slate-400">Platform configuration, governance, and audit</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Users" value={users.length} />
        <StatCard label="Teams" value={teams.length} />
        <StatCard label="Audit entries" value={audit.length} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ to, icon: Icon, label, desc }) => (
          <NavLink key={to} to={to} className="card block p-5 transition-colors hover:border-ops-accent/40">
            <Icon className="mb-2 h-6 w-6 text-ops-accent" />
            <h3 className="font-semibold text-white">{label}</h3>
            <p className="mt-1 text-sm text-slate-400">{desc}</p>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
