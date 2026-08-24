import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '@lib/queryClient';
import { useDashboardInsightsQuery } from '@hooks/queries/useAnalyticsQueries';
import { dashboardInsightsApi } from '@services/dashboardInsightsApi';
import type { DashboardInsightEdition } from '@/types/api';

jest.mock('@services/dashboardInsightsApi', () => ({
  dashboardInsightsApi: { getEdition: jest.fn() },
}));

const edition = (localDate: string, nextRefreshAt: string): DashboardInsightEdition => ({
  localDate,
  timezone: 'America/Toronto',
  generatedAt: `${localDate}T15:00:00.000Z`,
  nextRefreshAt,
  metricVersion: 'daily-v1',
  availableCandidateCount: 1,
  insights: [{ id: localDate, presentation: 'hero', category: 'habits', icon: 'calendar', eyebrow: 'Test', title: localDate, value: 1, valueFormat: 'number' }],
});

describe('useDashboardInsightsQuery', () => {
  const originalTimezone = process.env.TZ;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.TZ = 'America/Toronto';
    jest.setSystemTime(new Date('2026-08-14T03:59:58.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.TZ = originalTimezone;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('changes the query key at local midnight while retaining the previous edition during refresh', async () => {
    let resolveSecond: ((value: DashboardInsightEdition) => void) | undefined;
    jest.mocked(dashboardInsightsApi.getEdition)
      .mockResolvedValueOnce(edition('2026-08-13', '2026-08-14T04:00:00.000Z'))
      .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve; }));
    const queryClient = createAppQueryClient({ forTests: true });
    const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useDashboardInsightsQuery('user-id'), { wrapper });
    await waitFor(() => expect(result.current.data?.localDate).toBe('2026-08-13'));

    act(() => {
      jest.setSystemTime(new Date('2026-08-14T04:00:01.000Z'));
      jest.advanceTimersByTime(2500);
    });
    expect(result.current.localDate).toBe('2026-08-14');
    expect(result.current.data?.localDate).toBe('2026-08-13');
    expect(result.current.isFetching).toBe(true);

    await act(async () => { resolveSecond?.(edition('2026-08-14', '2026-08-15T04:00:00.000Z')); });
    await waitFor(() => expect(result.current.data?.localDate).toBe('2026-08-14'));
    expect(dashboardInsightsApi.getEdition).toHaveBeenCalledTimes(2);
    queryClient.clear();
  });

  it('checks the local date when the app returns to the foreground', async () => {
    let foreground: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      foreground = listener as (state: string) => void;
      return { remove: jest.fn() };
    });
    jest.mocked(dashboardInsightsApi.getEdition)
      .mockResolvedValueOnce(edition('2026-08-13', '2026-08-15T04:00:00.000Z'))
      .mockResolvedValueOnce(edition('2026-08-14', '2026-08-15T04:00:00.000Z'));
    const queryClient = createAppQueryClient({ forTests: true });
    const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useDashboardInsightsQuery('user-id'), { wrapper });
    await waitFor(() => expect(result.current.data?.localDate).toBe('2026-08-13'));
    act(() => {
      jest.setSystemTime(new Date('2026-08-14T14:00:00.000Z'));
      foreground?.('active');
    });
    await waitFor(() => expect(result.current.data?.localDate).toBe('2026-08-14'));
    queryClient.clear();
  });

  it('uses the development day offset as query input and fetches a separate edition', async () => {
    jest.mocked(dashboardInsightsApi.getEdition)
      .mockResolvedValueOnce(edition('2026-08-13', '2026-08-14T04:00:00.000Z'))
      .mockResolvedValueOnce(edition('2026-08-16', '2026-08-17T04:00:00.000Z'));
    const queryClient = createAppQueryClient({ forTests: true });
    const wrapper = ({ children }: React.PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result, rerender } = renderHook(
      ({ offset }) => useDashboardInsightsQuery('user-id', offset),
      { initialProps: { offset: 0 }, wrapper },
    );
    await waitFor(() => expect(result.current.data?.localDate).toBe('2026-08-13'));
    rerender({ offset: 3 });
    await waitFor(() => expect(result.current.data?.localDate).toBe('2026-08-16'));
    expect(dashboardInsightsApi.getEdition).toHaveBeenNthCalledWith(1, 'user-id', 0);
    expect(dashboardInsightsApi.getEdition).toHaveBeenNthCalledWith(2, 'user-id', 3);
    queryClient.clear();
  });
});
