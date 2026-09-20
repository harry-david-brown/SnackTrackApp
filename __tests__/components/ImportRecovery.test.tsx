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
it('distinguishes duplicate-only completion and preserves explicit zero counts', async () => {
  mockOperation = { ...mockOperation, result: { newOrders: 0, updatedOrders: 0, unchangedOrders: 8 } };
  const screen = render(<ImportResultScreen operationId="operation" />);
  await act(async () => {});
  expect(screen.getByText('These orders are already saved')).toBeTruthy();
  expect(screen.getAllByText('0')).toHaveLength(2);
  expect(screen.getByText('8')).toBeTruthy();
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
  expect(screen.queryByText(/refund|cancel|not linked|unknown|matching|extra orders/i)).toBeNull();
});
it('distinguishes an empty result from unavailable counts', async () => {
  mockOperation = { ...mockOperation, result: { newOrders: 0, updatedOrders: 0, unchangedOrders: 0 } };
  const screen = render(<ImportResultScreen operationId="operation" />);
  expect(screen.getByText('No supported orders found')).toBeTruthy();
  mockOperation = { ...mockOperation, result: {} };
  screen.rerender(<ImportResultScreen operationId="operation" />);
  await act(async () => {});
  expect(screen.getByText('Your history was imported')).toBeTruthy();
  expect(screen.queryByText('New')).toBeNull();
});
it('makes Summary the primary action when an existing recap is available', async () => {
  jest.mocked(experienceApi.getState).mockResolvedValueOnce({
    setup: { state: 'complete', completedAt: '', completionMethod: 'email_receipts', activeOperationId: null },
    firstRecap: { state: 'seen', minimumOrderCount: 3, version: 'lifetime-v1', seenAt: '' },
    receiptCount: 65,
  });

  const screen = render(<ImportResultScreen operationId="operation" />);
  await act(async () => {});

  const actions = screen.getAllByRole('button');
  expect(actions.map(action => action.props.accessibilityLabel)).toEqual([
    'View Summary',
    'View order history',
    'Add orders',
    'Close',
  ]);
  expect(StyleSheet.flatten(actions[0].props.style)).toEqual(expect.objectContaining({
    backgroundColor: LightTheme.colors.primary,
  }));
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
it('allows leaving after accepted background processing', () => {
  mockOperation = { ...mockOperation, status: 'queued' };
  const screen = render(<ImportProgressScreen operationId="operation" returnTo="summary" />);
  fireEvent.press(screen.getByText('Continue using SnackTrack'));
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/wrapped-journey');
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
