import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  FeatureFlag,
  FeatureFlagListResponse,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  AllFeatureFlagStatsResponse,
} from '../types/feature-flag.types';

export function useFeatureFlags() {
  const {
    data: flagsData,
    isLoading,
    error,
    refetch,
  } = useQuery<FeatureFlagListResponse>({
    queryKey: ['feature-flags'],
    queryFn: () => api.get<FeatureFlagListResponse>('/feature-flags'),
  });

  const flags = flagsData?.flags || [];
  const total = flagsData?.total || 0;
  const enabled = flagsData?.enabled || 0;
  const disabled = flagsData?.disabled || 0;

  return {
    flags,
    total,
    enabled,
    disabled,
    isLoading,
    error,
    refetch,
  };
}

export function useFeatureFlag(id: string | null) {
  return useQuery<FeatureFlag>({
    queryKey: ['feature-flag', id],
    queryFn: () => api.get<FeatureFlag>(`/feature-flags/${id}`),
    enabled: !!id,
  });
}

export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation<FeatureFlag, Error, CreateFeatureFlagInput>({
    mutationFn: (input: CreateFeatureFlagInput) =>
      api.post<FeatureFlag>('/feature-flags', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flags-stats'] });
    },
  });
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation<FeatureFlag, Error, { id: string; input: UpdateFeatureFlagInput }>({
    mutationFn: ({ id, input }) =>
      api.put<FeatureFlag>(`/feature-flags/${id}`, input),
    onMutate: async ({ id, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['feature-flags'] });

      // Snapshot the previous value
      const previousFlags = queryClient.getQueryData<FeatureFlagListResponse>(['feature-flags']);

      // Optimistically update to the new value
      if (previousFlags) {
        queryClient.setQueryData<FeatureFlagListResponse>(['feature-flags'], {
          ...previousFlags,
          flags: previousFlags.flags.map((flag) =>
            flag.id === id ? { ...flag, ...input } : flag
          ),
        });
      }

      return { previousFlags };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousFlags) {
        queryClient.setQueryData(['feature-flags'], context.previousFlags);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flag', data.id] });
    },
  });
}

export function useToggleFeatureFlag() {
  const { mutate: updateFlag, ...rest } = useUpdateFeatureFlag();

  const toggleFlag = (id: string, currentEnabled: boolean) => {
    updateFlag({ id, input: { enabled: !currentEnabled } });
  };

  return {
    toggleFlag,
    ...rest,
  };
}

export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => api.delete(`/feature-flags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      queryClient.invalidateQueries({ queryKey: ['feature-flags-stats'] });
    },
  });
}

export function useFeatureFlagStats() {
  const {
    data: statsData,
    isLoading,
    error,
  } = useQuery<AllFeatureFlagStatsResponse>({
    queryKey: ['feature-flags-stats'],
    queryFn: () => api.get<AllFeatureFlagStatsResponse>('/feature-flags/stats'),
  });

  const stats = statsData?.stats || [];
  const totalEvaluations = statsData?.totalEvaluations || 0;

  return {
    stats,
    totalEvaluations,
    isLoading,
    error,
  };
}
