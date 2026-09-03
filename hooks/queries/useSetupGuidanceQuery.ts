import { useQuery } from "@tanstack/react-query";
import { importPreferenceKeys } from "@lib/queryKeys";
import { gmailApi } from "@services/gmailApi";

export function useSetupGuidanceQuery(userId?: string) {
  return useQuery({
    queryKey: importPreferenceKeys.setupGuidance(userId ?? "anonymous"),
    queryFn: gmailApi.getSetupGuidance,
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
}
