import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { SystemStatus } from '../types';
import { API } from '../services/api';

/**
 * Custom hook for fetching system status with React Query
 * Provides automatic caching, refetching, and state management
 */
export function useSystemStatus(refetchInterval = 30000): UseQueryResult<SystemStatus, Error> {
  return useQuery({
    queryKey: ['systemStatus'],
    queryFn: () => API.getSystemStatus(),
    refetchInterval,
    staleTime: 10000, // Consider data fresh for 10 seconds
    retry: 3,
  });
}
