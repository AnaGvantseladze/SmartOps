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

const levelConfig: Record<PolicyLevel, { label: string; color: string; icon: React.ElementType }> = {
  organization: { label: 'Organization', color: 'border-purple-500/30 bg-purple-500/10', icon: Building2 },
  team: { label: 'Team', color: 'border-blue-500/30 bg-blue-500/10', icon: Users },
  user: { label: 'Personal', color: 'border-green-500/30 bg-green-500/10', icon: Bell },
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

  if (isLoading) return <div className="p-8 text-slate-400">Loading notification policies...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notification Settings</h1>
          <p className="text-slate-400">
            JSM-style notification policies — Organization → Team → Personal overrides
          </p>
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

      <div className="mb-6 rounded-lg border border-ops-border bg-ops-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Policy Hierarchy</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-purple-300">
            Organization Defaults
          </span>
          <span className="text-slate-600">→ overridden by →</span>
          <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-blue-300">
            Team Policy ({user?.team?.name ?? 'your team'})
          </span>
          <span className="text-slate-600">→ overridden by →</span>
          <span className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-1 text-green-300">
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
          <h2 className="mb-4 text-lg font-semibold text-white">Notification Log</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ops-border bg-ops-bg text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const Icon = channelIcons[log.channel] ?? Bell;
                  return (
                    <tr key={log.id} className="border-b border-ops-border">
                      <td className="px-4 py-3 text-slate-500">{timeAgo(log.sent_at)}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Icon className="h-3.5 w-3.5" />
                          {channelLabels[log.channel] ?? log.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-400">{log.event_type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-white">{log.subject}</td>
                      <td className="px-4 py-3">
                        <span className="badge bg-green-500/20 text-green-400">{log.status}</span>
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
    <div className={cn('card overflow-hidden border', config.color)}>
      <div className="border-b border-ops-border px-5 py-4">
        <div className="flex items-center gap-3">
          <LevelIcon className="h-5 w-5 text-slate-400" />
          <div>
            <h3 className="font-semibold text-white">{policy.name}</h3>
            <p className="text-xs text-slate-500">
              {config.label}
              {policy.team_name && ` — ${policy.team_name}`}
              {policy.user_name && ` — ${policy.user_name}`}
            </p>
          </div>
        </div>
        {policy.description && <p className="mt-2 text-sm text-slate-400">{policy.description}</p>}
      </div>

      <div className="divide-y divide-ops-border">
        {policy.rules.map((rule) => (
          <div key={rule.id} className="flex items-start gap-4 px-5 py-3">
            <span className="mt-0.5 w-6 text-center text-xs text-slate-600">{rule.sort_order}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{rule.name}</span>
                {rule.is_mandatory && (
                  <span className="badge border border-amber-500/30 bg-amber-500/10 text-amber-400">
                    <Lock className="mr-1 inline h-3 w-3" />
                    Mandatory
                  </span>
                )}
                {rule.suppress && (
                  <span className="badge bg-slate-700 text-slate-400">Suppress</span>
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
                    className="flex items-center gap-1 rounded bg-ops-bg px-2 py-0.5 text-xs text-slate-400"
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
