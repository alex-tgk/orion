import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  ServiceMetrics,
  TimeRange,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types/websocket-events.types';

export interface UseMetricsOptions {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  serviceName?: string;
  autoSubscribe?: boolean;
}

export interface UseMetricsReturn {
  metrics: Map<string, ServiceMetrics>;
  getMetrics: (serviceName: string) => ServiceMetrics | undefined;
  isLoading: boolean;
  subscribe: (serviceName?: string) => void;
  unsubscribe: (serviceName?: string) => void;
  refresh: (serviceName: string, timeRange?: TimeRange) => void;
}

/**
 * React hook for subscribing to service metrics
 * Manages real-time metrics updates for services
 */
export function useMetrics(options: UseMetricsOptions): UseMetricsReturn {
  const { socket, serviceName, autoSubscribe = true } = options;

  const [metrics, setMetrics] = useState<Map<string, ServiceMetrics>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const subscribe = useCallback(
    (targetService?: string) => {
      if (!socket?.connected) {
        console.warn('[useMetrics] Cannot subscribe: socket not connected');
        return;
      }

      socket.emit('subscribe:metrics', { serviceName: targetService });
    },
    [socket],
  );

  const unsubscribe = useCallback(
    (targetService?: string) => {
      if (!socket?.connected) {
        return;
      }

      socket.emit('unsubscribe:metrics', { serviceName: targetService });
    },
    [socket],
  );

  const refresh = useCallback(
    (targetService: string, timeRange?: TimeRange) => {
      if (!socket?.connected) {
        return;
      }

      socket.emit('request:metrics', {
        serviceName: targetService,
        timeRange,
      });
    },
    [socket],
  );

  const getMetrics = useCallback(
    (name: string): ServiceMetrics | undefined => {
      return metrics.get(name);
    },
    [metrics],
  );

  // Handle metrics updates
  useEffect(() => {
    if (!socket) return;

    const handleMetricsUpdate = (metricsData: ServiceMetrics) => {
      setMetrics((prev) => {
        const next = new Map(prev);

        // Get existing metrics for this service
        const existing = next.get(metricsData.serviceName);

        if (existing) {
          // Merge with existing metrics, keeping a rolling window
          const maxDataPoints = 100; // Keep last 100 data points per metric

          const merged: ServiceMetrics = {
            serviceName: metricsData.serviceName,
            metrics: {
              requestsPerSecond: [
                ...existing.metrics.requestsPerSecond,
                ...metricsData.metrics.requestsPerSecond,
              ].slice(-maxDataPoints),
              errorRate: [
                ...existing.metrics.errorRate,
                ...metricsData.metrics.errorRate,
              ].slice(-maxDataPoints),
              averageResponseTime: [
                ...existing.metrics.averageResponseTime,
                ...metricsData.metrics.averageResponseTime,
              ].slice(-maxDataPoints),
              activeConnections: [
                ...existing.metrics.activeConnections,
                ...metricsData.metrics.activeConnections,
              ].slice(-maxDataPoints),
              cpuUsage: metricsData.metrics.cpuUsage
                ? [
                    ...(existing.metrics.cpuUsage || []),
                    ...metricsData.metrics.cpuUsage,
                  ].slice(-maxDataPoints)
                : existing.metrics.cpuUsage,
              memoryUsage: metricsData.metrics.memoryUsage
                ? [
                    ...(existing.metrics.memoryUsage || []),
                    ...metricsData.metrics.memoryUsage,
                  ].slice(-maxDataPoints)
                : existing.metrics.memoryUsage,
            },
          };

          next.set(metricsData.serviceName, merged);
        } else {
          // First time receiving metrics for this service
          next.set(metricsData.serviceName, metricsData);
        }

        return next;
      });
      setIsLoading(false);
    };

    const handleSubscriptionConfirmed = (subscription: any) => {
      if (subscription.type === 'metrics') {
        console.log('[useMetrics] Subscription confirmed:', subscription.serviceName || 'all');
      }
    };

    socket.on('metrics:update', handleMetricsUpdate);
    socket.on('subscription:confirmed', handleSubscriptionConfirmed);

    return () => {
      socket.off('metrics:update', handleMetricsUpdate);
      socket.off('subscription:confirmed', handleSubscriptionConfirmed);
    };
  }, [socket]);

  // Auto-subscribe on mount
  useEffect(() => {
    if (socket?.connected && autoSubscribe) {
      subscribe(serviceName);
      if (serviceName) {
        refresh(serviceName);
      }
    }
  }, [socket, autoSubscribe, serviceName, subscribe, refresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket?.connected) {
        unsubscribe(serviceName);
      }
    };
  }, [socket, serviceName, unsubscribe]);

  return {
    metrics,
    getMetrics,
    isLoading,
    subscribe,
    unsubscribe,
    refresh,
  };
}
