import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  ServiceHealth,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types/websocket-events.types';

export interface UseServiceHealthOptions {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  serviceName?: string;
  autoSubscribe?: boolean;
}

export interface UseServiceHealthReturn {
  services: Map<string, ServiceHealth>;
  getService: (serviceName: string) => ServiceHealth | undefined;
  isLoading: boolean;
  subscribe: (serviceName?: string) => void;
  unsubscribe: (serviceName?: string) => void;
  refresh: () => void;
}

/**
 * React hook for subscribing to service health updates
 * Manages service health state and subscriptions
 */
export function useServiceHealth(options: UseServiceHealthOptions): UseServiceHealthReturn {
  const { socket, serviceName, autoSubscribe = true } = options;

  const [services, setServices] = useState<Map<string, ServiceHealth>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const subscribe = useCallback(
    (targetService?: string) => {
      if (!socket?.connected) {
        console.warn('[useServiceHealth] Cannot subscribe: socket not connected');
        return;
      }

      socket.emit('subscribe:service-health', { serviceName: targetService });
    },
    [socket],
  );

  const unsubscribe = useCallback(
    (targetService?: string) => {
      if (!socket?.connected) {
        return;
      }

      socket.emit('unsubscribe:service-health', { serviceName: targetService });
    },
    [socket],
  );

  const refresh = useCallback(() => {
    if (!socket?.connected) {
      return;
    }

    socket.emit('request:service-health', { serviceName });
  }, [socket, serviceName]);

  const getService = useCallback(
    (name: string): ServiceHealth | undefined => {
      return services.get(name);
    },
    [services],
  );

  // Handle service health updates
  useEffect(() => {
    if (!socket) return;

    const handleHealthUpdate = (health: ServiceHealth) => {
      setServices((prev) => {
        const next = new Map(prev);
        next.set(health.serviceName, health);
        return next;
      });
      setIsLoading(false);
    };

    const handleHealthList = (healthList: ServiceHealth[]) => {
      setServices((prev) => {
        const next = new Map(prev);
        healthList.forEach((health) => {
          next.set(health.serviceName, health);
        });
        return next;
      });
      setIsLoading(false);
    };

    const handleSubscriptionConfirmed = (subscription: any) => {
      if (subscription.type === 'service-health') {
        console.log('[useServiceHealth] Subscription confirmed:', subscription.serviceName || 'all');
      }
    };

    socket.on('service-health:update', handleHealthUpdate);
    socket.on('service-health:list', handleHealthList);
    socket.on('subscription:confirmed', handleSubscriptionConfirmed);

    return () => {
      socket.off('service-health:update', handleHealthUpdate);
      socket.off('service-health:list', handleHealthList);
      socket.off('subscription:confirmed', handleSubscriptionConfirmed);
    };
  }, [socket]);

  // Auto-subscribe on mount
  useEffect(() => {
    if (socket?.connected && autoSubscribe) {
      subscribe(serviceName);
      refresh();
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
    services,
    getService,
    isLoading,
    subscribe,
    unsubscribe,
    refresh,
  };
}
