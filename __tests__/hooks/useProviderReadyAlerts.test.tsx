import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProviderReadyAlerts } from '@hooks/useProviderReadyAlerts';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
let mockPreferences = createImportPreferencesFixture();
const mockConsent = jest.fn();
const mockEnable = jest.fn();
const mockHome = jest.fn();
const mockConnect = jest.fn();
let mockSupported = true;
let mockEnabled = false;
jest.mock('@hooks/useImportPreferences', () => ({ useImportPreferences: () => ({ preferences: mockPreferences, setProviderReadyAlertConsent: mockConsent, refresh: async () => mockPreferences, refreshVerified: async () => mockPreferences }) }));
jest.mock('@hooks/useDeviceNotifications', () => ({ useDeviceNotifications: () => ({ enabled: mockEnabled, enable: mockEnable }) }));
jest.mock('@services/importNotifications', () => ({ supportsImportNotifications: () => mockSupported }));
const options = { userId: 'user-1', provider: 'doordash' as const, goHome: mockHome, connectGmail: mockConnect, connectOutlook: mockConnect };
beforeEach(() => {
  jest.clearAllMocks(); mockSupported = true; mockEnabled = false;
  mockPreferences = createImportPreferencesFixture();
  mockPreferences.export.providers.doorDash.requestId = 'request-1';
  mockPreferences.export.providers.doorDash.readyAlert = { consentState: 'not_offered', consentVersion: null, consentedAt: null, revokedAt: null, backgroundAvailable: true, canMonitor: true };
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  mockConsent.mockResolvedValue(mockPreferences); mockEnable.mockResolvedValue(true); mockConnect.mockResolvedValue(false);
});
it('leaves immediately without requesting either permission', async () => {
  const { result } = renderHook(() => useProviderReadyAlerts(options));
  await act(async () => result.current.leave());
  expect(mockHome).toHaveBeenCalledTimes(1);
  expect(mockConsent).not.toHaveBeenCalled(); expect(mockEnable).not.toHaveBeenCalled();
});
it('explicit Notify me saves monitoring consent and enables the shared device setting', async () => {
  const { result } = renderHook(() => useProviderReadyAlerts(options));
  await act(async () => result.current.enroll());
  expect(mockConsent).toHaveBeenCalledWith({ provider: 'doordash', decision: 'granted' });
  expect(mockEnable).toHaveBeenCalledTimes(1); expect(mockHome).not.toHaveBeenCalled();
});
it.each([false, 'failure'])('keeps importing/leaving available after notification outcome %s', async outcome => {
  if (outcome === false) mockEnable.mockResolvedValue(false); else mockEnable.mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useProviderReadyAlerts(options));
  await act(async () => result.current.enroll());
  expect(result.current.issue).toBe(outcome === false ? 'denied' : 'registration');
  await act(async () => result.current.leave());
  expect(mockHome).toHaveBeenCalled();
  expect(mockConsent).not.toHaveBeenCalledWith(expect.objectContaining({ decision: 'revoked' }));
});
it('does not request monitoring consent again when repairing device registration', async () => {
  const alert = mockPreferences.export.providers.doorDash.readyAlert!;
  alert.consentState = 'granted'; alert.consentVersion = 'export-ready-background-v1';
  const { result } = renderHook(() => useProviderReadyAlerts(options));
  await act(async () => result.current.enroll());
  expect(mockConsent).not.toHaveBeenCalled(); expect(mockEnable).toHaveBeenCalled();
});
it('hides optional enable actions on unsupported devices and remembers dismissal per request', async () => {
  mockSupported = false;
  const { result } = renderHook(() => useProviderReadyAlerts(options));
  expect(result.current.available).toBe(false);
  await act(async () => result.current.dismiss());
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(expect.stringContaining('request-1'), 'true');
});
it('offers a choice of inbox without granting monitoring before connection', async () => {
  mockPreferences.export.providers.doorDash.readyAlert!.canMonitor = false;
  const { result } = renderHook(() => useProviderReadyAlerts(options));
  await act(async () => result.current.enroll());
  expect(result.current.chooseInbox).toBe(true); expect(mockConsent).not.toHaveBeenCalled();
});
it('can revoke monitoring without disabling device notifications', async () => {
  const { result } = renderHook(() => useProviderReadyAlerts(options));
  await act(async () => result.current.disable());
  expect(mockConsent).toHaveBeenCalledWith({ provider: 'doordash', decision: 'revoked' });
  expect(mockEnable).not.toHaveBeenCalled();
});

it('reconciles an uncertain revocation without granting consent or registering notifications', async () => {
  mockConsent.mockRejectedValueOnce(new Error('response lost'));
  const { result } = renderHook(() => useProviderReadyAlerts(options));
  await act(async () => { await result.current.disable(); });
  expect(result.current.issue).toBe('save');
  mockPreferences.export.providers.doorDash.readyAlert!.consentState = 'revoked';
  await act(async () => { result.current.enroll(); });
  expect(mockConsent).toHaveBeenCalledTimes(1);
  expect(mockEnable).not.toHaveBeenCalled();
  expect(result.current.issue).toBeNull();
});
it('does not register the device when consent finishes for a previous account', async () => {
  let resolve!: (value: typeof mockPreferences) => void;
  mockConsent.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const { result, rerender } = renderHook(({ userId }) => useProviderReadyAlerts({ ...options, userId }), { initialProps: { userId: 'user-1' } });
  act(() => result.current.enroll());
  rerender({ userId: 'user-2' });
  rerender({ userId: 'user-1' });
  await act(async () => { resolve(mockPreferences); });
  expect(mockEnable).not.toHaveBeenCalled();
  expect(result.current.busy).toBe(false);
});
