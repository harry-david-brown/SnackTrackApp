import { resolveAnalyticsSummaryState } from '@features/dashboard/analyticsSummaryState';
import type { UserSummary } from '@/types/api';

const summary = (totalReceipts: number) => ({ totalReceipts, totalSpent: 20 } as UserSummary);

describe('analytics summary presentation state', () => {
  it('distinguishes loading, terminal failure, and a valid empty summary', () => {
    expect(resolveAnalyticsSummaryState({ isPending: true, isError: false, isFetching: true }).id)
      .toBe('loading');
    expect(resolveAnalyticsSummaryState({ isPending: false, isError: true, isFetching: false }).id)
      .toBe('error');
    expect(resolveAnalyticsSummaryState({ summary: summary(0), isPending: false, isError: false, isFetching: false }).id)
      .toBe('empty');
  });

  it('retains committed summary data while a background refresh runs', () => {
    expect(resolveAnalyticsSummaryState({
      summary: summary(4),
      isPending: false,
      isError: false,
      isFetching: true,
    })).toMatchObject({ id: 'refreshing', summary: { totalReceipts: 4 } });
  });
});
