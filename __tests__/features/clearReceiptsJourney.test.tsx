import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { OnboardingProvider, useOnboarding } from '../../contexts/OnboardingContext';
import { analyticsKeys, gmailStatusKeys, importPreferenceKeys, receiptKeys } from '../../lib/queryKeys';
import { userApi } from '../../services/api';
import { createQueryTestWrapper } from '../utils/queryTestUtils';

const mockResetExportUpsellForUser = jest.fn();
const mockResetExportDownloadStateForUser = jest.fn();

jest.mock('../../contexts/UserContext', () => ({
  useUser: () => ({ state: { isAuthenticated: true, user: { id: 'user-1' } } }),
}));
jest.mock('../../services/api', () => ({ userApi: { resetOnboarding: jest.fn() } }));
jest.mock('../../hooks/useExportUpsell', () => ({
  resetExportUpsellForUser: (...args: unknown[]) => mockResetExportUpsellForUser(...args),
}));
jest.mock('../../utils/exportDownloadHandoff', () => ({
  resetExportDownloadStateForUser: (...args: unknown[]) => mockResetExportDownloadStateForUser(...args),
}));

function ResetHarness() {
  const onboarding = useOnboarding();
  return (
    <TouchableOpacity onPress={() => void onboarding.resetOnboarding()}>
      <Text>{onboarding.hasCompletedOnboarding ? 'complete' : 'empty'}</Text>
    </TouchableOpacity>
  );
}

describe('clear receipts journey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (userApi.resetOnboarding as jest.Mock).mockResolvedValue({ success: true, deletedReceipts: 10, message: 'reset' });
    mockResetExportUpsellForUser.mockResolvedValue(undefined);
    mockResetExportDownloadStateForUser.mockResolvedValue(undefined);
  });

  it('clears onboarding and every user-bound source cache after the server reset', async () => {
    const { Wrapper, queryClient } = createQueryTestWrapper();
    queryClient.setQueryData(analyticsKeys.summary('user-1'), { totalReceipts: 10 });
    queryClient.setQueryData(receiptKeys.list('user-1', 20), { pages: [] });
    queryClient.setQueryData(importPreferenceKeys.current('user-1'), { export: { status: 'completed' } });
    queryClient.setQueryData(gmailStatusKeys.current('user-1'), { connected: true });

    render(<OnboardingProvider><ResetHarness /></OnboardingProvider>, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByText('complete')).toBeTruthy());
    fireEvent.press(screen.getByText('complete'));
    await waitFor(() => expect(screen.getByText('empty')).toBeTruthy());

    expect(userApi.resetOnboarding).toHaveBeenCalledWith('user-1');
    expect(mockResetExportUpsellForUser).toHaveBeenCalledWith('user-1');
    expect(mockResetExportDownloadStateForUser).toHaveBeenCalledWith('user-1');
    expect(queryClient.getQueriesData({ queryKey: [...analyticsKeys.all, 'user-1'] })).toHaveLength(0);
    expect(queryClient.getQueriesData({ queryKey: [...receiptKeys.all, 'user-1'] })).toHaveLength(0);
    expect(queryClient.getQueryData(importPreferenceKeys.current('user-1'))).toBeUndefined();
    expect(queryClient.getQueryData(gmailStatusKeys.current('user-1'))).toBeUndefined();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@snacktrack_onboarding_completed_user-1');
  });
});
