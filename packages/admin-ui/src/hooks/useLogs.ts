import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../services/api';
import type {
  LogEntry,
  LogQueryParams,
  LogListResponse,
  ExportLogsParams,
  ExportLogsResponse,
  LogStreamEvent,
} from '../types/logs';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3004/api';

/**
 * Custom hook for fetching logs with TanStack Query
 */
export function useLogs(params: LogQueryParams) {
  return useQuery<LogListResponse>({
    queryKey: ['logs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (params.service) searchParams.append('service', params.service);
      if (params.level) searchParams.append('level', params.level);
      if (params.startTime) searchParams.append('startTime', params.startTime);
      if (params.endTime) searchParams.append('endTime', params.endTime);
      if (params.search) searchParams.append('search', params.search);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.offset) searchParams.append('offset', params.offset.toString());

      return api.get<LogListResponse>(`/logs?${searchParams.toString()}`);
    },
    refetchInterval: 10000, // Refetch every 10 seconds as a fallback
  });
}

/**
 * Custom hook for real-time log streaming via Server-Sent Events (SSE)
 */
export function useLogStream(enabled: boolean = true) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`${API_BASE_URL}/logs/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: LogStreamEvent = JSON.parse(event.data);
          if (data.logs && Array.isArray(data.logs)) {
            setLogs((prevLogs) => {
              // Prepend new logs and limit to 1000 entries
              const newLogs = [...data.logs, ...prevLogs];
              return newLogs.slice(0, 1000);
            });

            // Invalidate the logs query to keep it in sync
            queryClient.invalidateQueries({ queryKey: ['logs'] });
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = (event) => {
        setIsConnected(false);
        eventSource.close();

        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting to log stream (attempt ${reconnectAttemptsRef.current})...`);
            connect();
          }, delay);
        } else {
          setError(new Error('Failed to connect to log stream after multiple attempts'));
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsConnected(false);
    }
  }, [enabled, queryClient]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [connect, disconnect]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    logs,
    isConnected,
    error,
    reconnect,
    clearLogs,
  };
}

/**
 * Custom hook for exporting logs
 */
export function useExportLogs() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportLogs = useCallback(async (params: ExportLogsParams) => {
    setIsExporting(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();

      if (params.format) searchParams.append('format', params.format);
      if (params.service) searchParams.append('service', params.service);
      if (params.level) searchParams.append('level', params.level);
      if (params.startTime) searchParams.append('startTime', params.startTime);
      if (params.endTime) searchParams.append('endTime', params.endTime);

      const response = await api.post<ExportLogsResponse>(
        `/logs/export?${searchParams.toString()}`
      );

      // Create a download link
      const blob = new Blob(
        [params.format === 'csv' ? response.data : JSON.stringify(JSON.parse(response.data), null, 2)],
        { type: params.format === 'csv' ? 'text/csv' : 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Export failed');
      setError(error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportLogs,
    isExporting,
    error,
  };
}

/**
 * Hook to get available services for filtering
 */
export function useLogServices() {
  return useQuery<string[]>({
    queryKey: ['log-services'],
    queryFn: async () => {
      // In a real implementation, this would fetch from an API endpoint
      // For now, return hardcoded services
      return ['auth', 'gateway', 'analytics', 'audit', 'notifications', 'webhooks'];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
