import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Github } from 'lucide-react';
import { api } from '@/lib/api';
import { healthBadge, healthColor, tierLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';
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

  if (isLoading) return <div className="page-container text-slate-500">Loading service catalog...</div>;

  const tier1 = services.filter((s) => s.tier === 1);
  const tier2 = services.filter((s) => s.tier === 2);
  const tier3 = services.filter((s) => s.tier === 3);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Service Catalog</h1>
        <p className="page-subtitle">Three-tier service model — Business → Software → Microservices</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
        {(['all', 1, 2, 3] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => setTierFilter(tier)}
            className={tierFilter === tier ? 'filter-chip-active' : 'filter-chip-inactive'}
          >
            {tier === 'all' ? 'All Tiers' : `Tier ${tier} — ${tierLabel(tier)}`}
          </button>
        ))}
      </div>

      <div className="card mb-8 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Dependency Model</h2>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <div className="text-xs font-semibold text-red-700">TIER 1 — Business Services</div>
            <div className="text-sm text-slate-700">Trading, Deposits — Revenue-critical</div>
          </div>
          <div className="text-slate-400">↓ depends on</div>
          <div className="w-full max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-xs font-semibold text-amber-700">TIER 2 — Software Services</div>
            <div className="text-sm text-slate-700">Order Service, Payment Gateway</div>
          </div>
          <div className="text-slate-400">↓ depends on</div>
          <div className="w-full max-w-md rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="text-xs font-semibold text-blue-700">TIER 3 — Microservices</div>
            <div className="text-sm text-slate-700">Pricing, Auth, Cache Layer</div>
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
      <h2 className="section-title mb-4">{title}</h2>
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
    <div className="card p-5 transition-all hover:border-brand-300 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{service.name}</h3>
          <span className="text-xs text-slate-500">Tier {service.tier} — {tierLabel(service.tier)}</span>
        </div>
        <div className={cn('text-2xl font-bold', healthColor(service.health_score))}>
          {service.health_score}
        </div>
      </div>

      {service.description && (
        <p className="mb-3 line-clamp-2 text-sm text-slate-600">{service.description}</p>
      )}

      <div className="mb-3 flex gap-3 text-xs">
        {service.active_alerts > 0 && (
          <span className="rounded-md bg-red-50 px-2 py-0.5 font-medium text-red-700">
            {service.active_alerts} alert{service.active_alerts > 1 ? 's' : ''}
          </span>
        )}
        {service.open_incidents > 0 && (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
            {service.open_incidents} incident{service.open_incidents > 1 ? 's' : ''}
          </span>
        )}
        <span className={cn('badge border', healthBadge(service.health_score))}>
          {service.health_score >= 90 ? 'Healthy' : service.health_score >= 70 ? 'Degraded' : 'At Risk'}
        </span>
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
