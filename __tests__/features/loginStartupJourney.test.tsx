import { render, screen } from '@testing-library/react-native';
import HomeScreen from '../../app/index';

let mockUserState: Record<string, unknown>;
let mockAnalyticsState: Record<string, unknown>;

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `redirect:${href}`);
  },
}));

jest.mock('../../contexts/UserContext', () => ({
  useUser: () => ({ state: mockUserState }),
}));

jest.mock('../../contexts/OnboardingContext', () => ({
  useOnboarding: () => ({ hasCompletedOnboarding: true, isLoading: false, completeOnboarding: jest.fn() }),
}));

jest.mock('../../hooks/queries/useAnalyticsQueries', () => ({
  useAnalyticsQuery: jest.fn(() => mockAnalyticsState),
}));

jest.mock('../../components/auth/LoginScreen', () => ({ LoginScreen: () => null }));
jest.mock('../../components/OnboardingScreen', () => () => null);

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
});
