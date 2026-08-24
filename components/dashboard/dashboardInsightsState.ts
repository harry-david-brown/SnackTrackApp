import type { DashboardInsightEdition } from '@/types/api';

export type DashboardInsightsState =
  | { id: 'loading'; title: string; subtitle: string }
  | { id: 'empty'; title: string; subtitle: string }
  | { id: 'insufficient'; title: string; subtitle: string }
  | { id: 'error'; title: string; subtitle: string }
  | { id: 'success' | 'stale-success'; title: string; subtitle: string; edition: DashboardInsightEdition };

export interface DashboardInsightsStateInput {
  edition?: DashboardInsightEdition;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  receiptCount: number | null;
}

export function resolveDashboardInsightsState({
  edition,
  isLoading,
  isFetching,
  isError,
  receiptCount,
}: DashboardInsightsStateInput): DashboardInsightsState {
  if (edition?.insights.length) {
    const count = edition.insights.length;
    return {
      id: isError ? 'stale-success' : 'success',
      title: 'What we noticed',
      subtitle: `Your daily edition · ${count} ${count === 1 ? 'observation' : 'observations'}${isError ? ' · Refresh failed' : isFetching ? ' · Refreshing' : ''}`,
      edition,
    };
  }
  if (isLoading || receiptCount === null) return { id: 'loading', title: 'What we noticed', subtitle: 'Preparing today’s observations…' };
  if (isError) return { id: 'error', title: 'What we noticed', subtitle: 'Today’s edition could not be refreshed.' };
  if (receiptCount === 0) return { id: 'empty', title: 'What we noticed', subtitle: 'Your first receipt will give us something to notice.' };
  return { id: 'insufficient', title: 'What we noticed', subtitle: 'A few more orders will unlock stronger patterns.' };
}
