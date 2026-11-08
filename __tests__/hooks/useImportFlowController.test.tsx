import { act, renderHook } from '@testing-library/react-native';
import { useImportFlowController } from '@hooks/useImportFlowController';
import { resolveInitialImportJourney } from '@features/import-flow/initialImportJourney';
import { parseImportRouteParams } from '@features/import-flow/importRouteParams';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';

let mockPreferences = createImportPreferencesFixture();
const mockRefresh = jest.fn();
const mockConnect = jest.fn();
const mockImport = jest.fn();
const mockDisconnect = jest.fn();
const mockNavigation = { setParams: jest.fn() };

jest.mock('@features/navigation', () => ({ useAppNavigation: () => mockNavigation, appDestinations: {} }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true, useFocusEffect: jest.fn() }));
jest.mock('@contexts/UserContext', () => ({ useUser: () => ({ state: { user: { id: 'setup-user' } } }) }));
jest.mock('@config/featureFlags', () => ({ featureFlags: { showGmailImport: true } }));
jest.mock('@hooks/useImportPreferences', () => ({ useImportPreferences: () => ({
  preferences: mockPreferences, isLoading: false, isUpdating: false, refresh: mockRefresh,
}) }));
jest.mock('@hooks/useGmailImport', () => ({ useGmailImport: () => ({
  connectionStatus: mockPreferences.gmailConnection, primaryFlowState: 'idle', isChecking: false,
  connectGmail: mockConnect, importReceipts: mockImport, disconnectGmail: mockDisconnect,
}) }));
jest.mock('@hooks/useOutlookImport', () => ({ useOutlookImport: () => ({
  connectionStatus: mockPreferences.outlookConnection, isLoading: false, isImporting: false,
  connectOutlook: mockConnect, importReceipts: mockImport, disconnectOutlook: mockDisconnect,
}) }));
jest.mock('@hooks/useExportUpsell', () => ({ useExportUpsell: () => ({ isLoading: false }) }));
jest.mock('@hooks/useImportOperation', () => ({ useImportOperation: () => ({ operation: null }) }));
jest.mock('@hooks/useOngoingTrackingActivation', () => ({ useOngoingTrackingActivation: () => ({}) }));
jest.mock('@services/adminAnalytics', () => ({ trackAdminEvent: jest.fn(() => Promise.resolve()) }));
jest.mock('@services/experienceApi', () => ({ experienceApi: {} }));

const journeyFor = (controller: ReturnType<typeof useImportFlowController>) =>
  resolveInitialImportJourney(controller.flow, controller.selectedSetupPath, controller.oauthReturn);

beforeEach(() => {
  jest.clearAllMocks();
  mockPreferences = createImportPreferencesFixture();
  mockRefresh.mockImplementation(async () => mockPreferences);
});

it.each(['gmail', 'outlook'] as const)('returns from %s review to method choices and keeps the inbox connected', provider => {
  const connection = provider === 'gmail' ? mockPreferences.gmailConnection : mockPreferences.outlookConnection;
  Object.assign(connection, { connected: true, canImport: true, connectionHealth: 'valid', email: 'orders@example.com' });
  const route = parseImportRouteParams({ mailbox: provider });
  const { result, rerender } = renderHook(() => useImportFlowController(route, 'setup'));
  expect(journeyFor(result.current)).toMatchObject({ kind: 'review_email_scan', provider });

  act(() => result.current.changeSetupMethod());
  expect(journeyFor(result.current)).toEqual({ kind: 'choose_method' });
  mockPreferences = { ...mockPreferences };
  rerender({});
  expect(journeyFor(result.current)).toEqual({ kind: 'choose_method' });
  expect(connection.connected).toBe(true);

  act(() => result.current.chooseAlternativeSetup());
  expect(journeyFor(result.current)).toEqual({ kind: 'choose_provider' });
  act(() => result.current.changeSetupMethod());
  expect(journeyFor(result.current)).toEqual({ kind: 'choose_method' });
  act(() => result.current.chooseEmailSetup());
  expect(journeyFor(result.current)).toEqual({ kind: 'choose_email_provider' });
  act(() => result.current.chooseSetupEmail(provider));
  expect(journeyFor(result.current)).toMatchObject({ kind: 'review_email_scan', provider });
  expect(mockConnect).not.toHaveBeenCalled();
  expect(mockImport).not.toHaveBeenCalled();
  expect(mockDisconnect).not.toHaveBeenCalled();
});

it.each(['gmail', 'outlook'] as const)('clears a failed %s callback when choosing another method', provider => {
  const failedRoute = parseImportRouteParams({ mailbox: provider, [provider]: 'error' });
  const { result, rerender } = renderHook(
    route => useImportFlowController(route, 'setup'),
    { initialProps: failedRoute },
  );
  expect(journeyFor(result.current)).toMatchObject({ kind: 'oauth_return_failed', provider });

  act(() => result.current.changeSetupMethod());
  expect(mockNavigation.setParams).toHaveBeenCalledWith({ gmail: undefined, outlook: undefined, error: undefined });
  rerender(parseImportRouteParams({ mailbox: provider }));
  expect(journeyFor(result.current)).toEqual({ kind: 'choose_method' });
});
