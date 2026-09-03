import type { Receipt } from '@/types/api';

export type ReceiptListState =
  | { readonly id: 'loading' }
  | { readonly id: 'error' }
  | { readonly id: 'empty' }
  | {
      readonly id: 'success' | 'refreshing';
      readonly receipts: readonly Receipt[];
      readonly total: number;
    };

export interface ReceiptListStateInput {
  readonly hasUser: boolean;
  readonly receipts: readonly Receipt[];
  readonly total: number;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly isRefetching: boolean;
}

export const resolveReceiptListState = (input: ReceiptListStateInput): ReceiptListState => {
  if (!input.hasUser || input.isPending) return { id: 'loading' };
  if (input.isError) return { id: 'error' };
  if (input.receipts.length === 0) return { id: 'empty' };
  return {
    id: input.isRefetching ? 'refreshing' : 'success',
    receipts: input.receipts,
    total: input.total,
  };
};
