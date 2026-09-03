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
}

export const useReceiptsQuery = (
  userId?: string | null,
  options: ReceiptsQueryOptions = {},
) => {
  const pageSize = options.pageSize ?? DEFAULT_RECEIPT_PAGE_SIZE;
  const filters = options.filters ?? {};
  const requestKey = { pageSize, ...filters };
  return useInfiniteQuery({
    queryKey: receiptKeys.list(userId ?? 'anonymous', requestKey),
    queryFn: ({ pageParam }) =>
      receiptApi.getReceipts({ page: pageParam, limit: pageSize, filters }),
    initialPageParam: 1,
    enabled: Boolean(userId),
    getNextPageParam: lastPage => lastPage.pageInfo.nextPage ?? undefined,
  });
};
