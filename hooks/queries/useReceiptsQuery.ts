import { useInfiniteQuery } from '@tanstack/react-query';
import { receiptKeys } from '@lib/queryKeys';
import { receiptApi } from '@services/api';

export const useReceiptsQuery = (userId?: string | null, pageSize = 20) =>
  useInfiniteQuery({
    queryKey: receiptKeys.list(userId ?? 'anonymous', pageSize),
    queryFn: ({ pageParam }) => receiptApi.getReceipts(pageSize, pageParam),
    initialPageParam: 0,
    enabled: Boolean(userId),
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.data.length, 0);
      const hasMore = lastPage.pagination?.hasMore ?? lastPage.data.length === pageSize;
      return hasMore ? loaded : undefined;
    },
  });
