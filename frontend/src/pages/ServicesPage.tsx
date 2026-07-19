import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Github } from 'lucide-react';
import { api } from '@/lib/api';
import { healthColor, tierLabel } from '@/lib/utils';
import type { Service, ServiceTier } from '@/types';

export function ServicesPage() {
  const [tierFilter, setTierFilter] = useState<ServiceTier | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', tierFilter, search],
    queryFn: () =>
      api.getServices({
        ...(tierFilter !== 'all' ? { tier: String(tierFilter) } : {}),
        ...(search ? { search } : {}),
      }),
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading service catalog...</div>;

  const tier1 = services.filter((s) => s.tier === 1);
  const tier2 = services.filter((s) => s.tier === 2);
  const tier3 = services.filter((s) => s.tier === 3);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Service Catalog</h1>
        <p className="text-slate-400">Three-tier service model — Business → Software → Microservices</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-ops-border bg-ops-bg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-ops-accent focus:outline-none"
        />
        {(['all', 1, 2, 3] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => setTierFilter(tier)}
            className={`rounded-md px-3 py-2 text-sm ${
              tierFilter === tier ? 'bg-ops-accent text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {tier === 'all' ? 'All Tiers' : `Tier ${tier} — ${tierLabel(tier)}`}
          </button>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-ops-border bg-ops-surface p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Dependency Model</h2>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-full max-w-md rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <div className="text-xs font-semibold text-red-400">TIER 1 — Business Services</div>
            <div className="text-sm text-slate-300">Trading, Deposits — Revenue-critical</div>
          </div>
          <div className="text-slate-600">↓ depends on</div>
          <div className="w-full max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="text-xs font-semibold text-amber-400">TIER 2 — Software Services</div>
            <div className="text-sm text-slate-300">Order Service, Payment Gateway</div>
          </div>
          <div className="text-slate-600">↓ depends on</div>
          <div className="w-full max-w-md rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
            <div className="text-xs font-semibold text-blue-400">TIER 3 — Microservices</div>
            <div className="text-sm text-slate-300">Pricing, Auth, Cache Layer</div>
          </div>
        </div>
      </div>

      {tierFilter === 'all' ? (
        <>
          <ServiceTierSection title="Tier 1 — Business Services" services={tier1} />
          <ServiceTierSection title="Tier 2 — Software Services" services={tier2} />
          <ServiceTierSection title="Tier 3 — Microservices" services={tier3} />
        </>
      ) : (
        <ServiceTierSection title={`Tier ${tierFilter} — ${tierLabel(tierFilter)}`} services={services} />
      )}
    </div>
  );
}

function ServiceTierSection({ title, services }: { title: string; services: Service[] }) {
  if (services.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="card p-5 transition-colors hover:border-blue-500/30">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white">{service.name}</h3>
          <span className="text-xs text-slate-500">Tier {service.tier} — {tierLabel(service.tier)}</span>
        </div>
        <div className={`text-2xl font-bold ${healthColor(service.health_score)}`}>
          {service.health_score}
        </div>
      </div>

      {service.description && (
        <p className="mb-3 line-clamp-2 text-sm text-slate-400">{service.description}</p>
      )}

      <div className="mb-3 flex gap-3 text-xs">
        {service.active_alerts > 0 && (
          <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-400">
            {service.active_alerts} alert{service.active_alerts > 1 ? 's' : ''}
          </span>
        )}
        {service.open_incidents > 0 && (
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-400">
            {service.open_incidents} incident{service.open_incidents > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{service.team?.name ?? 'Unassigned'}</span>
        <div className="flex gap-2">
          {service.github_repo && <Github className="h-3.5 w-3.5" />}
          {service.confluence_runbook_url && <ExternalLink className="h-3.5 w-3.5" />}
        </div>
      </div>
    </div>
  );
}
