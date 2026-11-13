import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import WrappedJourneyScreen from '@/app/(tabs)/wrapped-journey';

const mockReplace = jest.fn(() => 'navigated');
let mockRestart: string | undefined = 'test';
const defaultSummary = { totalReceipts: 1, totalSpent: 0, averageOrderValue: 0, currencyCode: 'CAD', topRestaurants: [], wrappedAnalytics: { comparative: {} }, orderMetrics: { currencies: [] as { currencyCode: string; pricedOrders: number }[] } };
let mockSummary = defaultSummary;
let mockEntryPoint = 'summary';
let mockShouldOffer = false;
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ restart: mockRestart, entryPoint: mockEntryPoint }) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('@features/navigation', () => ({
  appDestinations: { home: '/(tabs)', history: '/(tabs)/history' },
  useAppNavigation: () => ({ replace: mockReplace }),
}));
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@contexts/UserContext', () => ({ useUser: () => ({ state: { user: { id: 'test' } } }) }));
jest.mock('@contexts/CurrencyContext', () => ({ useCurrency: () => ({ formatCurrency: (value: number) => '$' + value.toFixed(2) }) }));
jest.mock('@hooks/useWrappedJourneyController', () => ({ useWrappedJourneyController: () => ({
  analytics: mockSummary, isLoading: false,
  dataUpdatedAt: 1, shouldOfferUpdates: mockShouldOffer,
}) }));
jest.mock('@services/experienceApi', () => ({ experienceApi: { markFirstRecapSeen: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@services/adminAnalytics', () => ({ trackAdminEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@features/ads/adSession', () => ({ suppressAdsForSession: jest.fn() }));
jest.mock('@components/wrapped/WrappedShareJourney', () => {
  const { View, Button } = jest.requireActual('react-native');
  return function MockWrappedShareJourney({ onClose, onFinishPostWrapped }: { onClose: () => void; onFinishPostWrapped: () => void }) { return (
    <View testID="recap"><Button title="Close recap" onPress={onClose} /><Button title="Finish recap" onPress={onFinishPostWrapped} /></View>
  ); };
});

beforeEach(() => { jest.clearAllMocks(); mockSummary = defaultSummary; mockRestart = 'test'; mockEntryPoint = 'summary'; mockShouldOffer = false; });
it.each(['Close recap', 'Finish recap'])('%s returns home while keeping the recap mounted for the transition', action => {
  const screen = render(<WrappedJourneyScreen />);
  fireEvent.press(screen.getByText(action));
  expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  expect(screen.getByTestId('recap')).toBeTruthy();
  expect(screen.queryByText('Summary')).toBeNull();
});
it('preserves the eligible first-import offer with Home as its return destination', () => {
  mockEntryPoint = 'automatic_first_import'; mockShouldOffer = true;
  const screen = render(<WrappedJourneyScreen />);
  fireEvent.press(screen.getByText('Close recap'));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/ongoing-updates', params: { automatic: 'true' } });
});
it('does not pitch automatic updates after a replay', () => {
  mockShouldOffer = true;
  const screen = render(<WrappedJourneyScreen />);
  fireEvent.press(screen.getByText('Close recap'));
  expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
});

it('shows an unavailable price for one order with no known charge', () => {
  mockRestart = undefined;
  const screen = render(<WrappedJourneyScreen />);
  expect(screen.getByText('1 order in your history')).toBeTruthy();
  expect(screen.getByText('Unavailable')).toBeTruthy();
  expect(screen.getByText('—')).toBeTruthy();
});

it('labels the priced subset and currency of a mixed ledger', () => {
  mockRestart = undefined;
  mockSummary = { ...defaultSummary, totalReceipts: 5, totalSpent: 44.75, averageOrderValue: 14.92,
    orderMetrics: { currencies: [{ currencyCode: 'CAD', pricedOrders: 3 }, { currencyCode: 'USD', pricedOrders: 1 }] } };
  const screen = render(<WrappedJourneyScreen />);
  expect(screen.getByText('All-time delivery spend (CAD)')).toBeTruthy();
  expect(screen.getByText('Average of 3 priced orders (CAD)')).toBeTruthy();
  expect(screen.getByText('5 orders in your history')).toBeTruthy();
});
