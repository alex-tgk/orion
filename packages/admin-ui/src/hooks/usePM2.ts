import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { websocketService } from '../services/websocket.service';
import type {
  PM2Process,
  PM2LogEntry,
  PM2ActionResponse,
  PM2UpdateEvent,
} from '../types/services.types';

const API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3004/api';

/**
 * Fetch all PM2 processes
 */
export function usePM2Processes() {
  const queryClient = useQueryClient();

  const query = useQuery<PM2Process[]>({
    queryKey: ['pm2-processes'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/pm2/processes`);
      if (!response.ok) {
        throw new Error('Failed to fetch PM2 processes');
      }
      return response.json();
    },
    refetchInterval: 30000, // Fallback polling
    staleTime: 10000,
  });

  // WebSocket real-time updates
  useEffect(() => {
    const socket = websocketService.connect();

    const handlePM2Update = (event: PM2UpdateEvent) => {
      queryClient.setQueryData<PM2Process[]>(['pm2-processes'], (old) => {
        if (!old) return old;

        const exists = old.find((p) => p.pm_id === event.process.pm_id);
        if (exists) {
          return old.map((p) =>
            p.pm_id === event.process.pm_id ? event.process : p
          );
        } else {
          return [...old, event.process];
        }
      });
    };

    websocketService.on<PM2UpdateEvent>('pm2-update', handlePM2Update);

    return () => {
      websocketService.off<PM2UpdateEvent>('pm2-update', handlePM2Update);
    };
  }, [queryClient]);

  return query;
}

/**
 * Get logs for a specific PM2 process
 */
export function usePM2Logs(pm_id: number, enabled = false) {
  return useQuery<PM2LogEntry[]>({
    queryKey: ['pm2-logs', pm_id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/pm2/${pm_id}/logs`);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      return response.json();
    },
    enabled,
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

/**
 * Restart a PM2 process
 */
export function useRestartPM2() {
  const queryClient = useQueryClient();

  return useMutation<PM2ActionResponse, Error, number>({
    mutationFn: async (pm_id: number) => {
      const response = await fetch(`${API_BASE_URL}/pm2/${pm_id}/restart`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to restart process');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Optimistically update process status
      queryClient.setQueryData<PM2Process[]>(['pm2-processes'], (old) => {
        if (!old) return old;
        return old.map((p) => {
          if (p.pm_id === data.pm_id) {
            return { ...p, status: 'launching' as const };
          }
          return p;
        });
      });

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['pm2-processes'] });
      }, 2000);
    },
  });
}

/**
 * Reload a PM2 process (zero-downtime restart)
 */
export function useReloadPM2() {
  const queryClient = useQueryClient();

  return useMutation<PM2ActionResponse, Error, number>({
    mutationFn: async (pm_id: number) => {
      const response = await fetch(`${API_BASE_URL}/pm2/${pm_id}/reload`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reload process');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData<PM2Process[]>(['pm2-processes'], (old) => {
        if (!old) return old;
        return old.map((p) => {
          if (p.pm_id === data.pm_id) {
            return { ...p, status: 'launching' as const };
          }
          return p;
        });
      });

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['pm2-processes'] });
      }, 2000);
    },
  });
}

/**
 * Stop a PM2 process
 */
export function useStopPM2() {
  const queryClient = useQueryClient();

  return useMutation<PM2ActionResponse, Error, number>({
    mutationFn: async (pm_id: number) => {
      const response = await fetch(`${API_BASE_URL}/pm2/${pm_id}/stop`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to stop process');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData<PM2Process[]>(['pm2-processes'], (old) => {
        if (!old) return old;
        return old.map((p) => {
          if (p.pm_id === data.pm_id) {
            return { ...p, status: 'stopping' as const };
          }
          return p;
        });
      });

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['pm2-processes'] });
      }, 2000);
    },
  });
}

/**
 * Start a PM2 process
 */
export function useStartPM2() {
  const queryClient = useQueryClient();

  return useMutation<PM2ActionResponse, Error, number>({
    mutationFn: async (pm_id: number) => {
      const response = await fetch(`${API_BASE_URL}/pm2/${pm_id}/start`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start process');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData<PM2Process[]>(['pm2-processes'], (old) => {
        if (!old) return old;
        return old.map((p) => {
          if (p.pm_id === data.pm_id) {
            return { ...p, status: 'launching' as const };
          }
          return p;
        });
      });

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['pm2-processes'] });
      }, 2000);
    },
  });
}
