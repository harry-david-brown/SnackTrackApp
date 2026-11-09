import { fireEvent, render } from '@testing-library/react-native';
import AccountsPermissionsScreen from '@/app/settings/accounts-permissions';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';

let mockPreferences = createImportPreferencesFixture();
const mockDisconnectGmail = jest.fn();
const mockDisconnectOutlook = jest.fn();
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@hooks/useImportFlowController', () => ({ useImportFlowController: () => ({
  importPreferences: mockPreferences, connectionBusy: false,
  disconnectGmail: mockDisconnectGmail, disconnectOutlook: mockDisconnectOutlook,
}) }));
jest.mock('@hooks/useProfileController', () => ({ useProfileController: () => ({
  settings: { ongoingTrackingLabel: 'Off', exportAlertsLabel: 'Off' },
  deviceNotifications: { supported: false }, arePreferencesBusy: false,
}) }));
jest.mock('@hooks/useProviderReadyAlerts', () => ({ useProviderReadyAlerts: () => ({}) }));
jest.mock('@hooks/useImportPreferences', () => ({ useImportPreferences: () => ({ preferences: mockPreferences }) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockPreferences = createImportPreferencesFixture();
});

it.each(['valid', 'reconnect_required', 'unavailable'] as const)('allows both inboxes to disconnect before any import when health is %s', connectionHealth => {
  mockPreferences.gmailConnection = { ...mockPreferences.gmailConnection, connected: true, email: 'receipts@example.com', connectionHealth };
  mockPreferences.outlookConnection = { ...mockPreferences.outlookConnection, connected: true, email: 'orders@example.com', connectionHealth };
  expect(mockPreferences.gmailBaseline.hasCompleted).toBe(false);
  expect(mockPreferences.outlookBaseline.hasCompleted).toBe(false);
  const screen = render(<AccountsPermissionsScreen />);
  fireEvent.press(screen.getByRole('button', { name: 'Disconnect Gmail' }));
  fireEvent.press(screen.getByRole('button', { name: 'Disconnect Outlook' }));
  expect(mockDisconnectGmail).toHaveBeenCalledTimes(1);
  expect(mockDisconnectOutlook).toHaveBeenCalledTimes(1);
});

it('does not offer disconnect for accounts that were never connected', () => {
  const screen = render(<AccountsPermissionsScreen />);
  expect(screen.queryByRole('button', { name: 'Disconnect Gmail' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Disconnect Outlook' })).toBeNull();
});
