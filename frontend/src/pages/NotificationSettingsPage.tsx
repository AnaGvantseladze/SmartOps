import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Smartphone,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import type { NotificationPolicy, PolicyLevel } from '@/types/notifications';

const channelIcons: Record<string, React.ElementType> = {
  push: Smartphone,
  sms: MessageSquare,
  phone: Phone,
  email: Mail,
  teams: Users,
  in_app: Bell,
};

const channelLabels: Record<string, string> = {
  push: 'Push',
  sms: 'SMS',
  phone: 'Phone',
  email: 'Email',
  teams: 'Teams',
  in_app: 'In-App',
};

const levelConfig: Record<PolicyLevel, { label: string; color: string; border: string; icon: React.ElementType }> = {
  organization: { label: 'Organization', color: 'bg-purple-50 text-purple-700', border: 'border-purple-200', icon: Building2 },
  team: { label: 'Team', color: 'bg-blue-50 text-blue-700', border: 'border-blue-200', icon: Users },
  user: { label: 'Personal', color: 'bg-green-50 text-green-700', border: 'border-green-200', icon: Bell },
};

export function NotificationSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['notification-policies-effective'],
    queryFn: api.getEffectiveNotificationPolicies,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['notification-log'],
    queryFn: api.getNotificationLog,
  });

  const testMutation = useMutation({
    mutationFn: api.testNotification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-log'] }),
  });

  if (isLoading) return <div className="page-container text-slate-500">Loading notification policies...</div>;

  return (
    <div className="page-container">
      <div className="mb-6 flex items-start justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Notification Settings</h1>
          <p className="page-subtitle">Organization → Team → Personal overrides</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => testMutation.mutate()}
          disabled={testMutation.isPending}
        >
          <Send className="h-4 w-4" />
          {testMutation.isPending ? 'Sending...' : 'Test Notification'}
        </button>
      </div>

      <div className="card mb-6 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Policy Hierarchy</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 font-medium text-purple-700">
            Organization Defaults
          </span>
          <span className="text-slate-400">→</span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-medium text-blue-700">
            Team Policy ({user?.team?.name ?? 'your team'})
          </span>
          <span className="text-slate-400">→</span>
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 font-medium text-green-700">
            Your Personal Rules
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          First matching rule wins. Rules marked <Lock className="inline h-3 w-3" /> mandatory cannot be disabled.
        </p>
      </div>

      <div className="space-y-6">
        {policies.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} />
        ))}
        {policies.length === 0 && (
          <p className="text-center text-slate-500">No notification policies configured.</p>
        )}
      </div>

      {logs.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-lg font-semibold text-slate-900">Notification Log</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Channel</th>
                  <th>Event</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const Icon = channelIcons[log.channel] ?? Bell;
                  return (
                    <tr key={log.id}>
                      <td className="text-slate-500">{timeAgo(log.sent_at)}</td>
                      <td>
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Icon className="h-3.5 w-3.5 text-slate-400" />
                          {channelLabels[log.channel] ?? log.channel}
                        </span>
                      </td>
                      <td className="capitalize text-slate-600">{log.event_type.replace(/_/g, ' ')}</td>
                      <td className="text-slate-900">{log.subject}</td>
                      <td>
                        <span className="badge border bg-green-50 text-green-700 border-green-200">{log.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PolicyCard({ policy }: { policy: NotificationPolicy }) {
  const config = levelConfig[policy.level];
  const LevelIcon = config.icon;

  return (
    <div className={cn('card overflow-hidden border', config.border)}>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <LevelIcon className="h-5 w-5 text-slate-400" />
          <div>
            <h3 className="font-display font-semibold text-slate-900">{policy.name}</h3>
            <p className="text-xs text-slate-500">
              {config.label}
              {policy.team_name && ` — ${policy.team_name}`}
              {policy.user_name && ` — ${policy.user_name}`}
            </p>
          </div>
        </div>
        {policy.description && <p className="mt-2 text-sm text-slate-600">{policy.description}</p>}
      </div>

      <div className="divide-y divide-slate-100">
        {policy.rules.map((rule) => (
          <div key={rule.id} className="flex items-start gap-4 px-5 py-3">
            <span className="mt-0.5 w-6 text-center text-xs text-slate-400">{rule.sort_order}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{rule.name}</span>
                {rule.is_mandatory && (
                  <span className="badge border bg-amber-50 text-amber-700 border-amber-200">
                    <Lock className="mr-1 inline h-3 w-3" />
                    Mandatory
                  </span>
                )}
                {rule.suppress && (
                  <span className="badge border bg-slate-100 text-slate-600">Suppress</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                {rule.priority_filter && <span>Priority: {rule.priority_filter}</span>}
                {rule.tier_filter && <span>Tier: {rule.tier_filter}</span>}
                {rule.time_of_day !== 'any' && (
                  <span>Time: {rule.time_of_day.replace(/_/g, ' ')}</span>
                )}
                {rule.on_call_only && <span>On-call only</span>}
                {rule.delay_minutes > 0 && <span>Delay: {rule.delay_minutes}m</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {rule.channels.map((ch) => {
                const Icon = channelIcons[ch] ?? Bell;
                return (
                  <span
                    key={ch}
                    className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
                    title={channelLabels[ch]}
                  >
                    <Icon className="h-3 w-3" />
                    {channelLabels[ch]}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
