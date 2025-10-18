import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface WebSocketContextValue {
  // Connection status
  isConnected: boolean;
  connectionError: string | null;

  // Namespaced sockets
  eventsSocket: Socket | null;
  healthSocket: Socket | null;
  metricsSocket: Socket | null;
  logsSocket: Socket | null;

  // Subscribe/unsubscribe methods
  subscribeToEvents: (events: string[], callback: (data: any) => void) => void;
  unsubscribeFromEvents: (events: string[]) => void;
  subscribeToHealth: (services: string[], callback: (data: any) => void) => void;
  unsubscribeFromHealth: (services: string[]) => void;
  subscribeToMetrics: (metrics: string[], callback: (data: any) => void) => void;
  unsubscribeFromMetrics: (metrics: string[]) => void;
  subscribeToLogs: (filters: LogFilter, callback: (data: any) => void) => void;
  unsubscribeFromLogs: () => void;

  // Emit methods
  emit: (namespace: string, event: string, data?: any) => void;

  // Reconnection
  reconnect: () => void;
  disconnect: () => void;
}

interface LogFilter {
  services?: string[];
  levels?: string[];
  search?: string;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}

/**
 * WebSocket Provider Component
 *
 * Manages WebSocket connections for real-time updates across the admin UI.
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Socket references
  const eventsSocketRef = useRef<Socket | null>(null);
  const healthSocketRef = useRef<Socket | null>(null);
  const metricsSocketRef = useRef<Socket | null>(null);
  const logsSocketRef = useRef<Socket | null>(null);

  // Callback references
  const eventCallbacksRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const healthCallbacksRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const metricsCallbacksRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const logsCallbacksRef = useRef<Set<(data: any) => void>>(new Set());

  /**
   * Create socket connection with authentication
   */
  const createSocket = useCallback((namespace: string): Socket => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';

    const socket = io(`${wsUrl}/${namespace}`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Common event handlers
    socket.on('connect', () => {
      console.log(`Connected to ${namespace} namespace`);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Disconnected from ${namespace}: ${reason}`);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error(`Connection error in ${namespace}:`, error.message);
      setConnectionError(error.message);

      if (error.message.includes('unauthorized')) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in again to continue.',
          variant: 'destructive',
        });
      }
    });

    return socket;
  }, [token, toast]);

  /**
   * Initialize all socket connections
   */
  const initializeSockets = useCallback(() => {
    if (!isAuthenticated || !token) return;

    // Create namespace-specific sockets
    eventsSocketRef.current = createSocket('events');
    healthSocketRef.current = createSocket('health');
    metricsSocketRef.current = createSocket('metrics');
    logsSocketRef.current = createSocket('logs');

    // Set up event listeners for each namespace
    setupEventListeners();
    setupHealthListeners();
    setupMetricsListeners();
    setupLogsListeners();

  }, [isAuthenticated, token, createSocket]);

  /**
   * Set up event listeners for events namespace
   */
  const setupEventListeners = () => {
    if (!eventsSocketRef.current) return;

    eventsSocketRef.current.on('event', (data) => {
      const callbacks = eventCallbacksRef.current.get(data.type) || new Set();
      callbacks.forEach(callback => callback(data));
    });

    eventsSocketRef.current.on('notification', (data) => {
      toast({
        title: data.title,
        description: data.message,
        variant: data.type === 'error' ? 'destructive' : 'default',
      });
    });
  };

  /**
   * Set up health listeners
   */
  const setupHealthListeners = () => {
    if (!healthSocketRef.current) return;

    healthSocketRef.current.on('health:system', (data) => {
      const callbacks = healthCallbacksRef.current.get('system') || new Set();
      callbacks.forEach(callback => callback(data));
    });

    healthSocketRef.current.on('health:service', (data) => {
      const callbacks = healthCallbacksRef.current.get(data.service) || new Set();
      callbacks.forEach(callback => callback(data));
    });

    healthSocketRef.current.on('health:alert', (data) => {
      toast({
        title: 'Health Alert',
        description: data.message,
        variant: data.severity === 'critical' ? 'destructive' : 'default',
      });
    });
  };

  /**
   * Set up metrics listeners
   */
  const setupMetricsListeners = () => {
    if (!metricsSocketRef.current) return;

    metricsSocketRef.current.on('metrics:update', (data) => {
      const callbacks = metricsCallbacksRef.current.get(data.metric) || new Set();
      callbacks.forEach(callback => callback(data));
    });
  };

  /**
   * Set up logs listeners
   */
  const setupLogsListeners = () => {
    if (!logsSocketRef.current) return;

    logsSocketRef.current.on('logs:stream', (data) => {
      logsCallbacksRef.current.forEach(callback => callback(data));
    });
  };

  /**
   * Subscribe to events
   */
  const subscribeToEvents = useCallback((events: string[], callback: (data: any) => void) => {
    events.forEach(event => {
      if (!eventCallbacksRef.current.has(event)) {
        eventCallbacksRef.current.set(event, new Set());
      }
      eventCallbacksRef.current.get(event)!.add(callback);
    });

    if (eventsSocketRef.current?.connected) {
      eventsSocketRef.current.emit('subscribe', { events });
    }
  }, []);

  /**
   * Unsubscribe from events
   */
  const unsubscribeFromEvents = useCallback((events: string[]) => {
    events.forEach(event => {
      eventCallbacksRef.current.delete(event);
    });

    if (eventsSocketRef.current?.connected) {
      eventsSocketRef.current.emit('unsubscribe', events);
    }
  }, []);

  /**
   * Subscribe to health updates
   */
  const subscribeToHealth = useCallback((services: string[], callback: (data: any) => void) => {
    services.forEach(service => {
      if (!healthCallbacksRef.current.has(service)) {
        healthCallbacksRef.current.set(service, new Set());
      }
      healthCallbacksRef.current.get(service)!.add(callback);
    });

    if (healthSocketRef.current?.connected) {
      if (services.includes('system')) {
        healthSocketRef.current.emit('subscribe:system');
      } else {
        healthSocketRef.current.emit('subscribe:services', services);
      }
    }
  }, []);

  /**
   * Unsubscribe from health updates
   */
  const unsubscribeFromHealth = useCallback((services: string[]) => {
    services.forEach(service => {
      healthCallbacksRef.current.delete(service);
    });

    if (healthSocketRef.current?.connected) {
      healthSocketRef.current.emit('unsubscribe:services', services);
    }
  }, []);

  /**
   * Subscribe to metrics
   */
  const subscribeToMetrics = useCallback((metrics: string[], callback: (data: any) => void) => {
    metrics.forEach(metric => {
      if (!metricsCallbacksRef.current.has(metric)) {
        metricsCallbacksRef.current.set(metric, new Set());
      }
      metricsCallbacksRef.current.get(metric)!.add(callback);
    });

    if (metricsSocketRef.current?.connected) {
      metricsSocketRef.current.emit('subscribe', { metrics });
    }
  }, []);

  /**
   * Unsubscribe from metrics
   */
  const unsubscribeFromMetrics = useCallback((metrics: string[]) => {
    metrics.forEach(metric => {
      metricsCallbacksRef.current.delete(metric);
    });

    if (metricsSocketRef.current?.connected) {
      metricsSocketRef.current.emit('unsubscribe', metrics);
    }
  }, []);

  /**
   * Subscribe to logs
   */
  const subscribeToLogs = useCallback((filters: LogFilter, callback: (data: any) => void) => {
    logsCallbacksRef.current.add(callback);

    if (logsSocketRef.current?.connected) {
      logsSocketRef.current.emit('subscribe', filters);
    }
  }, []);

  /**
   * Unsubscribe from logs
   */
  const unsubscribeFromLogs = useCallback(() => {
    logsCallbacksRef.current.clear();

    if (logsSocketRef.current?.connected) {
      logsSocketRef.current.emit('unsubscribe');
    }
  }, []);

  /**
   * Generic emit method
   */
  const emit = useCallback((namespace: string, event: string, data?: any) => {
    let socket: Socket | null = null;

    switch (namespace) {
      case 'events':
        socket = eventsSocketRef.current;
        break;
      case 'health':
        socket = healthSocketRef.current;
        break;
      case 'metrics':
        socket = metricsSocketRef.current;
        break;
      case 'logs':
        socket = logsSocketRef.current;
        break;
    }

    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event} to ${namespace}: not connected`);
    }
  }, []);

  /**
   * Reconnect all sockets
   */
  const reconnect = useCallback(() => {
    disconnect();
    initializeSockets();
  }, [initializeSockets]);

  /**
   * Disconnect all sockets
   */
  const disconnect = useCallback(() => {
    [eventsSocketRef, healthSocketRef, metricsSocketRef, logsSocketRef].forEach(ref => {
      if (ref.current) {
        ref.current.disconnect();
        ref.current = null;
      }
    });
    setIsConnected(false);
  }, []);

  // Initialize sockets when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      initializeSockets();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, initializeSockets, disconnect]);

  const value: WebSocketContextValue = {
    isConnected,
    connectionError,
    eventsSocket: eventsSocketRef.current,
    healthSocket: healthSocketRef.current,
    metricsSocket: metricsSocketRef.current,
    logsSocket: logsSocketRef.current,
    subscribeToEvents,
    unsubscribeFromEvents,
    subscribeToHealth,
    unsubscribeFromHealth,
    subscribeToMetrics,
    unsubscribeFromMetrics,
    subscribeToLogs,
    unsubscribeFromLogs,
    emit,
    reconnect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}