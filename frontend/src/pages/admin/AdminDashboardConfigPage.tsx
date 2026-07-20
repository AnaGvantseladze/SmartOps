import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToastContext } from '@/context/ToastContext';

export function AdminDashboardConfigPage() {
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const { data: config, isLoading } = useQuery({ queryKey: ['dashboard-config'], queryFn: api.getDashboardConfig });
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});

  const save = useMutation({
    mutationFn: api.updateDashboardConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-config'] });
      toast.success('Dashboard configuration saved');
    },
    onError: (err: Error) => toast.error('Failed to save configuration', err.message),
  });

  if (isLoading || !config) return <div className="page-container text-slate-500">Loading...</div>;

  const values = { ...config, ...form };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dashboard Parameters</h1>
        <p className="page-subtitle">Configure refresh intervals, date ranges, and display options</p>
      </div>

      <form
        className="card max-w-lg space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({
            refresh_interval_seconds: Number(values.refresh_interval_seconds),
            default_date_range_days: Number(values.default_date_range_days),
            tv_rotation_seconds: Number(values.tv_rotation_seconds),
            show_tier1_only: Boolean(values.show_tier1_only),
            executive_summary_enabled: Boolean(values.executive_summary_enabled),
            shared_with_organization: Boolean(values.shared_with_organization),
          });
        }}
      >
        <Field label="Refresh interval (seconds)" type="number" value={values.refresh_interval_seconds}
          onChange={(v) => setForm({ ...form, refresh_interval_seconds: Number(v) })} />
        <Field label="Default date range (days)" type="number" value={values.default_date_range_days}
          onChange={(v) => setForm({ ...form, default_date_range_days: Number(v) })} />
        <Field label="TV mode rotation (seconds)" type="number" value={values.tv_rotation_seconds}
          onChange={(v) => setForm({ ...form, tv_rotation_seconds: Number(v) })} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={Boolean(values.show_tier1_only)}
            onChange={(e) => setForm({ ...form, show_tier1_only: e.target.checked })} />
          Show Tier 1 services only on executive dashboard
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={Boolean(values.executive_summary_enabled)}
            onChange={(e) => setForm({ ...form, executive_summary_enabled: e.target.checked })} />
          Enable executive summary section
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={Boolean(values.shared_with_organization)}
            onChange={(e) => setForm({ ...form, shared_with_organization: e.target.checked })} />
          Share dashboard configuration with the organization
        </label>
        <button type="submit" className="btn-primary" disabled={save.isPending}>
          {save.isPending ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string | number; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input type={type} className="input w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
