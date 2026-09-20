import { useInfiniteQuery } from '@tanstack/react-query';
import { receiptKeys } from '@lib/queryKeys';
import {
  DEFAULT_RECEIPT_PAGE_SIZE,
  receiptApi,
  type ReceiptListFilters,
} from '@services/api/receiptApi';

export interface ReceiptsQueryOptions {
  readonly pageSize?: number;
  readonly filters?: ReceiptListFilters;
  readonly insight?: { readonly id: string; readonly localDate: string; readonly snapshotId?: string };
}

export const useReceiptsQuery = (
  userId?: string | null,
  options: ReceiptsQueryOptions = {},
) => {
  const pageSize = options.pageSize ?? DEFAULT_RECEIPT_PAGE_SIZE;
  const filters = options.filters ?? {};
  const requestKey = { pageSize, ...filters, ...(options.insight ? { insight: options.insight } : {}) };
  return useInfiniteQuery({
    queryKey: receiptKeys.list(userId ?? 'anonymous', requestKey),
    queryFn: ({ pageParam }) => options.insight
      ? receiptApi.getInsightReceipts({
          userId: userId!,
          insightId: options.insight.id,
          localDate: options.insight.localDate,
          snapshotId: options.insight.snapshotId,
          page: pageParam,
          limit: pageSize,
        })
      : receiptApi.getReceipts({ page: pageParam, limit: pageSize, filters }),
    initialPageParam: 1,
    enabled: Boolean(userId),
    getNextPageParam: lastPage => lastPage.pageInfo.nextPage ?? undefined,
  });
};
