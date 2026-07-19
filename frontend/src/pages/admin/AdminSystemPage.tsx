import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';

export function AdminSystemPage() {
  const { data: integrations = [] } = useQuery({ queryKey: ['integrations'], queryFn: api.getIntegrations });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">System Configuration</h1>
        <p className="text-slate-400">Manage services, integrations, and system parameters</p>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Service Catalog</h2>
          <NavLink to="/services" className="btn-secondary text-sm">
            Manage Services <ExternalLink className="h-3 w-3" />
          </NavLink>
        </div>
        <p className="text-sm text-slate-400">
          Add and configure services in the three-tier catalog. Services drive alert routing, incident context, and change management.
        </p>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-white">Integrations</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((int) => (
          <div key={int.id} className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">{int.name}</h3>
              <span className={`badge ${int.status === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {int.status}
              </span>
            </div>
            <p className="mt-1 text-xs uppercase text-slate-500">{int.type}</p>
            <p className="mt-2 text-sm text-slate-400">{int.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
