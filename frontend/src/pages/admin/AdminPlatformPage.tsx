import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastContext } from '@/context/ToastContext';
import type { AlertRuleConfig, AuthConfig, CategoryConfig, NotificationChannelConfig, SeverityLevelConfig } from '@/lib/api';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'rules', label: 'Alert Rules' },
  { id: 'severity', label: 'Severity Levels' },
  { id: 'categories', label: 'Categories' },
  { id: 'channels', label: 'Notification Channels' },
  { id: 'auth', label: 'Authentication' },
  { id: 'backup', label: 'Backup & Restore' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function AdminPlatformPage() {
  const [tab, setTab] = useState<TabId>('rules');
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const { data: config, isLoading } = useQuery({ queryKey: ['platform-config'], queryFn: api.getPlatformConfig });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['platform-config'] });

  const saveRules = useMutation({
    mutationFn: api.updateAlertRules,
    onSuccess: () => { invalidate(); toast.success('Alert rules saved'); },
    onError: (e: Error) => toast.error('Failed to save alert rules', e.message),
  });
  const saveSeverity = useMutation({
    mutationFn: api.updateSeverityLevels,
    onSuccess: () => { invalidate(); toast.success('Severity levels saved'); },
    onError: (e: Error) => toast.error('Failed to save severity levels', e.message),
  });
  const saveCategories = useMutation({
    mutationFn: api.updateCategories,
    onSuccess: () => { invalidate(); toast.success('Categories saved'); },
    onError: (e: Error) => toast.error('Failed to save categories', e.message),
  });
  const saveChannels = useMutation({
    mutationFn: api.updateNotificationChannels,
    onSuccess: () => { invalidate(); toast.success('Notification channels saved'); },
    onError: (e: Error) => toast.error('Failed to save channels', e.message),
  });
  const saveAuth = useMutation({
    mutationFn: api.updateAuthConfig,
    onSuccess: () => { invalidate(); toast.success('Authentication settings saved'); },
    onError: (e: Error) => toast.error('Failed to save auth settings', e.message),
  });
  const backup = useMutation({
    mutationFn: api.backupPlatformConfig,
    onSuccess: (result) => {
      invalidate();
      localStorage.setItem('smartops_config_backup', JSON.stringify(result.snapshot));
      toast.success('Configuration backed up', result.backed_up_at);
    },
    onError: (e: Error) => toast.error('Backup failed', e.message),
  });
  const restore = useMutation({
    mutationFn: api.restorePlatformConfig,
    onSuccess: () => { invalidate(); toast.success('Configuration restored'); },
    onError: (e: Error) => toast.error('Restore failed', e.message),
  });

  if (isLoading || !config) return <div className="page-container text-slate-500">Loading platform configuration...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Platform Configuration</h1>
        <p className="page-subtitle">Alert rules, severity levels, categories, notifications, authentication, and backups</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === item.id ? 'bg-brand-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'rules' && (
        <AlertRulesSection
          rules={config.alert_rules}
          isSaving={saveRules.isPending}
          onSave={(rules) => saveRules.mutate(rules)}
        />
      )}
      {tab === 'severity' && (
        <SeveritySection
          levels={config.severity_levels}
          isSaving={saveSeverity.isPending}
          onSave={(levels) => saveSeverity.mutate(levels)}
        />
      )}
      {tab === 'categories' && (
        <CategoriesSection
          categories={config.categories}
          isSaving={saveCategories.isPending}
          onSave={(categories) => saveCategories.mutate(categories)}
        />
      )}
      {tab === 'channels' && (
        <ChannelsSection
          channels={config.notification_channels}
          isSaving={saveChannels.isPending}
          onSave={(channels) => saveChannels.mutate(channels)}
        />
      )}
      {tab === 'auth' && (
        <AuthSection
          auth={config.auth_config}
          isSaving={saveAuth.isPending}
          onSave={(auth) => saveAuth.mutate(auth)}
        />
      )}
      {tab === 'backup' && (
        <BackupSection
          lastBackupAt={config.last_backup_at}
          isBackingUp={backup.isPending}
          isRestoring={restore.isPending}
          onBackup={() => backup.mutate()}
          onRestore={() => {
            const stored = localStorage.getItem('smartops_config_backup');
            if (!stored) {
              toast.error('No local backup found', 'Create a backup first.');
              return;
            }
            restore.mutate(JSON.parse(stored) as Record<string, unknown>);
          }}
        />
      )}
    </div>
  );
}

