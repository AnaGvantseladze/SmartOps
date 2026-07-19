import { useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '@/lib/api';

const RESOURCES = [
  { value: 'alerts', label: 'Alerts' },
  { value: 'incidents', label: 'Incidents' },
  { value: 'changes', label: 'Changes' },
  { value: 'services', label: 'Services' },
  { value: 'audit', label: 'Audit Logs' },
];

export function AdminExportPage() {
  const [resource, setResource] = useState('alerts');
  const [format, setFormat] = useState('csv');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await api.exportData(resource, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resource}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Export Data</h1>
        <p className="text-slate-400">Download platform data for reporting, compliance, and analysis</p>
      </div>

      <div className="card max-w-md space-y-4 p-6">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Resource</label>
          <select className="input w-full" value={resource} onChange={(e) => setResource(e.target.value)}>
            {RESOURCES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Format</label>
          <select className="input w-full" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>
        <button className="btn-primary w-full justify-center" onClick={handleExport} disabled={loading}>
          <Download className="h-4 w-4" />
          {loading ? 'Exporting...' : 'Download Export'}
        </button>
      </div>
    </div>
  );
}
