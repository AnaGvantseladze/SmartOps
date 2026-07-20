import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { ExternalLink, X } from 'lucide-react';
import { api, type Integration } from '@/lib/api';
import { useToastContext } from '@/context/ToastContext';
import { cn, statusBadge } from '@/lib/utils';

const INTEGRATION_LINKS: Record<string, string> = {
  splunk: '/settings/webhooks',
  grafana: '/settings/webhooks',
  teams: '/settings/platform',
  slack: '/settings/platform',
  azure_ad: '/settings/platform',
  ldap: '/settings/platform',
};

export function AdminSystemPage() {
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const [configuring, setConfiguring] = useState<Integration | null>(null);

  const { data: integrations = [] } = useQuery({ queryKey: ['integrations'], queryFn: api.getIntegrations });

  const updateIntegration = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Integration> }) => api.updateIntegration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration updated');
      setConfiguring(null);
    },
    onError: (err: Error) => toast.error('Failed to update integration', err.message),
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">System Configuration</h1>
        <p className="page-subtitle">Manage services, integrations, and system parameters</p>
      </div>

      <div className="card mb-8 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Service Catalog</h2>
          <NavLink to="/services" className="btn-secondary text-sm">
            Manage Services <ExternalLink className="h-3 w-3" />
          </NavLink>
        </div>
        <p className="text-sm text-slate-600">
          Add and configure services in the three-tier catalog. Services drive alert routing, incident context, and change management.
        </p>
      </div>

      <h2 className="section-title mb-4">Integrations</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((int) => (
          <button
            key={int.id}
            type="button"
            onClick={() => setConfiguring(int)}
            className="card p-4 text-left transition-all hover:border-brand-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-900">{int.name}</h3>
              <span className={cn('badge border', statusBadge(int.status))}>
                {int.status}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{int.type}</p>
            <p className="mt-2 text-sm text-slate-600">{int.description}</p>
            <p className="mt-3 text-xs font-medium text-brand-600">Click to configure →</p>
          </button>
        ))}
      </div>

      {configuring && (
        <IntegrationConfigModal
          integration={configuring}
          isSaving={updateIntegration.isPending}
          onClose={() => setConfiguring(null)}
          onSave={(data) => updateIntegration.mutate({ id: configuring.id, data })}
        />
      )}
    </div>
  );
}

function IntegrationConfigModal({
  integration,
  isSaving,
  onClose,
  onSave,
}: {
  integration: Integration;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: Partial<Integration>) => void;
}) {
  const [status, setStatus] = useState(integration.status);
  const [description, setDescription] = useState(integration.description);
  const settingsLink = INTEGRATION_LINKS[integration.id];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/30" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{integration.name}</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-2 py-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="integration-status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select id="integration-status" className="input w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="connected">Connected</option>
              <option value="pending">Pending</option>
              <option value="disconnected">Disconnected</option>
            </select>
          </div>
          <div>
            <label htmlFor="integration-description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              id="integration-description"
              className="input w-full resize-y"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {settingsLink && (
            <NavLink to={settingsLink} className="btn-secondary flex w-full items-center justify-center gap-2 text-sm" onClick={onClose}>
              Open related settings <ExternalLink className="h-3 w-3" />
            </NavLink>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            disabled={isSaving}
            onClick={() => onSave({ status, description })}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
