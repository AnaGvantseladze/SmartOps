import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, statusBadge } from '@/lib/utils';

export function AdminSystemPage() {
  const { data: integrations = [] } = useQuery({ queryKey: ['integrations'], queryFn: api.getIntegrations });

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
          <div key={int.id} className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-900">{int.name}</h3>
              <span className={cn('badge border', statusBadge(int.status))}>
                {int.status}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{int.type}</p>
            <p className="mt-2 text-sm text-slate-600">{int.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
