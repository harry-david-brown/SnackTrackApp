import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import WrappedJourneyScreen from '@/app/(tabs)/wrapped-journey';

const mockReplace = jest.fn(() => 'navigated');
let mockEntryPoint = 'summary';
let mockShouldOffer = false;
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ restart: 'test', entryPoint: mockEntryPoint }) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('@features/navigation', () => ({
  appDestinations: { home: '/(tabs)', history: '/(tabs)/history' },
  useAppNavigation: () => ({ replace: mockReplace }),
}));
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@contexts/UserContext', () => ({ useUser: () => ({ state: { user: { id: 'test' } } }) }));
jest.mock('@contexts/CurrencyContext', () => ({ useCurrency: () => ({ formatCurrency: jest.fn() }) }));
jest.mock('@hooks/useWrappedJourneyController', () => ({ useWrappedJourneyController: () => ({
  analytics: { totalReceipts: 1, wrappedAnalytics: {} }, isLoading: false,
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

beforeEach(() => { jest.clearAllMocks(); mockEntryPoint = 'summary'; mockShouldOffer = false; });
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
