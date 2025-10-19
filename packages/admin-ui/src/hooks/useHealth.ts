import { useQuery } from '@tanstack/react-query';
import type { SystemHealth, HealthCheck } from '../types/services.types';

const API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3004/api';

/**
 * Fetch overall system health
 */
export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }
      return response.json();
    },
    refetchInterval: 15000, // Check every 15 seconds
    staleTime: 5000,
  });
}

/**
 * Fetch health check for a specific service
 */
export function useServiceHealth(serviceId: string, enabled = true) {
  return useQuery<HealthCheck>({
    queryKey: ['service-health', serviceId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}/health`);
      if (!response.ok) {
        throw new Error('Failed to fetch service health');
      }
      return response.json();
    },
    enabled,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}
