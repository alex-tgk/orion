import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  SystemEvent,
  EventFilters,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types/websocket-events.types';

export interface UseSystemEventsOptions {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  filters?: EventFilters;
  autoSubscribe?: boolean;
  maxEvents?: number; // Maximum number of events to keep in memory
}

export interface UseSystemEventsReturn {
  events: SystemEvent[];
  latestEvent: SystemEvent | null;
  isLoading: boolean;
  subscribe: (filters?: EventFilters) => void;
  unsubscribe: () => void;
  refresh: () => void;
  clearEvents: () => void;
  getEventsByService: (serviceName: string) => SystemEvent[];
  getEventsByType: (type: SystemEvent['type']) => SystemEvent[];
}

/**
 * React hook for subscribing to system events
 * Maintains a live stream of events with filtering capabilities
 */
export function useSystemEvents(options: UseSystemEventsOptions): UseSystemEventsReturn {
  const { socket, filters, autoSubscribe = true, maxEvents = 1000 } = options;

  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [latestEvent, setLatestEvent] = useState<SystemEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const subscribe = useCallback(
    (newFilters?: EventFilters) => {
      if (!socket?.connected) {
        console.warn('[useSystemEvents] Cannot subscribe: socket not connected');
        return;
      }

      socket.emit('subscribe:system-events', { filters: newFilters || filters });
    },
    [socket, filters],
  );

  const unsubscribe = useCallback(() => {
    if (!socket?.connected) {
      return;
    }

    socket.emit('unsubscribe:system-events');
  }, [socket]);

  const refresh = useCallback(() => {
    if (!socket?.connected) {
      return;
    }

    socket.emit('request:system-events', { filters });
  }, [socket, filters]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLatestEvent(null);
  }, []);

  const getEventsByService = useCallback(
    (serviceName: string): SystemEvent[] => {
      return events.filter((event) => event.serviceName === serviceName);
    },
    [events],
  );

  const getEventsByType = useCallback(
    (type: SystemEvent['type']): SystemEvent[] => {
      return events.filter((event) => event.type === type);
    },
    [events],
  );

  // Handle incoming events
  useEffect(() => {
    if (!socket) return;

    const handleSystemEvent = (event: SystemEvent) => {
      setEvents((prev) => {
        // Add new event at the beginning (most recent first)
        const updated = [event, ...prev];
        // Keep only the most recent events up to maxEvents
        return updated.slice(0, maxEvents);
      });
      setLatestEvent(event);
      setIsLoading(false);
    };

    const handleEventsList = (eventsList: SystemEvent[]) => {
      setEvents((prev) => {
        // Merge with existing events, avoiding duplicates
        const existingIds = new Set(prev.map((e) => e.id));
        const newEvents = eventsList.filter((e) => !existingIds.has(e.id));
        const merged = [...prev, ...newEvents];
        // Sort by timestamp (most recent first)
        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return merged.slice(0, maxEvents);
      });
      setIsLoading(false);
    };

    const handleSubscriptionConfirmed = (subscription: any) => {
      if (subscription.type === 'system-events') {
        console.log('[useSystemEvents] Subscription confirmed');
      }
    };

    socket.on('system-event', handleSystemEvent);
    socket.on('system-events:list', handleEventsList);
    socket.on('subscription:confirmed', handleSubscriptionConfirmed);

    return () => {
      socket.off('system-event', handleSystemEvent);
      socket.off('system-events:list', handleEventsList);
      socket.off('subscription:confirmed', handleSubscriptionConfirmed);
    };
  }, [socket, maxEvents]);

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
    events,
    latestEvent,
    isLoading,
    subscribe,
    unsubscribe,
    refresh,
    clearEvents,
    getEventsByService,
    getEventsByType,
  };
}
