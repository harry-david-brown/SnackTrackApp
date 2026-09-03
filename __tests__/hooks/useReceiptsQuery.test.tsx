import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useReceiptsQuery } from '@hooks/queries/useReceiptsQuery';
import { receiptApi } from '@services/api/receiptApi';
import { ReceiptType } from '@/types/api';
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
      filters: { receiptType: ReceiptType.UBER_EATS, minAmount: 5 },
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
});