function AlertRulesSection({
  rules,
  isSaving,
  onSave,
}: {
  rules: AlertRuleConfig[];
  isSaving: boolean;
  onSave: (rules: AlertRuleConfig[]) => void;
}) {
  const [items, setItems] = useState(rules);
  useEffect(() => setItems(rules), [rules]);
  return (
    <SectionCard title="Alert Rules" description="Configure ingestion and routing rules for monitoring sources.">
      <div className="space-y-3">
        {items.map((rule, index) => (
          <div key={rule.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs text-red-600"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" value={rule.name} onChange={(e) => {
                const next = [...items];
                next[index] = { ...rule, name: e.target.value };
                setItems(next);
              }} />
              <input className="input" value={rule.source} onChange={(e) => {
                const next = [...items];
                next[index] = { ...rule, source: e.target.value };
                setItems(next);
              }} />
              <input className="input sm:col-span-2" value={rule.condition} onChange={(e) => {
                const next = [...items];
                next[index] = { ...rule, condition: e.target.value };
                setItems(next);
              }} />
              <select className="input" value={rule.priority} onChange={(e) => {
                const next = [...items];
                next[index] = { ...rule, priority: e.target.value };
                setItems(next);
              }}>
                {['P1', 'P2', 'P3', 'P4', 'P5'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={rule.enabled} onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...rule, enabled: e.target.checked };
                  setItems(next);
                }} />
                Enabled
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            setItems([
              ...items,
              {
                id: `rule-${Date.now()}`,
                name: 'New rule',
                source: 'custom',
                condition: '',
                priority: 'P3',
                enabled: true,
              },
            ])
          }
        >
          <Plus className="h-4 w-4" /> Add rule
        </button>
        <button type="button" className="btn-primary" disabled={isSaving} onClick={() => onSave(items)}>Save alert rules</button>
      </div>
    </SectionCard>
  );
}

function SeveritySection({
  levels,
  isSaving,
  onSave,
}: {
  levels: SeverityLevelConfig[];
  isSaving: boolean;
  onSave: (levels: SeverityLevelConfig[]) => void;
}) {
  const [items, setItems] = useState(levels);
  useEffect(() => setItems(levels), [levels]);
  return (
    <SectionCard title="Severity Levels" description="Define priority labels used across alerts and incidents.">
      <div className="space-y-3">
        {items.map((level, index) => (
          <div key={level.code} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-5">
            <div className="font-semibold text-slate-900">{level.code}</div>
            <input className="input" value={level.label} onChange={(e) => {
              const next = [...items];
              next[index] = { ...level, label: e.target.value };
              setItems(next);
            }} />
            <input className="input sm:col-span-2" value={level.description} onChange={(e) => {
              const next = [...items];
              next[index] = { ...level, description: e.target.value };
              setItems(next);
            }} />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={level.enabled} onChange={(e) => {
                const next = [...items];
                next[index] = { ...level, enabled: e.target.checked };
                setItems(next);
              }} />
              Enabled
            </label>
          </div>
        ))}
      </div>
      <button type="button" className="btn-primary mt-4" disabled={isSaving} onClick={() => onSave(items)}>Save severity levels</button>
    </SectionCard>
  );
}

function CategoriesSection({
  categories,
  isSaving,
  onSave,
}: {
  categories: CategoryConfig[];
  isSaving: boolean;
  onSave: (categories: CategoryConfig[]) => void;
}) {
  const [items, setItems] = useState(categories);
  useEffect(() => setItems(categories), [categories]);
  return (
    <SectionCard title="Categories" description="Manage incident and alert classification categories.">
      <div className="space-y-3">
        {items.map((category, index) => (
          <div key={category.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-4">
            <input className="input" value={category.name} onChange={(e) => {
              const next = [...items];
              next[index] = { ...category, name: e.target.value };
              setItems(next);
            }} />
            <input className="input sm:col-span-2" value={category.description} onChange={(e) => {
              const next = [...items];
              next[index] = { ...category, description: e.target.value };
              setItems(next);
            }} />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={category.enabled} onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...category, enabled: e.target.checked };
                  setItems(next);
                }} />
                Enabled
              </label>
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs text-red-600"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            setItems([
              ...items,
              { id: `cat-${Date.now()}`, name: 'New category', description: '', enabled: true },
            ])
          }
        >
          <Plus className="h-4 w-4" /> Add category
        </button>
        <button type="button" className="btn-primary" disabled={isSaving} onClick={() => onSave(items)}>Save categories</button>
      </div>
    </SectionCard>
  );
}

