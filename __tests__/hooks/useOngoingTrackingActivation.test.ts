import { act, renderHook } from '@testing-library/react-native';
import { useOngoingTrackingActivation } from '@hooks/useOngoingTrackingActivation';
import { requestImportNotifications } from '@services/importNotifications';
import { showAlert, showSimpleAlert } from '@utils/platformAlert';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';

jest.mock('@services/importNotifications', () => ({ requestImportNotifications: jest.fn() }));
jest.mock('@utils/platformAlert', () => ({ showAlert: jest.fn(), showSimpleAlert: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
it.each(['setting_up', 'active', 'reconnect_required', 'error'] as const)('returns %s without prompting for notifications or claiming success', async effectiveState => {
  const preferences = createImportPreferencesFixture();
  preferences.ongoingTracking.effectiveState = effectiveState;
  const setConsent = jest.fn().mockResolvedValue(preferences);
  const onNotificationChange = jest.fn();
  const { result } = renderHook(() => useOngoingTrackingActivation('user-1', setConsent, onNotificationChange));
  let response;
  await act(async () => { response = await result.current.enableOngoingTracking(); });
  expect(response).toBe(preferences);
  expect(setConsent).toHaveBeenCalledWith('granted');
  expect(requestImportNotifications).not.toHaveBeenCalled();
  expect(onNotificationChange).not.toHaveBeenCalled();
  expect(showAlert).not.toHaveBeenCalled();
  expect(showSimpleAlert).not.toHaveBeenCalled();
});
it('propagates an unconfirmed save to the caller', async () => {
  const setConsent = jest.fn().mockRejectedValue(new Error('save failed'));
  const { result } = renderHook(() => useOngoingTrackingActivation('user-1', setConsent));
  await expect(result.current.enableOngoingTracking()).rejects.toThrow('save failed');
  expect(requestImportNotifications).not.toHaveBeenCalled();
});
