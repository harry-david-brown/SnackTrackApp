import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import HomeScreen from '@/app/index';

let mockUserState: Record<string, unknown>;
let mockExperienceState: Record<string, unknown>;

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const mockReact = jest.requireActual<typeof import('react')>('react');
    const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
    return mockReact.createElement(MockText, null, `redirect:${href}`);
  },
}));

jest.mock('@contexts/UserContext', () => ({
  useUser: () => ({ state: mockUserState }),
}));

jest.mock('@contexts/OnboardingContext', () => ({
  useOnboarding: () => ({ hasCompletedOnboarding: true, isLoading: false, completeOnboarding: jest.fn() }),
}));

jest.mock('@hooks/queries/useExperienceStateQuery', () => ({
  useExperienceStateQuery: jest.fn(() => mockExperienceState),
}));

jest.mock('@hooks/useExportUpsell', () => ({ loadExportUpsellStateForUser: jest.fn(async () => ({})) }));
jest.mock('@services/experienceApi', () => ({ experienceApi: { markFirstRecapSeen: jest.fn() } }));

jest.mock('@components/auth/LoginScreen', () => ({ LoginScreen: () => null }));
jest.mock('@components/OnboardingScreen', () => () => null);

describe('login/session restoration journey', () => {
  beforeEach(() => {
    mockUserState = { isLoading: false, isAuthenticated: true, user: { id: 'user-1' } };
    mockExperienceState = { isPending: false, data: { setup: { state: 'complete' }, firstRecap: { state: 'seen' } } };
  });

  it('lands a restored session with data on the dashboard', () => {
    render(<HomeScreen />);
    expect(screen.getByText('redirect:/(tabs)')).toBeTruthy();
  });

  it('lands a restored empty session in the import journey', () => {
    mockExperienceState = { isPending: false, data: { setup: { state: 'required' }, firstRecap: { state: 'ineligible' } } };
    render(<HomeScreen />);
    expect(screen.getByText('redirect:/data-setup')).toBeTruthy();
  });

  it('offers retry instead of treating a failed analytics request as an empty account', () => {
    const refetch = jest.fn();
    mockExperienceState = { isPending: false, isError: true, data: undefined, refetch };

    render(<HomeScreen />);

    expect(screen.queryByText('redirect:/data-setup')).toBeNull();
    expect(screen.getByText('We couldn’t load your SnackTrack setup. Check your connection and try again.')).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
