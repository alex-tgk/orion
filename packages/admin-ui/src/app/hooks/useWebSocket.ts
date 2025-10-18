import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ConnectionState,
  WebSocketError,
} from '../types/websocket-events.types';

export interface UseWebSocketOptions {
  url: string;
  namespace?: string;
  token?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: WebSocketError) => void;
}

export interface UseWebSocketReturn {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: WebSocketError | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * React hook for managing WebSocket connection
 * Handles connection state, authentication, and reconnection logic
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    namespace = '/admin',
    token,
    autoConnect = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED,
  );
  const [error, setError] = useState<WebSocketError | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setConnectionState(ConnectionState.CONNECTING);
    setError(null);

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(`${url}${namespace}`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: false, // We'll handle reconnection manually
    });

    // Connection successful
    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setConnectionState(ConnectionState.CONNECTED);
      reconnectAttemptsRef.current = 0;
      onConnect?.();
    });

    // Authentication successful
    socket.on('connection:authenticated', (userId) => {
      console.log('[WebSocket] Authenticated as user:', userId);
      setConnectionState(ConnectionState.AUTHENTICATED);
      setIsAuthenticated(true);
    });

    // Connection error
    socket.on('connection:error', (wsError) => {
      console.error('[WebSocket] Connection error:', wsError);
      setError(wsError);
      setConnectionState(ConnectionState.ERROR);
      onError?.(wsError);
    });

    // Disconnection
    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setConnectionState(ConnectionState.DISCONNECTED);
      setIsAuthenticated(false);
      onDisconnect?.();

      // Auto-reconnect if not manually disconnected
      if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < reconnectionAttempts) {
        attemptReconnect();
      }
    });

    // Socket errors
    socket.on('connect_error', (err) => {
      console.error('[WebSocket] Connect error:', err);
      const wsError: WebSocketError = {
        code: 'CONNECT_ERROR',
        message: err.message,
        details: err,
      };
      setError(wsError);
      setConnectionState(ConnectionState.ERROR);
      onError?.(wsError);

      // Attempt to reconnect
      if (reconnectAttemptsRef.current < reconnectionAttempts) {
        attemptReconnect();
      }
    });

    socketRef.current = socket;
  }, [url, namespace, token, reconnectionAttempts, onConnect, onDisconnect, onError]);

  const attemptReconnect = useCallback(() => {
    reconnectAttemptsRef.current++;
    const delay = reconnectionDelay * reconnectAttemptsRef.current;

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${reconnectionAttempts})`,
    );

    setConnectionState(ConnectionState.RECONNECTING);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnectionState(ConnectionState.DISCONNECTED);
    setIsAuthenticated(false);
    setError(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, token, connect, disconnect]);

  return {
    socket: socketRef.current,
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.AUTHENTICATED,
    isAuthenticated,
    error,
    connect,
    disconnect,
    reconnect,
  };
}
