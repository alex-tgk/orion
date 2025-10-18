import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ActivityEntry } from '../types';
import { API } from '../services/api';

/**
 * Custom hook for fetching recent activity with React Query
 * Provides automatic caching, refetching, and state management
 */
export function useRecentActivity(
  limit = 10,
  refetchInterval = 60000
): UseQueryResult<ActivityEntry[], Error> {
  return useQuery({
    queryKey: ['recentActivity', limit],
    queryFn: () => API.getRecentActivity(limit),
    refetchInterval,
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: 3,
  });
}
