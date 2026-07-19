import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cloud, Copy, Play, Trash2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastContext } from '@/context/ToastContext';
import { CardSkeleton, PageHeaderSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { cn, statusBadge } from '@/lib/utils';

export function AdminAzureIntegrationPage() {
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    tenant_id: '',
    subscription_id: '',
    resource_group: '',
  });

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['azure-integrations'],
    queryFn: api.getAzureIntegrations,
  });

  const create = useMutation({
    mutationFn: api.createAzureIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['azure-integrations'] });
      setShowForm(false);
      setForm({ name: '', description: '', tenant_id: '', subscription_id: '', resource_group: '' });
      toast.success('Azure integration added', 'Webhook URL is ready for Azure Monitor.');
    },
    onError: (err) => toast.error('Failed to add integration', err instanceof Error ? err.message : undefined),
  });

  const deleteIntegration = useMutation({
    mutationFn: api.deleteAzureIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['azure-integrations'] });
      toast.success('Integration removed');
    },
    onError: (err) => toast.error('Failed to remove integration', err instanceof Error ? err.message : undefined),
  });

  const test = useMutation({
    mutationFn: api.testAzureWebhook,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['azure-integrations'] });
      toast.success('Test alert received', `Created alert #${data.alert_id}.`);
    },
    onError: (err) => toast.error('Test failed', err instanceof Error ? err.message : undefined),
  });

  const copyWebhook = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Webhook URL copied');
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <PageHeaderSkeleton />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6 flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Azure Integration</h1>
          <p className="page-subtitle">Connect Azure Monitor and receive real alerts via webhooks</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Integration
        </button>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="section-title mb-2">How it works</h2>
        <ol className="ml-5 list-decimal space-y-1 text-sm text-slate-600">
          <li>Add an Azure integration below. SmartOps generates a unique webhook URL.</li>
          <li>In Azure Monitor, create an alert rule and set the action to call that webhook URL.</li>
          <li>When Azure fires an alert, it appears automatically in the SmartOps Alerts console.</li>
        </ol>
        <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Local testing:</strong> Azure Monitor needs a public HTTPS URL. For local development,
          use a tunnel like <code className="rounded bg-amber-100 px-1">ngrok</code> or deploy the app first.
          Use the <strong>Test Webhook</strong> button to simulate an Azure alert without leaving your browser.
        </div>
      </div>

      {showForm && (
        <form
          className="card mb-6 grid gap-4 p-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({
              ...form,
              description: form.description || undefined,
              tenant_id: form.tenant_id || undefined,
              subscription_id: form.subscription_id || undefined,
              resource_group: form.resource_group || undefined,
            });
          }}
        >
          <input className="input" placeholder="Integration name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="input" placeholder="Azure Tenant ID (optional)" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} />
          <input className="input" placeholder="Subscription ID (optional)" value={form.subscription_id} onChange={(e) => setForm({ ...form, subscription_id: e.target.value })} />
          <input className="input" placeholder="Resource Group (optional)" value={form.resource_group} onChange={(e) => setForm({ ...form, resource_group: e.target.value })} />
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create Integration'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {integrations.length === 0 ? (
        <EmptyState
          title="No Azure integrations"
          message="Add an Azure integration to start receiving Azure Monitor alerts."
          action={
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Add Integration
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="card overflow-hidden">
              <div className="flex items-start justify-between border-b border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-slate-900">{integration.name}</h3>
                    <p className="text-sm text-slate-500">
                      {integration.alert_count} alert{integration.alert_count !== 1 ? 's' : ''} received
                      {integration.last_alert_at && ` · last ${new Date(integration.last_alert_at).toLocaleString()}`}
                    </p>
                  </div>
                </div>
                <span className={cn('badge border', statusBadge(integration.is_active ? 'connected' : 'pending'))}>
                  {integration.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="p-5">
                <label className="mb-1 block text-sm font-medium text-slate-700">Webhook URL</label>
                <div className="flex gap-2">
                  <input readOnly className="input flex-1 font-mono text-xs" value={integration.webhook_url} />
                  <button className="btn-secondary" onClick={() => copyWebhook(integration.webhook_url)}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-slate-500">Tenant ID</div>
                    <div className="text-sm text-slate-900">{integration.tenant_id || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Subscription ID</div>
                    <div className="text-sm text-slate-900">{integration.subscription_id || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Resource Group</div>
                    <div className="text-sm text-slate-900">{integration.resource_group || '—'}</div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button className="btn-secondary" onClick={() => test.mutate()} disabled={test.isPending}>
                    <Play className="h-4 w-4" />
                    {test.isPending ? 'Testing...' : 'Test Webhook'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      const active = !integration.is_active;
                      // Use a simple update via API; the UI will refresh after revalidation if wired.
                      // For now, just toggle by deleting and recreating is not ideal; use update API:
                      fetch(`/api/v1/azure/integrations/${integration.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('opscore_token')}` },
                        body: JSON.stringify({ is_active: active }),
                      }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['azure-integrations'] });
                        toast.success(active ? 'Integration activated' : 'Integration paused');
                      });
                    }}
                  >
                    {integration.is_active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    className="btn-secondary text-red-600 hover:bg-red-50"
                    onClick={() => deleteIntegration.mutate(integration.id)}
                    disabled={deleteIntegration.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
