import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ToastItem, ToastType } from '@/components/Toast';

interface ToastContextValue {
  toasts: ToastItem[];
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${idCounter++}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const success = useCallback((title: string, message?: string) => add('success', title, message), [add]);
  const error = useCallback((title: string, message?: string) => add('error', title, message), [add]);
  const warning = useCallback((title: string, message?: string) => add('warning', title, message), [add]);
  const info = useCallback((title: string, message?: string) => add('info', title, message), [add]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ toasts, success, error, warning, info, remove }),
    [toasts, success, error, warning, info, remove]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider');
  return ctx;
}
