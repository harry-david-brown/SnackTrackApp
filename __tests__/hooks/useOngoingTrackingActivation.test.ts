import { act, renderHook } from '@testing-library/react-native';
import { useOngoingTrackingActivation } from '@hooks/useOngoingTrackingActivation';
import { requestImportNotifications } from '@services/importNotifications';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';

const mockOpen = jest.fn();
jest.mock('@features/navigation', () => ({
  appDestinations: { accountsPermissions: '/settings/accounts-permissions' },
  useAppNavigation: () => ({ open: mockOpen }),
}));
jest.mock('@services/importNotifications', () => ({ requestImportNotifications: jest.fn() }));
jest.mock('@utils/platformAlert', () => ({ showAlert: jest.fn(), showSimpleAlert: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

it('requests device notifications only after tracking consent succeeds', async () => {
  const setConsent = jest.fn().mockResolvedValue(createImportPreferencesFixture());
  jest.mocked(requestImportNotifications).mockResolvedValue(true);
  const { result } = renderHook(() => useOngoingTrackingActivation('user-1', setConsent));

  await act(async () => { await result.current.enableOngoingTracking(); });

  expect(setConsent).toHaveBeenCalledWith('granted');
  expect(setConsent.mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(requestImportNotifications).mock.invocationCallOrder[0]);
  expect(showSimpleAlert).toHaveBeenCalledWith('Ongoing updates are on', expect.stringContaining('notify you'));
});

it('keeps tracking enabled and offers notification settings when permission is denied', async () => {
  const setConsent = jest.fn().mockResolvedValue(createImportPreferencesFixture());
  jest.mocked(requestImportNotifications).mockResolvedValue(false);
  const { result } = renderHook(() => useOngoingTrackingActivation('user-1', setConsent));

  await act(async () => { await result.current.enableOngoingTracking(); });

  expect(setConsent).toHaveBeenCalledWith('granted');
  expect(showAlert).toHaveBeenCalledWith(
    'Ongoing updates are on',
    expect.stringContaining('Device notifications are off'),
    expect.any(Array),
  );
  const buttons = jest.mocked(showAlert).mock.calls[0][2];
  act(() => buttons?.[1].onPress?.());
  expect(mockOpen).toHaveBeenCalledWith('/settings/accounts-permissions');
});

it('does not request notification permission when consent cannot be saved', async () => {
  const setConsent = jest.fn().mockRejectedValue(new Error('save failed'));
  const { result } = renderHook(() => useOngoingTrackingActivation('user-1', setConsent));

  await expect(act(async () => result.current.enableOngoingTracking())).rejects.toThrow('save failed');
  expect(requestImportNotifications).not.toHaveBeenCalled();
});
