import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { API } from '../services/api';

interface Stats {
  totalUsers: number;
  activeServices: number;
  requestsToday: number;
  avgResponseTime: number;
}

/**
 * Custom hook for fetching dashboard statistics with React Query
 * Provides automatic caching, refetching, and state management
 */
export function useStats(refetchInterval = 30000): UseQueryResult<Stats, Error> {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => API.getStats(),
    refetchInterval,
    staleTime: 10000, // Consider data fresh for 10 seconds
    retry: 3,
  });
}
