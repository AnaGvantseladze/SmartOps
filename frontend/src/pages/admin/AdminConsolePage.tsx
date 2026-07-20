import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  Download,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Shield,
  SlidersHorizontal,
  Users,
  Webhook,
  Wrench,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PERMISSIONS } from '@/lib/permissions';
import { useAuth } from '@/context/AuthContext';

const adminLinks = [
  { to: '/settings/users-teams', icon: Users, label: 'Users & Teams', perm: PERMISSIONS.USERS_MANAGE, desc: 'Create, edit, delete users and assign roles' },
  { to: '/settings/system', icon: Wrench, label: 'Integrations', perm: PERMISSIONS.INTEGRATIONS_MANAGE, desc: 'Azure Monitor, Application Insights, APIs, and servers' },
  { to: '/settings/platform', icon: SlidersHorizontal, label: 'Platform Configuration', perm: PERMISSIONS.SYSTEM_CONFIG, desc: 'Alert rules, severity levels, categories, and notification channels' },
  { to: '/settings/permissions', icon: KeyRound, label: 'Permissions', perm: PERMISSIONS.PERMISSIONS_MANAGE, desc: 'Review role permission assignments' },
  { to: '/settings/webhooks', icon: Webhook, label: 'Webhook Integrations', perm: PERMISSIONS.INTEGRATIONS_MANAGE, desc: 'Inbound alert webhooks and API endpoints' },
  { to: '/settings/notifications', icon: Bell, label: 'Notification Policies', perm: PERMISSIONS.SETTINGS_NOTIFICATIONS, desc: 'Escalation policies and on-call schedules' },
  { to: '/settings/dashboard-config', icon: LayoutDashboard, label: 'Dashboard Parameters', perm: PERMISSIONS.DASHBOARD_MANAGE, desc: 'Configure refresh intervals, visibility, and display options' },
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
    <div className="page-container">
      <div className="mb-6 flex items-center gap-3">
        <Shield className="h-8 w-8 text-brand-700" />
        <div>
          <h1 className="page-title">Administration Console</h1>
          <p className="page-subtitle">Users, integrations, platform configuration, governance, and audit</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Users" value={users.length} />
        <StatCard label="Teams" value={teams.length} />
        <StatCard label="Audit entries" value={audit.length} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ to, icon: Icon, label, desc }) => (
          <NavLink key={to} to={to} className="card block p-5 transition-all hover:border-brand-300 hover:shadow-md">
            <Icon className="mb-2 h-6 w-6 text-brand-700" />
            <h3 className="font-display font-semibold text-slate-900">{label}</h3>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
