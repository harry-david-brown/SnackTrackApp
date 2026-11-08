import { renderHook } from '@testing-library/react-native';
import { useDashboardExportOfferImpression } from '@hooks/useDashboardExportOfferImpression';
import { trackAdminEvent } from '@services/adminAnalytics';
import type { DashboardExportRecommendation } from '@components/dashboard/dashboardTrackingState';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('@services/adminAnalytics', () => ({ trackAdminEvent: jest.fn().mockResolvedValue(undefined) }));
beforeEach(() => { mockFocused = true; jest.clearAllMocks(); });

it('deduplicates refetches and reappearing variants within a visit, then records the next visit', () => {
  const { rerender } = renderHook(({ variant }: { variant: DashboardExportRecommendation | undefined }) =>
    useDashboardExportOfferImpression('user-1', variant), { initialProps: { variant: 'uber_eats' as DashboardExportRecommendation | undefined } });
  rerender({ variant: undefined });
  rerender({ variant: 'uber_eats' });
  expect(trackAdminEvent).toHaveBeenCalledTimes(1);
  expect(trackAdminEvent).toHaveBeenLastCalledWith('export_offer_shown', { properties: { surface: 'dashboard', variant: 'uber_eats' } });
  rerender({ variant: 'doordash' });
  expect(trackAdminEvent).toHaveBeenCalledTimes(2);
  mockFocused = false;
  rerender({ variant: 'neutral' });
  expect(trackAdminEvent).toHaveBeenCalledTimes(2);
  mockFocused = true;
  rerender({ variant: 'uber_eats' });
  expect(trackAdminEvent).toHaveBeenCalledTimes(3);
});

it('does not record an absent offer or signed-out user and resets for another user', () => {
  const { rerender } = renderHook(({ userId }: { userId: string | undefined }) =>
    useDashboardExportOfferImpression(userId, 'neutral'), { initialProps: { userId: undefined as string | undefined } });
  expect(trackAdminEvent).not.toHaveBeenCalled();
  rerender({ userId: 'user-1' });
  rerender({ userId: 'user-2' });
  expect(trackAdminEvent).toHaveBeenCalledTimes(2);
});
