import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import DashboardScreen from '@/app/(tabs)/index';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
import { trackAdminEvent } from '@services/adminAnalytics';

let mockPreferences = createImportPreferencesFixture();
let mockOperation: { id: string; status: string } | null = null;
const mockOpen = jest.fn();
const mockRefresh = jest.fn();
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@contexts/MotionContext', () => ({ useAppReducedMotion: () => true }));
jest.mock('@contexts/UserContext', () => ({ useUser: () => ({ state: { user: { id: 'user' } }, logout: jest.fn() }) }));
jest.mock('@contexts/CurrencyContext', () => ({ useCurrency: () => ({ formatCurrency: (value: number) => `$${value}` }) }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true, useFocusEffect: () => undefined }));
jest.mock('@features/navigation', () => ({
  ...jest.requireActual('@features/navigation/appDestinations'),
  useAppNavigation: () => ({ open: mockOpen }),
}));
jest.mock('@hooks/useImportPreferences', () => ({ useImportPreferences: () => ({ preferences: mockPreferences, refreshIfStale: mockRefresh }) }));
jest.mock('@hooks/useImportOperation', () => ({ useImportOperation: () => ({ operation: mockOperation }) }));
jest.mock('@hooks/queries/useAnalyticsQueries', () => ({
  useAnalyticsQuery: () => ({ isPending: true }),
  useDashboardInsightsQuery: () => ({ localDate: '2026-09-26', isLoading: true }),
}));
jest.mock('@features/ads/useAdRuntimeConfiguration', () => ({ useAdRuntimeConfiguration: () => ({ configuration: null }) }));
jest.mock('@features/ads/NativeAdPlacement', () => ({ NativeAdPlacement: () => null }));
jest.mock('@features/ads/adSession', () => ({ getSessionAdImpressions: () => 0, getDailyAdImpressions: async () => 0, isAdSessionSuppressed: () => true }));
jest.mock('@services/adminAnalytics', () => ({ trackAdminEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@components/mascot/Mascot', () => ({ Mascot: () => null }));
jest.mock('@components/dashboard/DashboardInsightsDevControls', () => ({ DashboardInsightsDevControls: () => null }));
jest.mock('@components/dashboard/WhatWeNoticedCarousel', () => ({ WhatWeNoticedCarousel: () => null }));
jest.mock('@components/dashboard/HistoricalMonthSummaryCard', () => ({ HistoricalMonthSummaryCard: () => null }));
jest.mock('@components/dashboard/DashboardSpendingHero', () => ({ DashboardSpendingHero: () => {
  const { Text } = jest.requireActual('react-native');
  return <Text>Spending hero</Text>;
} }));
jest.mock('@components/import/ImportOperationCard', () => ({ ImportOperationCard: () => {
  const { Text } = jest.requireActual('react-native');
  return <Text>Import in progress</Text>;
} }));

beforeEach(() => {
  jest.clearAllMocks();
  mockOperation = null;
  mockPreferences = createImportPreferencesFixture();
  mockPreferences.gmailBaseline.hasCompleted = true;
});

it.each([
  [10, 0, 'Get my Uber history', 'uber_eats'],
  [0, 10, 'Get my DoorDash history', 'doordash'],
  [0, 0, 'Explore history exports', undefined],
] as const)('renders one invitation above insights and navigates from %s/%s receipts', async (uber, doorDash, label, provider) => {
  mockPreferences.coverage.emailReceiptCount = uber + doorDash;
  mockPreferences.coverage.emailProviders.uberEats.receiptCount = uber;
  mockPreferences.coverage.emailProviders.doorDash.receiptCount = doorDash;
  const screen = render(<DashboardScreen />);
  await act(async () => {});
  expect(screen.getAllByRole('button', { name: label })).toHaveLength(1);
  const content = JSON.stringify(screen.toJSON());
  expect(content.indexOf('Spending hero')).toBeLessThan(content.indexOf(label));
  expect(content.indexOf(label)).toBeLessThan(content.indexOf('Looking for patterns worth sharing'));
  fireEvent.press(screen.getByRole('button', { name: label }));
  expect(mockOpen).toHaveBeenCalledWith({ pathname: '/add-history', params: { intent: 'provider', returnTo: 'home', ...(provider ? { provider } : {}) } });
  expect(trackAdminEvent).toHaveBeenCalledWith('export_offer_clicked', { properties: { surface: 'dashboard', variant: provider ?? 'neutral' } });
});

it('replaces the invitation with active work without leaving a footer duplicate', async () => {
  mockOperation = { id: 'job-1', status: 'running' };
  const screen = render(<DashboardScreen />);
  await act(async () => {});
  expect(screen.getAllByText('Import in progress')).toHaveLength(1);
  expect(screen.queryByText('Expand your order history')).toBeNull();
  expect(trackAdminEvent).not.toHaveBeenCalledWith('export_offer_shown', expect.anything());
});
