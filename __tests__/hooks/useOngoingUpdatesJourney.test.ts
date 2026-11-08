import { act, renderHook } from '@testing-library/react-native';
import { useOngoingUpdatesJourney } from '@hooks/useOngoingUpdatesJourney';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';

const mockReplace = jest.fn();
const mockOpen = jest.fn();
const mockPreferences = {
  preferences: createImportPreferencesFixture(), queryError: null, isUpdating: false,
  refresh: jest.fn(), refreshVerified: jest.fn(), setOngoingTrackingConsent: jest.fn(), checkOngoingTracking: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => false }));
jest.mock('@hooks/useImportPreferences', () => ({ useImportPreferences: () => mockPreferences }));
jest.mock('@features/navigation', () => ({
  useAppNavigation: () => ({ open: mockOpen, replace: mockReplace }),
  appDestinations: { home: '/(tabs)', history: '/(tabs)/history' },
  addHistoryDestination: (params: unknown) => ({ pathname: '/add-history', params }),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockPreferences.preferences = createImportPreferencesFixture();
  mockPreferences.preferences.ongoingTracking.baseline = { eligible: true, source: 'exports' };
  mockPreferences.preferences.ongoingTracking.capability.canTrack = true;
  mockPreferences.preferences.ongoingTracking.capability.connectionHealth = 'valid';
});
it('refreshes after an uncertain save and does not repeat an already-saved grant', async () => {
  mockPreferences.setOngoingTrackingConsent.mockRejectedValueOnce(new Error('lost response'));
  const { result } = renderHook(() => useOngoingUpdatesJourney());
  await act(async () => { result.current.primary(); });
  expect(result.current.state).toBe('save_failed');
  const saved = createImportPreferencesFixture();
  saved.ongoingTracking = { ...mockPreferences.preferences.ongoingTracking, consentState: 'granted', effectiveState: 'setting_up' };
  mockPreferences.refreshVerified.mockResolvedValueOnce(saved);
  await act(async () => { result.current.primary(); });
  expect(mockPreferences.refreshVerified).toHaveBeenCalledTimes(1);
  expect(mockPreferences.setOngoingTrackingConsent).toHaveBeenCalledTimes(1);
});
it('does not retry the write while the saved state is unavailable', async () => {
  mockPreferences.setOngoingTrackingConsent.mockRejectedValueOnce(new Error('lost response'));
  const { result } = renderHook(() => useOngoingUpdatesJourney());
  await act(async () => { result.current.primary(); });
  mockPreferences.refreshVerified.mockRejectedValueOnce(new Error('offline'));
  await act(async () => { result.current.primary(); });
  expect(result.current.state).toBe('save_failed');
  expect(mockPreferences.setOngoingTrackingConsent).toHaveBeenCalledTimes(1);
});
it('opens durable progress after retry acceptance, rather than claiming completion', async () => {
  mockPreferences.preferences.ongoingTracking.effectiveState = 'error';
  mockPreferences.preferences.ongoingTracking.consentState = 'granted';
  mockPreferences.checkOngoingTracking.mockResolvedValueOnce({ id: 'operation-1' });
  const { result } = renderHook(() => useOngoingUpdatesJourney());
  await act(async () => { result.current.primary(); });
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/import-progress', params: { operationId: 'operation-1', returnTo: 'ongoing_updates' } });
  expect(mockPreferences.setOngoingTrackingConsent).not.toHaveBeenCalled();
});
it('preserves an existing decline until the user explicitly reconsiders', () => {
  mockPreferences.preferences.ongoingTracking.effectiveState = 'declined';
  const { result, rerender } = renderHook(({ reconsider }) => useOngoingUpdatesJourney(reconsider), { initialProps: { reconsider: false } });
  expect(result.current.state).toBe('off');
  rerender({ reconsider: true });
  expect(result.current.state).toBe('eligible');
  expect(mockPreferences.setOngoingTrackingConsent).not.toHaveBeenCalled();
});
