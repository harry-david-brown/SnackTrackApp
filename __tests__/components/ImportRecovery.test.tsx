import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ImportResultScreen } from '@components/import/ImportResultScreen';
import { ImportProgressLoadingView, ImportProgressScreen } from '@components/import/ImportProgressScreen';
import { LightTheme } from '@constants/theme';
import type { ImportOperation } from '@features/import-flow/contracts';
import { IMPORT_PROGRESS_COMPLETE_HOLD_MS } from '@features/import-flow/importProgressPresentation';
import { experienceApi } from '@services/experienceApi';
import { useAppNavigation } from '@features/navigation';
import { invalidateReceiptDerivedData } from '@lib/queryInvalidation';
jest.mock('@hooks/useImportPreferences', () => ({ useImportPreferences: () => ({ preferences: null, isLoading: false }) }));
let mockFocused = true;
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
let mockUnavailable = false;
const mockRefresh = jest.fn();
const mockQueryClient = {};
let mockOperation: ImportOperation;
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@contexts/UserContext', () => ({ useUser: () => ({ state: { user: { id: 'user' } } }) }));
jest.mock('@components/mascot/Mascot', () => ({ Mascot: () => null }));
jest.mock('@hooks/useImportOperation', () => ({ useImportOperation: () => ({ operation: mockOperation, isLoading: false, isUnavailable: mockUnavailable, refresh: mockRefresh }) }));
jest.mock('@hooks/useImportProgressPacing', () => ({ useImportProgressPacing: (_id: string, _position: number, progress: number) => ({ visibleProgress: progress }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => mockQueryClient }));
jest.mock('@services/experienceApi', () => ({ experienceApi: { getState: jest.fn().mockRejectedValue(new Error('Unavailable')) } }));
jest.mock('@services/adminAnalytics', () => ({ trackAdminEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@lib/queryInvalidation', () => ({ invalidateReceiptDerivedData: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@components/import/ImportNotificationController', () => ({ requestImportNotifications: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks(); mockUnavailable = false; mockFocused = true;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  mockOperation = { id: 'operation', kind: 'export_file', provider: 'uber_eats', journeyContext: 'post_onboarding', trigger: 'user', status: 'succeeded', phase: 'completed', progress: 100, result: {}, errorCode: null, errorMessage: null, attempts: 1, presentation: null, createdAt: '', queuedAt: null, startedAt: null, completedAt: null, updatedAt: '' };
});
it('does not let an unfocused result screen redirect over the active import journey', async () => {
  mockFocused = false;
  mockOperation = { ...mockOperation, journeyContext: 'onboarding' };
  render(<ImportResultScreen operationId="operation" />);
  await act(async () => {});
  expect(experienceApi.getState).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});
it('shows the already-saved total without redundant zero counts', async () => {
  mockOperation = { ...mockOperation, result: { newOrders: 0, updatedOrders: 0, unchangedOrders: 8 } };
  const screen = render(<ImportResultScreen operationId="operation" />);
  await act(async () => {});
  expect(screen.getByText('8 orders already saved')).toBeTruthy();
  expect(screen.queryByText('0')).toBeNull();
  expect(screen.queryByText('Already saved')).toBeNull();
  expect(screen.queryByText('View added orders')).toBeNull();
});
it('shows ordinary import results without listing refund, cancellation or reconciliation diagnostics', async () => {
  mockOperation = { ...mockOperation, result: { receiptOutcome: {
    policyVersion: 3, newOrders: 267, updatedOrders: 6, unchangedOrders: 0,
    ordersProcessed: 273, unresolvedOrders: 2, unlinkedAdjustments: 2,
    adjustedOrders: 6, cancellationsRecovered: 5, sourceDocuments: 350, currencies: [],
  } } };
  const screen = render(<ImportResultScreen operationId="operation" />);
  await act(async () => {});
  expect(screen.getByText('273 orders added or updated')).toBeTruthy();
  expect(screen.getByText('New')).toBeTruthy();
  expect(screen.getByText('Updated')).toBeTruthy();
  expect(screen.queryByText(/refund|cancel|not linked|unknown|extra orders/i)).toBeNull();
});
it('distinguishes an empty result from unavailable counts', async () => {
  mockOperation = { ...mockOperation, result: { newOrders: 0, updatedOrders: 0, unchangedOrders: 0 } };
  const screen = render(<ImportResultScreen operationId="operation" />);
  expect(screen.getByText('No supported orders found')).toBeTruthy();
  mockOperation = { ...mockOperation, result: {} };
  screen.rerender(<ImportResultScreen operationId="operation" />);
  await act(async () => {});
  expect(screen.getByText('Import finished')).toBeTruthy();
  expect(screen.queryByText('New')).toBeNull();
});
it('makes replaying the recap the primary action when a recap was already seen', async () => {
  jest.mocked(experienceApi.getState).mockResolvedValueOnce({
    setup: { state: 'complete', completedAt: '', completionMethod: 'email_receipts', activeOperationId: null },
    firstRecap: { state: 'seen', minimumOrderCount: 3, version: 'lifetime-v1', seenAt: '' },
    receiptCount: 65,
  });

  const screen = render(<ImportResultScreen operationId="operation" />);
  await act(async () => {});

  expect(screen.getByRole('button', { name: 'Close import result' })).toBeTruthy();
  const actions = screen.getAllByRole('button').filter(action => action.props.accessibilityLabel !== 'Close import result');
  expect(actions.map(action => action.props.accessibilityLabel)).toEqual([
    'Play my recap',
    'View order history',
    'Add more history',
  ]);
  expect(StyleSheet.flatten(actions[0].props.style)).toEqual(expect.objectContaining({
    backgroundColor: LightTheme.colors.primary,
  }));
  fireEvent.press(actions[0]);
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/(tabs)/wrapped-journey',
    params: { restart: expect.any(String), entryPoint: 'summary' },
  });
});
it.each([
  { kind: 'export_file', provider: 'uber_eats' },
  { kind: 'export_file', provider: 'doordash' },
  { kind: 'gmail_historical', provider: null },
  { kind: 'outlook_historical', provider: null },
] as const)('prioritizes the ready recap after $kind / $provider', async source => {
  mockOperation = { ...mockOperation, ...source, result: { newOrders: 903, updatedOrders: 0, unchangedOrders: 0 } };
  jest.mocked(experienceApi.getState).mockResolvedValueOnce({
    setup: { state: 'complete', completedAt: '', completionMethod: 'provider_archive', activeOperationId: null },
    firstRecap: { state: 'ready', minimumOrderCount: 3, version: 'lifetime-v1', seenAt: null },
    receiptCount: 903,
  });
  const screen = render(<ImportResultScreen operationId="operation" returnTo="history" />);
  await act(async () => {});

  expect(screen.getByRole('button', { name: 'Close import result' })).toBeTruthy();
  const actions = screen.getAllByRole('button').filter(action => action.props.accessibilityLabel !== 'Close import result');
  expect(actions.map(action => action.props.accessibilityLabel)).toEqual([
    'Play my recap', 'View order history', 'Add more history',
  ]);
  expect(StyleSheet.flatten(actions[0].props.style)).toEqual(expect.objectContaining({ backgroundColor: LightTheme.colors.primary }));
  expect(router.replace).not.toHaveBeenCalled();
  fireEvent.press(actions[0]);
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/(tabs)/wrapped-journey',
    params: { restart: expect.any(String), entryPoint: 'automatic_first_import' },
  });
  fireEvent.press(actions[1]);
  expect(router.replace).toHaveBeenLastCalledWith('/(tabs)/history');
  fireEvent.press(actions[2]);
  expect(router.replace).toHaveBeenLastCalledWith({ pathname: '/add-history', params: { returnTo: 'history' } });
});
it('keeps order history primary when there are too few orders for a recap', async () => {
  jest.mocked(experienceApi.getState).mockResolvedValueOnce({
    setup: { state: 'complete', completedAt: '', completionMethod: 'provider_archive', activeOperationId: null },
    firstRecap: { state: 'ineligible', minimumOrderCount: 3, version: 'lifetime-v1', seenAt: null },
    receiptCount: 2,
  });
  const screen = render(<ImportResultScreen operationId="operation" />);
  await act(async () => {});
  expect(screen.getAllByRole('button').map(action => action.props.accessibilityLabel)).toEqual([
    'Close import result', 'View order history', 'Add more history',
  ]);
});
it.each(['onboarding', 'post_onboarding'] as const)('gives source-specific terminal recovery for %s', journeyContext => {
  mockOperation = { ...mockOperation, status: 'failed', provider: 'doordash', journeyContext };
  const screen = render(<ImportProgressScreen operationId="operation" returnTo="history" />);
  fireEvent.press(screen.getByText('Try this source again'));
  expect(router.replace).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ provider: 'doordash', downloadedVersion: 'retry', returnTo: 'history', journeyContext }) }));
  expect(screen.queryByText('Reload status')).toBeNull();
});
it('shows stale-status uncertainty over cached active progress', () => {
  mockOperation = { ...mockOperation, status: 'running' }; mockUnavailable = true;
  const screen = render(<ImportProgressScreen operationId="operation" />);
  expect(screen.getByText('Import status is unavailable')).toBeTruthy();
  fireEvent.press(screen.getByText('Reload status'));
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Continue using SnackTrack')).toBeNull();
});
it('offers a new file selection for an unfinished upload without claiming processing', () => {
  mockOperation = { ...mockOperation, status: 'awaiting_upload' };
  const screen = render(<ImportProgressScreen operationId="operation" />);
  expect(screen.getByText('Your file hasn’t been submitted yet')).toBeTruthy();
  expect(screen.queryByText('Your import continues in the background.')).toBeNull();
  fireEvent.press(screen.getByText('Choose the file again'));
  expect(router.replace).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ provider: 'uber_eats', downloadedVersion: 'resume' }) }));
});
it('allows leaving after accepted Gmail background processing', () => {
  mockOperation = { ...mockOperation, kind: 'gmail_historical', provider: null, status: 'queued' };
  const screen = render(<ImportProgressScreen operationId="operation" returnTo="summary" />);
  fireEvent.press(screen.getByText('Continue using SnackTrack'));
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/wrapped-journey');
});
it.each(['pending_dispatch', 'queued', 'running', 'retrying'] as const)('keeps export processing focused on results while %s', status => {
  mockOperation = { ...mockOperation, status };
  const screen = render(<ImportProgressScreen operationId="operation" />);
  expect(screen.queryByText('Continue using SnackTrack')).toBeNull();
  expect(screen.queryByText('Your import is accepted. You can leave and return from Add orders.')).toBeNull();
  expect(screen.getByText('We’ll show your results when your history is ready.')).toBeTruthy();
});
it('does not offer background continuation during file upload', () => {
  mockOperation = { ...mockOperation, status: 'awaiting_upload' };
  const screen = render(<ImportProgressScreen operationId="operation" uploadActive uploadProgress={30} />);
  expect(screen.queryByText('Continue using SnackTrack')).toBeNull();
  expect(screen.getByText('Keep SnackTrack open until your file is accepted.')).toBeTruthy();
});
it('offers the same continuation action for Outlook imports', () => {
  mockOperation = { ...mockOperation, kind: 'outlook_historical', provider: null, status: 'running' };
  const screen = render(<ImportProgressScreen operationId="operation" />);
  expect(screen.getByText('Continue using SnackTrack')).toBeTruthy();
});
it('keeps delayed imports on the standard progress screen and shows the time estimate', () => {
  mockOperation = {
    ...mockOperation,
    status: 'retrying',
    presentation: {
      mode: 'delayed',
      expectedDurationBand: 'over_5_minutes',
      reason: 'retrying',
      stage: 'building_history',
      discoveredOrderCount: 300,
      timeEstimate: { kind: 'retry_wait', minimumMinutes: 1, maximumMinutes: 2, revision: 1 },
    },
  };
  const screen = render(<ImportProgressScreen operationId="operation" />);
  expect(screen.getByText(/Waiting to retry safely/)).toBeTruthy();
  expect(screen.getByText('About 1–2 minutes remaining')).toBeTruthy();
  expect(screen.queryByText('This is taking longer than usual')).toBeNull();
});

