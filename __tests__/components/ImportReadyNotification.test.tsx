import { act, fireEvent, render } from '@testing-library/react-native';
import { ImportReadyNotification } from '@components/import/ImportReadyNotification';
const mockEnable = jest.fn();
const mockSettings = jest.fn();
let mockEnabled = false;
let mockSupported = true;
let mockIssue: 'denied' | 'registration' | null = null;
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@hooks/useDeviceNotifications', () => ({ useDeviceNotifications: () => ({
  supported: mockSupported, enabled: mockEnabled, issue: mockIssue, enable: mockEnable, openSettings: mockSettings,
}) }));
beforeEach(() => { jest.clearAllMocks(); mockEnabled = false; mockSupported = true; mockIssue = null; });

it('only enrolls on an explicit tap and waits for shared registration success', async () => {
  let finish!: (value: boolean) => void;
  mockEnable.mockImplementationOnce(() => new Promise<boolean>(resolve => { finish = resolve; }));
  const screen = render(<ImportReadyNotification userId="user" />);
  expect(mockEnable).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Notify me when ready' }));
  fireEvent.press(screen.getByRole('button', { name: 'Notify me when ready' }));
  expect(mockEnable).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('We’ll notify you when ready')).toBeNull();
  await act(async () => { mockEnabled = true; finish(true); });
  expect(screen.getByRole('button', { name: 'We’ll notify you when ready' }).props.accessibilityState.disabled).toBe(true);
});

it('opens device settings after permission denial without granting mailbox access', () => {
  mockIssue = 'denied';
  const screen = render(<ImportReadyNotification userId="user" />);
  fireEvent.press(screen.getByRole('button', { name: 'Open notification settings' }));
  expect(mockSettings).toHaveBeenCalledTimes(1);
  expect(mockEnable).not.toHaveBeenCalled();
});

it('keeps failed registration retryable without claiming notification success', async () => {
  mockEnable.mockImplementationOnce(async () => { mockIssue = 'registration'; throw new Error('Offline'); });
  const screen = render(<ImportReadyNotification userId="user" />);
  await act(async () => { fireEvent.press(screen.getByRole('button', { name: 'Notify me when ready' })); });
  screen.rerender(<ImportReadyNotification userId="user" />);
  expect(screen.getByRole('button', { name: 'Try notifications again' })).toBeTruthy();
  expect(screen.queryByText('We’ll notify you when ready')).toBeNull();
});

it('does not offer unsupported notifications', () => {
  mockSupported = false;
  const screen = render(<ImportReadyNotification userId="user" />);
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByText(/Notifications aren’t available/)).toBeTruthy();
});
