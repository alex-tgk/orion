import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { API } from '../services/api';

interface Service {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting';
  uptime: number;
  health: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  version?: string;
  url?: string;
}

/**
 * Custom hook for fetching all services status with React Query
 * Provides automatic caching, refetching, and state management
 */
export function useServices(refetchInterval = 15000): UseQueryResult<Service[], Error> {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => API.getServices(),
    refetchInterval,
    staleTime: 5000, // Consider data fresh for 5 seconds
    retry: 3,
  });
}