it('does not finish until the rendered counter has held at 100 percent', async () => {
  jest.useFakeTimers();
  const onCompletionShown = jest.fn();
  const screen = render(<ImportProgressLoadingView progress={100} progressStatus="Import complete" onCompletionShown={onCompletionShown} />);

  await act(async () => {});
  expect(screen.getByText('100% complete')).toBeTruthy();
  act(() => { jest.advanceTimersByTime(IMPORT_PROGRESS_COMPLETE_HOLD_MS - 1); });
  expect(onCompletionShown).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(1); });
  expect(onCompletionShown).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

it('opens the durable result without waiting for cache refresh or progress animation', async () => {
  const replace = jest.fn().mockReturnValue('navigated');
  jest.mocked(useAppNavigation).mockReturnValue({
    open: jest.fn(),
    replace,
    backOr: jest.fn(),
    setParams: jest.fn(),
    dispatchExternalNavigation: jest.fn(),
    registerExternalBlocker: jest.fn(() => () => undefined),
  });
  jest.mocked(invalidateReceiptDerivedData).mockReturnValueOnce(new Promise<void>(() => undefined));

  render(<ImportProgressScreen operationId="operation" returnTo="history" />);
  await act(async () => {});

  expect(replace).toHaveBeenCalledWith({
    pathname: '/import-result',
    params: { operationId: 'operation', returnTo: 'history' },
  });
});

it('retries the automatic result handoff when another transition is still settling', async () => {
  jest.useFakeTimers();
  const replace = jest.fn()
    .mockReturnValueOnce('transition-pending')
    .mockReturnValue('navigated');
  jest.mocked(useAppNavigation).mockReturnValue({
    open: jest.fn(),
    replace,
    backOr: jest.fn(),
    setParams: jest.fn(),
    dispatchExternalNavigation: jest.fn(),
    registerExternalBlocker: jest.fn(() => () => undefined),
  });

  render(<ImportProgressScreen operationId="operation" returnTo="history" />);
  await act(async () => {});
  expect(replace).toHaveBeenCalledTimes(1);
  act(() => { jest.advanceTimersByTime(100); });
  expect(replace).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});

it.each(['succeeded', 'failed'] as const)('does not show a cached %s result over a new upload', async status => {
  mockOperation = { ...mockOperation, status };
  const screen = render(<ImportProgressScreen uploadActive uploadProgress={0.25} />);
  await act(async () => {});
  expect(screen.getByText('Keep SnackTrack open until your file is accepted.')).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
});