function ChannelsSection({
  channels,
  isSaving,
  onSave,
}: {
  channels: NotificationChannelConfig[];
  isSaving: boolean;
  onSave: (channels: NotificationChannelConfig[]) => void;
}) {
  const [items, setItems] = useState(channels);
  useEffect(() => setItems(channels), [channels]);
  return (
    <SectionCard title="Notification Channels" description="Configure Email, Teams, Slack, and SMS delivery channels.">
      <div className="space-y-3">
        {items.map((channel, index) => (
          <div key={channel.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-medium text-slate-900">{channel.name}</div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={channel.enabled} onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...channel, enabled: e.target.checked };
                    setItems(next);
                  }} />
                  Enabled
                </label>
                <button
                  type="button"
                  className="btn-secondary px-2 py-1 text-xs text-red-600"
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            <textarea
              className="input w-full font-mono text-xs"
              rows={2}
              value={JSON.stringify(channel.config, null, 2)}
              onChange={(e) => {
                try {
                  const next = [...items];
                  next[index] = { ...channel, config: JSON.parse(e.target.value) as Record<string, string> };
                  setItems(next);
                } catch {
                  // ignore invalid JSON while typing
                }
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            setItems([
              ...items,
              { id: `channel-${Date.now()}`, name: 'New channel', enabled: false, config: {} },
            ])
          }
        >
          <Plus className="h-4 w-4" /> Add channel
        </button>
        <button type="button" className="btn-primary" disabled={isSaving} onClick={() => onSave(items)}>Save notification channels</button>
      </div>
    </SectionCard>
  );
}

function AuthSection({
  auth,
  isSaving,
  onSave,
}: {
  auth: AuthConfig;
  isSaving: boolean;
  onSave: (auth: Partial<AuthConfig>) => void;
}) {
  const [form, setForm] = useState(auth);
  useEffect(() => setForm(auth), [auth]);
  return (
    <SectionCard title="Authentication" description="Configure SSO, LDAP, and session security policies.">
      <div className="grid max-w-2xl gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.sso_enabled} onChange={(e) => setForm({ ...form, sso_enabled: e.target.checked })} />
          Enable SSO
        </label>
        <select className="input" value={form.sso_provider} onChange={(e) => setForm({ ...form, sso_provider: e.target.value })}>
          <option value="azure_ad">Azure AD / Entra ID</option>
          <option value="okta">Okta</option>
          <option value="google">Google Workspace</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.ldap_enabled} onChange={(e) => setForm({ ...form, ldap_enabled: e.target.checked })} />
          Enable LDAP / Active Directory
        </label>
        <input className="input" placeholder="LDAP host" value={form.ldap_host} onChange={(e) => setForm({ ...form, ldap_host: e.target.value })} />
        <input className="input" placeholder="Base DN" value={form.ldap_base_dn} onChange={(e) => setForm({ ...form, ldap_base_dn: e.target.value })} />
        <input className="input" type="number" placeholder="Session timeout (minutes)" value={form.session_timeout_minutes} onChange={(e) => setForm({ ...form, session_timeout_minutes: Number(e.target.value) })} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.mfa_required} onChange={(e) => setForm({ ...form, mfa_required: e.target.checked })} />
          Require MFA for all users
        </label>
      </div>
      <button type="button" className="btn-primary mt-4" disabled={isSaving} onClick={() => onSave(form)}>Save authentication settings</button>
    </SectionCard>
  );
}

function BackupSection({
  lastBackupAt,
  isBackingUp,
  isRestoring,
  onBackup,
  onRestore,
}: {
  lastBackupAt?: string;
  isBackingUp: boolean;
  isRestoring: boolean;
  onBackup: () => void;
  onRestore: () => void;
}) {
  return (
    <SectionCard title="Backup & Restore" description="Create and restore platform configuration snapshots.">
      <p className="mb-4 text-sm text-slate-600">
        Last backup: {lastBackupAt ? new Date(lastBackupAt).toLocaleString() : 'Never'}
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" disabled={isBackingUp} onClick={onBackup}>
          {isBackingUp ? 'Backing up...' : 'Create backup'}
        </button>
        <button type="button" className="btn-secondary" disabled={isRestoring} onClick={onRestore}>
          {isRestoring ? 'Restoring...' : 'Restore latest local backup'}
        </button>
      </div>
    </SectionCard>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="section-title">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
