import { resolveDashboardInsightsState } from '@components/dashboard/dashboardInsightsState';
import type { DashboardInsightEdition } from '@/types/api';

const edition: DashboardInsightEdition = {
  localDate: '2026-08-13', timezone: 'America/Toronto', generatedAt: '2026-08-13T12:00:00.000Z', nextRefreshAt: '2026-08-14T04:00:00.000Z', metricVersion: 'daily-v1', availableCandidateCount: 1,
  insights: [{ id: 'one', presentation: 'hero', category: 'habits', icon: 'calendar', eyebrow: 'Test', title: 'One', value: 1, valueFormat: 'number' }],
};

describe('dashboard insight section state', () => {
  it('distinguishes first load, true empty, insufficient data, and hard error', () => {
    expect(resolveDashboardInsightsState({ isLoading: true, isFetching: true, isError: false, receiptCount: null }).id).toBe('loading');
    expect(resolveDashboardInsightsState({ isLoading: false, isFetching: false, isError: false, receiptCount: 0 }).id).toBe('empty');
    expect(resolveDashboardInsightsState({ isLoading: false, isFetching: false, isError: false, receiptCount: 2 }).id).toBe('insufficient');
    expect(resolveDashboardInsightsState({ isLoading: false, isFetching: false, isError: true, receiptCount: 2 }).id).toBe('error');
  });

  it('keeps a previous edition visible during refresh and after a refresh error', () => {
    const refreshing = resolveDashboardInsightsState({ edition, isLoading: false, isFetching: true, isError: false, receiptCount: 4 });
    expect(refreshing.id).toBe('success');
    expect(refreshing.subtitle).toContain('Refreshing');
    const stale = resolveDashboardInsightsState({ edition, isLoading: false, isFetching: false, isError: true, receiptCount: 4 });
    expect(stale.id).toBe('stale-success');
    expect(stale.subtitle).toContain('Refresh failed');
    if (stale.id === 'stale-success') expect(stale.edition).toBe(edition);
  });
});
