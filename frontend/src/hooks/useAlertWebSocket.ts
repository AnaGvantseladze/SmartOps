import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { playAlertSound, unlockAlertSound } from '@/lib/alertSound';

function refreshAlertQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['alerts'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
}

const recentAlerts = new Set<number>();

function shouldNotify(alertId: number) {
  if (recentAlerts.has(alertId)) return false;
  recentAlerts.add(alertId);
  window.setTimeout(() => recentAlerts.delete(alertId), 30000);
  return true;
}

export function useAlertWebSocket(enabled: boolean) {
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const wsConnectedRef = useRef(false);
  const prevTriggeredIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);

  const notifyNewAlert = useCallback(
    (alertId: number, title?: string) => {
      if (!shouldNotify(alertId)) return;
      playAlertSound();
      toast.warning('New alert', title ?? 'A new alert was triggered');
    },
    [toast]
  );

  useEffect(() => {
    if (!enabled) return;
    const unlock = () => unlockAlertSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let closed = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/api/v1/ws/alerts`);

      ws.onopen = () => {
        wsConnectedRef.current = true;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { type?: string; alert_id?: number; title?: string };
          if (data.type === 'alert.created' && data.alert_id) {
            notifyNewAlert(data.alert_id, data.title);
          }
          if (data.type === 'alert.created' || data.type === 'alert.updated') {
            refreshAlertQueries(queryClient);
          }
        } catch {
          // Ignore malformed messages.
        }
      };

      ws.onclose = () => {
        wsConnectedRef.current = false;
        if (!closed) {
          reconnectTimer = window.setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      wsConnectedRef.current = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled, notifyNewAlert, queryClient]);

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', 'live-updates'],
    queryFn: () => api.getAlerts(),
    refetchInterval: 10000,
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;

    const triggered = alerts.filter((alert) => alert.status === 'triggered');
    const currentIds = new Set(triggered.map((alert) => alert.id));

    if (!initializedRef.current) {
      prevTriggeredIdsRef.current = currentIds;
      initializedRef.current = true;
      return;
    }

    if (wsConnectedRef.current) {
      prevTriggeredIdsRef.current = currentIds;
      return;
    }

    for (const alert of triggered) {
      if (!prevTriggeredIdsRef.current.has(alert.id)) {
        notifyNewAlert(alert.id, alert.title);
        break;
      }
    }

    prevTriggeredIdsRef.current = currentIds;
  }, [alerts, enabled, notifyNewAlert]);
}
