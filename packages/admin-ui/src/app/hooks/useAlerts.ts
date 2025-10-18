import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  Alert,
  AlertFilters,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types/websocket-events.types';

export interface UseAlertsOptions {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  filters?: AlertFilters;
  autoSubscribe?: boolean;
}

export interface UseAlertsReturn {
  alerts: Alert[];
  unresolvedAlerts: Alert[];
  latestAlert: Alert | null;
  isLoading: boolean;
  subscribe: (filters?: AlertFilters) => void;
  unsubscribe: () => void;
  refresh: () => void;
  resolveAlert: (alertId: string) => void;
  getAlertsByService: (serviceName: string) => Alert[];
  getAlertsBySeverity: (severity: Alert['severity']) => Alert[];
}

/**
 * React hook for managing alerts
 * Subscribes to new alerts and provides alert management capabilities
 */
export function useAlerts(options: UseAlertsOptions): UseAlertsReturn {
  const { socket, filters, autoSubscribe = true } = options;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [latestAlert, setLatestAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const subscribe = useCallback(
    (newFilters?: AlertFilters) => {
      if (!socket?.connected) {
        console.warn('[useAlerts] Cannot subscribe: socket not connected');
        return;
      }

      socket.emit('subscribe:alerts', { filters: newFilters || filters });
    },
    [socket, filters],
  );

  const unsubscribe = useCallback(() => {
    if (!socket?.connected) {
      return;
    }

    socket.emit('unsubscribe:alerts');
  }, [socket]);

  const refresh = useCallback(() => {
    if (!socket?.connected) {
      return;
    }

    socket.emit('request:alerts', { filters });
  }, [socket, filters]);

  const resolveAlert = useCallback(
    (alertId: string) => {
      if (!socket?.connected) {
        console.warn('[useAlerts] Cannot resolve alert: socket not connected');
        return;
      }

      socket.emit('resolve-alert', { alertId });
    },
    [socket],
  );

  const getAlertsByService = useCallback(
    (serviceName: string): Alert[] => {
      return alerts.filter((alert) => alert.serviceName === serviceName);
    },
    [alerts],
  );

  const getAlertsBySeverity = useCallback(
    (severity: Alert['severity']): Alert[] => {
      return alerts.filter((alert) => alert.severity === severity);
    },
    [alerts],
  );

  const unresolvedAlerts = alerts.filter((alert) => !alert.resolved);

  // Handle incoming alerts
  useEffect(() => {
    if (!socket) return;

    const handleNewAlert = (alert: Alert) => {
      setAlerts((prev) => {
        // Check if alert already exists
        const exists = prev.some((a) => a.id === alert.id);
        if (exists) {
          return prev;
        }
        // Add new alert at the beginning (most recent first)
        return [alert, ...prev];
      });
      setLatestAlert(alert);
      setIsLoading(false);
    };

    const handleAlertUpdated = (alert: Alert) => {
      setAlerts((prev) => {
        return prev.map((a) => (a.id === alert.id ? alert : a));
      });
    };

    const handleAlertResolved = (alertId: string) => {
      setAlerts((prev) => {
        return prev.map((alert) =>
          alert.id === alertId
            ? { ...alert, resolved: true, resolvedAt: new Date() }
            : alert,
        );
      });
    };

    const handleAlertsList = (alertsList: Alert[]) => {
      setAlerts((prev) => {
        // Merge with existing alerts, avoiding duplicates
        const existingIds = new Set(prev.map((a) => a.id));
        const newAlerts = alertsList.filter((a) => !existingIds.has(a.id));
        const merged = [...prev, ...newAlerts];
        // Sort by timestamp (most recent first)
        merged.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        return merged;
      });
      setIsLoading(false);
    };

    const handleSubscriptionConfirmed = (subscription: any) => {
      if (subscription.type === 'alerts') {
        console.log('[useAlerts] Subscription confirmed');
      }
    };

    socket.on('alert:new', handleNewAlert);
    socket.on('alert:updated', handleAlertUpdated);
    socket.on('alert:resolved', handleAlertResolved);
    socket.on('alerts:list', handleAlertsList);
    socket.on('subscription:confirmed', handleSubscriptionConfirmed);

    return () => {
      socket.off('alert:new', handleNewAlert);
      socket.off('alert:updated', handleAlertUpdated);
      socket.off('alert:resolved', handleAlertResolved);
      socket.off('alerts:list', handleAlertsList);
      socket.off('subscription:confirmed', handleSubscriptionConfirmed);
    };
  }, [socket]);

  // Auto-subscribe on mount
  useEffect(() => {
    if (socket?.connected && autoSubscribe) {
      subscribe(filters);
      refresh();
    }
  }, [socket, autoSubscribe, filters, subscribe, refresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket?.connected) {
        unsubscribe();
      }
    };
  }, [socket, unsubscribe]);

  return {
    alerts,
    unresolvedAlerts,
    latestAlert,
    isLoading,
    subscribe,
    unsubscribe,
    refresh,
    resolveAlert,
    getAlertsByService,
    getAlertsBySeverity,
  };
}
