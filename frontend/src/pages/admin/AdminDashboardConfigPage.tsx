import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function AdminDashboardConfigPage() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery({ queryKey: ['dashboard-config'], queryFn: api.getDashboardConfig });
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});

  const save = useMutation({
    mutationFn: api.updateDashboardConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-config'] }),
  });

  if (isLoading || !config) return <div className="p-8 text-slate-400">Loading...</div>;

  const values = { ...config, ...form };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard Parameters</h1>
        <p className="text-slate-400">Configure refresh intervals, date ranges, and display options</p>
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
          });
        }}
      >
        <Field label="Refresh interval (seconds)" type="number" value={values.refresh_interval_seconds}
          onChange={(v) => setForm({ ...form, refresh_interval_seconds: Number(v) })} />
        <Field label="Default date range (days)" type="number" value={values.default_date_range_days}
          onChange={(v) => setForm({ ...form, default_date_range_days: Number(v) })} />
        <Field label="TV mode rotation (seconds)" type="number" value={values.tv_rotation_seconds}
          onChange={(v) => setForm({ ...form, tv_rotation_seconds: Number(v) })} />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={Boolean(values.show_tier1_only)}
            onChange={(e) => setForm({ ...form, show_tier1_only: e.target.checked })} />
          Show Tier 1 services only on executive dashboard
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={Boolean(values.executive_summary_enabled)}
            onChange={(e) => setForm({ ...form, executive_summary_enabled: e.target.checked })} />
          Enable executive summary section
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
      <label className="mb-1 block text-sm text-slate-400">{label}</label>
      <input type={type} className="input w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
