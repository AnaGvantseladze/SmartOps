import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const iconMap: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

export function ToastContainer({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 5000;
  const Icon = iconMap[toast.type];

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onRemove(toast.id);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [duration, onRemove, toast.id]);

  return (
    <div
      className={cn(
        'relative flex w-80 items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-dropdown',
        colorMap[toast.type]
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        <div className="text-sm font-semibold">{toast.title}</div>
        {toast.message && <div className="mt-0.5 text-xs opacity-90">{toast.message}</div>}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="rounded p-1 opacity-70 hover:bg-black/5 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
