import type { UserSummary } from '@/types/api';

export type AnalyticsSummaryState =
  | { readonly id: 'loading' }
  | { readonly id: 'error' }
  | { readonly id: 'empty'; readonly summary: UserSummary }
  | { readonly id: 'success' | 'refreshing'; readonly summary: UserSummary };

export interface AnalyticsSummaryStateInput {
  readonly summary?: UserSummary;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly isFetching: boolean;
}

export const resolveAnalyticsSummaryState = (
  input: AnalyticsSummaryStateInput,
): AnalyticsSummaryState => {
  if (!input.summary && input.isPending) return { id: 'loading' };
  if (!input.summary && input.isError) return { id: 'error' };
  if (!input.summary) return { id: 'loading' };
  if (input.summary.totalReceipts === 0) return { id: 'empty', summary: input.summary };
  return {
    id: input.isFetching ? 'refreshing' : 'success',
    summary: input.summary,
  };
};
