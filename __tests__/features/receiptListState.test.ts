import { resolveReceiptListState } from '@features/receipts/receiptListState';
import type { Receipt } from '@/types/api';

const receipt = { id: 'receipt-1' } as Receipt;

describe('receipt list presentation state', () => {
  it('retains loaded receipts when a later request fails', () => {
    expect(resolveReceiptListState({
      hasUser: true, receipts: [receipt], total: 50,
      isPending: false, isError: true, isRefetching: false,
    })).toEqual({ id: 'stale-success', receipts: [receipt], total: 50 });
  });
  it('distinguishes initial loading, failure, and empty success', () => {
    const base = { hasUser: true, receipts: [], total: 0, isPending: false, isError: false, isRefetching: false };
    expect(resolveReceiptListState({ ...base, isPending: true }).id).toBe('loading');
    expect(resolveReceiptListState({ ...base, isError: true }).id).toBe('error');
    expect(resolveReceiptListState(base).id).toBe('empty');
  });

  it('retains committed rows during background refresh', () => {
    const state = resolveReceiptListState({
      hasUser: true,
      receipts: [receipt],
      total: 1,
      isPending: false,
      isError: false,
      isRefetching: true,
    });
    expect(state).toEqual({ id: 'refreshing', receipts: [receipt], total: 1 });
  });
});
