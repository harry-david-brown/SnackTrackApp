import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import HomeScreen from '@/app/index';

let mockUserState: Record<string, unknown>;
let mockAnalyticsState: Record<string, unknown>;

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    return React.createElement(Text, null, `redirect:${href}`);
  },
}));

jest.mock('@contexts/UserContext', () => ({
  useUser: () => ({ state: mockUserState }),
}));

jest.mock('@contexts/OnboardingContext', () => ({
  useOnboarding: () => ({ hasCompletedOnboarding: true, isLoading: false, completeOnboarding: jest.fn() }),
}));

jest.mock('@hooks/queries/useAnalyticsQueries', () => ({
  useAnalyticsQuery: jest.fn(() => mockAnalyticsState),
}));

jest.mock('@components/auth/LoginScreen', () => ({ LoginScreen: () => null }));
jest.mock('@components/OnboardingScreen', () => () => null);

describe('login/session restoration journey', () => {
  beforeEach(() => {
    mockUserState = { isLoading: false, isAuthenticated: true, user: { id: 'user-1' } };
    mockAnalyticsState = { isPending: false, data: { totalReceipts: 8 } };
  });

  it('lands a restored session with data on the dashboard', () => {
    render(<HomeScreen />);
    expect(screen.getByText('redirect:/(tabs)')).toBeTruthy();
  });

  it('lands a restored empty session in the import journey', () => {
    mockAnalyticsState = { isPending: false, data: { totalReceipts: 0 } };
    render(<HomeScreen />);
    expect(screen.getByText('redirect:/(tabs)/upload')).toBeTruthy();
  });

  it('offers retry instead of treating a failed analytics request as an empty account', () => {
    const refetch = jest.fn();
    mockAnalyticsState = { isPending: false, isError: true, data: undefined, refetch };

    render(<HomeScreen />);

    expect(screen.queryByText('redirect:/(tabs)/upload')).toBeNull();
    expect(screen.getByText('We couldn’t load your SnackTrack history. Check your connection and try again.')).toBeTruthy();
    fireEvent.press(screen.getByText('Try Again'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
