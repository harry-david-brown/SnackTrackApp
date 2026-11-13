import { render } from '@testing-library/react-native';
import AccountsPermissionsScreen from '@/app/settings/accounts-permissions';

const disconnected = { connected: false, needsReconnect: false, connectionHealth: 'disconnected', email: 'login@example.test' };
let mockGmail = disconnected;
jest.mock('@hooks/useImportFlowController', () => ({ useImportFlowController: () => ({
  importPreferences: { gmailConnection: mockGmail, outlookConnection: disconnected,
    ongoingTracking: { activity: {} }, export: { providers: { uberEats: {} } } },
}) }));
jest.mock('@hooks/useProfileController', () => ({ useProfileController: () => ({
  settings: {}, deviceNotifications: { supported: false },
}) }));

it('offers Connect for a fresh user and after disconnect or reset even when the login email is present', () => {
  const screen = render(<AccountsPermissionsScreen />);
  expect(screen.getAllByText('Not connected')).toHaveLength(2);
  expect(screen.queryByText('Disconnect Gmail')).toBeNull();
  mockGmail = { ...disconnected, connected: true, connectionHealth: 'valid' };
  screen.rerender(<AccountsPermissionsScreen />);
  expect(screen.getByText('Disconnect Gmail')).toBeTruthy();
  mockGmail = disconnected;
  screen.rerender(<AccountsPermissionsScreen />);
  expect(screen.getAllByText('Connect')).toHaveLength(2);
  expect(screen.queryByText('Disconnect Gmail')).toBeNull();
  expect(screen.queryByText('Find orders')).toBeNull();
});
