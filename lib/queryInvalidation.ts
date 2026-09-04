import type { QueryClient } from "@tanstack/react-query";
import { analyticsKeys, experienceKeys, importPreferenceKeys, receiptKeys } from "./queryKeys";

export const invalidateAnalytics = (queryClient: QueryClient, userId: string) =>
  queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, userId] });

export const invalidateReceiptDerivedData = async (
  queryClient: QueryClient,
  userId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, userId] }),
    queryClient.invalidateQueries({ queryKey: [...receiptKeys.all, userId] }),
    queryClient.invalidateQueries({
      queryKey: importPreferenceKeys.current(userId),
    }),
    queryClient.invalidateQueries({ queryKey: experienceKeys.state(userId) }),
  ]);
};

export const invalidateImportState = async (
  queryClient: QueryClient,
  userId: string,
) => {
  await queryClient.invalidateQueries({
    queryKey: importPreferenceKeys.current(userId),
  });
  await queryClient.invalidateQueries({ queryKey: experienceKeys.state(userId) });
};
