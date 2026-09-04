import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { experienceKeys } from '@lib/queryKeys';
import { experienceApi } from '@services/experienceApi';

export function useExperienceStateQuery(userId?: string) {
  return useQuery({
    queryKey: experienceKeys.state(userId ?? 'anonymous'),
    queryFn: experienceApi.getState,
    enabled: Boolean(userId),
    staleTime: 15_000,
  });
}

export function useMarkFirstRecapSeen(userId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: experienceApi.markFirstRecapSeen,
    onSuccess: (state) => {
      if (userId) queryClient.setQueryData(experienceKeys.state(userId), state);
    },
  });
}
