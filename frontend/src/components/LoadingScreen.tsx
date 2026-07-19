import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-card">
        <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
        <span className="text-sm font-medium text-slate-700">Loading SmartOps...</span>
      </div>
    </div>
  );
}
