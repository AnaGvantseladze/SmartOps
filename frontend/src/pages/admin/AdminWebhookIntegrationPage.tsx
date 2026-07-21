import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Webhook, Copy, Play, Trash2, Plus, Terminal } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastContext } from '@/context/ToastContext';
import { CardSkeleton, PageHeaderSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { cn, statusBadge } from '@/lib/utils';
import type { WebhookIntegration } from '@/lib/api';

const SAMPLE_PAYLOAD = `{
  "title": "High CPU usage",
  "description": "CPU exceeded 90% for 5 minutes",
  "priority": "P2",
  "source": "postman",
  "service": "api-gateway"
}`;

function webhookPostUrl(integrationId: number): string {
  return `${window.location.origin}/api/v1/webhooks/${integrationId}`;
}

function buildCurlCommand(integration: WebhookIntegration): string {
  const url = webhookPostUrl(integration.id);
  const headers = ['-H "Content-Type: application/json"'];
  if (integration.webhook_secret) {
    headers.push(`-H "X-Webhook-Secret: ${integration.webhook_secret}"`);
  }
  return `curl -X POST "${url}" \\
${headers.map((h) => `  ${h} \\
`).join('')}  -d '${SAMPLE_PAYLOAD.replace(/\n/g, ' ')}'`;
}

export function AdminWebhookIntegrationPage() {
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    webhook_secret: '',
  });

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['webhook-integrations'],
    queryFn: api.getWebhookIntegrations,
  });

  const create = useMutation({
    mutationFn: api.createWebhookIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-integrations'] });
      setShowForm(false);
      setForm({ name: '', description: '', webhook_secret: '' });
      toast.success('Webhook integration added', 'Use the URL below to send alerts via POST.');
    },
    onError: (err) => toast.error('Failed to add integration', err instanceof Error ? err.message : undefined),
  });

  const deleteIntegration = useMutation({
    mutationFn: api.deleteWebhookIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-integrations'] });
      toast.success('Integration removed');
    },
    onError: (err) => toast.error('Failed to remove integration', err instanceof Error ? err.message : undefined),
  });

  const updateIntegration = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.updateWebhookIntegration(id, { is_active }),
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['webhook-integrations'] });
      toast.success(is_active ? 'Integration activated' : 'Integration paused');
    },
    onError: (err) => toast.error('Failed to update integration', err instanceof Error ? err.message : undefined),
  });

  const test = useMutation({
    mutationFn: api.testWebhookIntegration,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-integrations'] });
      toast.success('Test alert received', `Created alert #${data.alert_id}.`);
    },
    onError: (err) => toast.error('Test failed', err instanceof Error ? err.message : undefined),
  });

  const copyWebhook = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Webhook URL copied');
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(SAMPLE_PAYLOAD);
    toast.success('Sample payload copied');
  };

  const copyCurl = (integration: WebhookIntegration) => {
    navigator.clipboard.writeText(buildCurlCommand(integration));
    toast.success('curl command copied');
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
          <h1 className="page-title">Webhook Integrations</h1>
          <p className="page-subtitle">Receive alerts from Postman, monitoring tools, or any HTTP POST client</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Integration
        </button>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="section-title mb-2">How it works</h2>
        <ol className="ml-5 list-decimal space-y-1 text-sm text-slate-600">
          <li>Create a webhook integration below. SmartOps generates a unique POST URL.</li>
          <li>Send a JSON payload to that URL from Postman, curl, or any monitoring tool.</li>
          <li>The alert appears automatically in the SmartOps Alerts console.</li>
        </ol>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">Sample POST payload</h3>
            <button className="btn-secondary py-1 text-xs" onClick={copyPayload}>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{SAMPLE_PAYLOAD}</pre>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <strong>Postman:</strong> use the webhook URL shown below. Set method to{' '}
          <code className="rounded bg-blue-100 px-1">POST</code>, header{' '}
          <code className="rounded bg-blue-100 px-1">Content-Type: application/json</code>.
          Verify the API: <code className="rounded bg-blue-100 px-1">GET /api/v1/webhooks/ping</code>
        </div>
      </div>

      {showForm && (
        <form
          className="card mb-6 grid gap-4 p-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({
              name: form.name,
              description: form.description || undefined,
              webhook_secret: form.webhook_secret || undefined,
            });
          }}
        >
          <input className="input" placeholder="Integration name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="input md:col-span-2" placeholder="Webhook secret (optional, sent as X-Webhook-Secret header)" value={form.webhook_secret} onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })} />
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
          title="No webhook integrations"
          message="Add a webhook integration to start receiving alerts via HTTP POST."
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Webhook className="h-5 w-5" />
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
                {integration.description && (
                  <p className="mb-4 text-sm text-slate-600">{integration.description}</p>
                )}

                <label className="mb-1 block text-sm font-medium text-slate-700">Webhook URL (POST)</label>
                <div className="flex gap-2">
                  <input readOnly className="input flex-1 font-mono text-xs" value={webhookPostUrl(integration.id)} />
                  <button className="btn-secondary" onClick={() => copyWebhook(webhookPostUrl(integration.id))} title="Copy URL">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-700">curl command</h3>
                    <button className="btn-secondary py-1 text-xs" onClick={() => copyCurl(integration)}>
                      <Terminal className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{buildCurlCommand(integration)}</pre>
                </div>

                {integration.webhook_secret && (
                  <p className="mt-3 text-sm text-slate-500">
                    Requires header <code className="rounded bg-slate-100 px-1">X-Webhook-Secret</code>
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button className="btn-secondary" onClick={() => test.mutate(integration.id)} disabled={test.isPending}>
                    <Play className="h-4 w-4" />
                    {test.isPending ? 'Testing...' : 'Test Webhook'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => updateIntegration.mutate({ id: integration.id, is_active: !integration.is_active })}
                    disabled={updateIntegration.isPending}
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
