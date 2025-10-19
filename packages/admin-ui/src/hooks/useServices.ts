import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../services/api';
import { websocketService } from '../services/websocket.service';
import type {
  Service,
  ServiceMetrics,
  ServiceActionResponse,
  ServiceHealthEvent,
} from '../types/services.types';

const API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3004/api';

/**
 * Fetch all services
 */
export function useServices() {
  const queryClient = useQueryClient();

  // Fetch services
  const query = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/services`);
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      return response.json();
    },
    refetchInterval: 30000, // Fallback polling every 30s
    staleTime: 10000,
  });

  // WebSocket real-time updates
  useEffect(() => {
    const socket = websocketService.connect();

    const handleServiceHealth = (event: ServiceHealthEvent) => {
      queryClient.setQueryData<Service[]>(['services'], (old) => {
        if (!old) return old;

        return old.map((service) => {
          if (service.id === event.serviceId) {
            return {
              ...service,
              status: event.status,
              healthStatus: event.healthStatus,
              cpu: event.metrics.cpu,
              memory: event.metrics.memory,
              responseTime: event.metrics.responseTime,
              lastChecked: event.timestamp,
            };
          }
          return service;
        });
      });
    };

    websocketService.on<ServiceHealthEvent>('service-health', handleServiceHealth);

    return () => {
      websocketService.off<ServiceHealthEvent>('service-health', handleServiceHealth);
    };
  }, [queryClient]);

  return query;
}

/**
 * Fetch metrics for a specific service
 */
export function useServiceMetrics(serviceId: string, enabled = true) {
  return useQuery<ServiceMetrics[]>({
    queryKey: ['service-metrics', serviceId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}/metrics`);
      if (!response.ok) {
        throw new Error('Failed to fetch service metrics');
      }
      return response.json();
    },
    enabled,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

/**
 * Restart a service
 */
export function useRestartService() {
  const queryClient = useQueryClient();

  return useMutation<ServiceActionResponse, Error, string>({
    mutationFn: async (serviceId: string) => {
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}/restart`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to restart service');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Optimistically update the service status
      queryClient.setQueryData<Service[]>(['services'], (old) => {
        if (!old) return old;
        return old.map((service) => {
          if (service.id === data.serviceId) {
            return { ...service, status: 'starting' as const };
          }
          return service;
        });
      });

      // Refetch services after a delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['services'] });
      }, 2000);
    },
  });
}

/**
 * Stop a service
 */
export function useStopService() {
  const queryClient = useQueryClient();

  return useMutation<ServiceActionResponse, Error, string>({
    mutationFn: async (serviceId: string) => {
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}/stop`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to stop service');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Service[]>(['services'], (old) => {
        if (!old) return old;
        return old.map((service) => {
          if (service.id === data.serviceId) {
            return { ...service, status: 'stopping' as const };
          }
          return service;
        });
      });

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['services'] });
      }, 2000);
    },
  });
}

/**
 * Start a service
 */
export function useStartService() {
  const queryClient = useQueryClient();

  return useMutation<ServiceActionResponse, Error, string>({
    mutationFn: async (serviceId: string) => {
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}/start`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start service');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Service[]>(['services'], (old) => {
        if (!old) return old;
        return old.map((service) => {
          if (service.id === data.serviceId) {
            return { ...service, status: 'starting' as const };
          }
          return service;
        });
      });

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['services'] });
      }, 2000);
    },
  });
}
