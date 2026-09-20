import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useReceiptsQuery } from '@hooks/queries/useReceiptsQuery';
import { receiptApi } from '@services/api/receiptApi';
import { ReceiptType } from '@/types/api';
import type { ReceiptOutcomeFilter } from '@/types/receiptOutcome';
import { createQueryTestWrapper } from '@/__tests__/utils/queryTestUtils';

jest.mock('@services/api/receiptApi', () => ({
  DEFAULT_RECEIPT_PAGE_SIZE: 20,
  receiptApi: { getReceipts: jest.fn() },
}));

const page = (current: number, nextPage: number | null) => ({
  items: [],
  pageInfo: {
    page: current,
    limit: 10,
    total: nextPage ? 11 : current === 1 ? 0 : 11,
    totalPages: nextPage ? 2 : current === 1 ? 0 : 2,
    hasMore: nextPage !== null,
    nextPage,
  },
});

describe('useReceiptsQuery', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses filters in the authoritative key and carries them through every page', async () => {
    jest.mocked(receiptApi.getReceipts)
      .mockResolvedValueOnce(page(1, 2))
      .mockResolvedValueOnce(page(2, null));
    const { Wrapper, queryClient } = createQueryTestWrapper();
    const options = {
      pageSize: 10,
      filters: { receiptType: ReceiptType.UBER_EATS, minAmount: 5, outcome: 'canceled', currencyCode: 'CAD', startDate: '2023-12-10', endDate: '2023-12-10' },
    } as const;
    const { result } = renderHook(() => useReceiptsQuery('user-1', options), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(receiptApi.getReceipts).toHaveBeenNthCalledWith(1, {
      page: 1,
      limit: 10,
      filters: options.filters,
    });
    expect(receiptApi.getReceipts).toHaveBeenNthCalledWith(2, {
      page: 2,
      limit: 10,
      filters: options.filters,
    });
    expect(queryClient.getQueryCache().findAll({ queryKey: ['receipts', 'user-1'] }))
      .toHaveLength(1);
  });

  it('does not request receipt state without authenticated identity', () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(() => useReceiptsQuery(null), { wrapper: Wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(receiptApi.getReceipts).not.toHaveBeenCalled();
  });
  it('starts at page one on outcome changes and does not reuse another outcome’s accumulated pages', async () => {
    jest.mocked(receiptApi.getReceipts).mockImplementation(async request => page(request.page, request.page === 1 ? 2 : null));
    const { Wrapper, queryClient } = createQueryTestWrapper();
    const { result, rerender } = renderHook(({ outcome }: { outcome: ReceiptOutcomeFilter }) => {
      const query = useReceiptsQuery('user-1', { pageSize: 10, filters: { outcome } });
      // Subscribe to data during render, as History does (TanStack tracks accessed properties).
      return { data: query.data, isSuccess: query.isSuccess, fetchNextPage: query.fetchNextPage };
    },
      { wrapper: Wrapper, initialProps: { outcome: 'canceled' as ReceiptOutcomeFilter } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => { await result.current.fetchNextPage(); });
    expect(jest.mocked(receiptApi.getReceipts).mock.calls.map(([request]) => request.page)).toEqual([1, 2]);
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    rerender({ outcome: 'refunded' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toHaveLength(1);
    expect(receiptApi.getReceipts).toHaveBeenLastCalledWith({ page: 1, limit: 10, filters: { outcome: 'refunded' } });
    expect(queryClient.getQueryCache().findAll({ queryKey: ['receipts', 'user-1'] })).toHaveLength(2);
  });
});
