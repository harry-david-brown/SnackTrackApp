import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostOnboardingImportScreen } from '@components/import/PostOnboardingImportScreen';
import type { ImportOperation } from '@features/import-flow/contracts';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
const mockResumeProvider = jest.fn();
const mockViewOperation = jest.fn();
let mockActiveOperation: ImportOperation | null = null;
const mockStep = jest.fn();
const mockFile = jest.fn();
const mockEnableReadyAlerts = jest.fn();
const mockGoHome = jest.fn();
const mockOpenProviderGuide = jest.fn();
const mockOpenExportEmail = jest.fn();
const mockPreferences = createImportPreferencesFixture();
let mockPreparingFile = false;
let mockReadyAlertsEnabled = false;
let mockState: object = { kind: 'provider_intro', provider: { provider: 'uber_eats', name: 'Uber Eats', receiptCount: 0, imported: false, status: 'not_started' } };
let mockFileSession = { isPending: false, progress: 0, file: null as { name: string } | null, operation: null as { id: string } | null };
jest.mock('@hooks/useTutorialPosition', () => ({ useTutorialPosition: () => [0, jest.fn()] }));
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@components/upload/UberDataTutorial', () => () => null);
jest.mock('@components/upload/UberDataUpload', () => ({ ExportDataUpload: () => null }));
jest.mock('@hooks/usePostOnboardingImportController', () => ({ usePostOnboardingImportController: () => ({
  state: mockState,
  pendingRequests: {},
  activeImportOperation: mockActiveOperation,
  resumeProviderJourney: mockResumeProvider,
  viewOperation: mockViewOperation,
  chooseMailbox: jest.fn(),
  returnTo: 'home',
  preparingFile: mockPreparingFile,
  fileSession: mockFileSession,
  importPreferences: mockPreferences,
  selection: { mailbox: null },
  showTutorial: false,
  navigationBlocked: false,
  readyAlerts: { available: true, busy: false, enabled: mockReadyAlertsEnabled, notificationsSupported: true, actionLabel: 'Notify me when it’s ready', label: 'Ready alerts', description: 'Get a heads-up from SnackTrack.', enroll: mockEnableReadyAlerts, leave: mockGoHome },
  stepSheetVisible: false, closeSteps: jest.fn(), openSteps: jest.fn(),
  readyAlertsBusy: false,
  setStep: mockStep,
  requestHistory: mockStep,
  chooseDownloadedFile: mockFile,
  enableReadyAlerts: mockEnableReadyAlerts,
  goHome: mockGoHome,
  openProviderGuide: mockOpenProviderGuide,
  openExportEmail: mockOpenExportEmail,
  goBack: jest.fn(),
  close: jest.fn(),
}) }));
beforeEach(() => {
  jest.clearAllMocks();
  mockActiveOperation = null;
  mockPreparingFile = false;
  mockReadyAlertsEnabled = false;
  mockState = { kind: 'provider_intro', provider: { provider: 'uber_eats', name: 'Uber Eats', receiptCount: 0, imported: false, status: 'not_started' } };
  mockFileSession = { isPending: false, progress: 0, file: null, operation: null };
  mockPreferences.monitoring.effectiveState = 'not_offered';
  mockPreferences.monitoring.capability.canMonitor = false;
  mockPreferences.export.providers.uberEats.status = 'not_started';
  mockPreferences.export.providers.uberEats.readySource = null;
  mockPreferences.gmailConnection.connected = false;
});
test('offers the unsure path before quieter file and waiting shortcuts without choosing for the user', () => {
  const screen = render(<PostOnboardingImportScreen route={{ intent: 'provider', provider: 'uber_eats', operationId: null, downloadedVersion: null }} />);
  expect(mockStep).not.toHaveBeenCalled();
  expect(mockFile).not.toHaveBeenCalled();
  const labels = screen.getAllByRole('button').map(button => button.props.accessibilityLabel);
  expect(labels.indexOf('No / I’m not sure')).toBeLessThan(labels.indexOf('Yes, I have the file'));
  fireEvent.press(screen.getByText('No / I’m not sure'));
  expect(mockStep).toHaveBeenCalledTimes(1);
});

test('inline notification setup stays separate from the Go home action', () => {
  mockState = { kind: 'provider_waiting', provider: { provider: 'uber_eats', name: 'Uber Eats', receiptCount: 0, imported: false, status: 'requested' } };
  mockPreferences.monitoring.capability.canMonitor = true;
  const screen = render(<PostOnboardingImportScreen route={{ intent: 'resume_export', provider: 'uber_eats', operationId: null, downloadedVersion: null }} />);

  fireEvent.press(screen.getByText('Notify me when it’s ready'));

  expect(mockEnableReadyAlerts).toHaveBeenCalledWith();
  expect(mockGoHome).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Go home for now'));
  expect(mockGoHome).toHaveBeenCalledTimes(1);
});

test('shows download guidance inline before the user chooses the ZIP', () => {
  mockState = { kind: 'download_ready', downloaded: false, provider: { provider: 'uber_eats', name: 'Uber Eats', receiptCount: 0, imported: false, status: 'file_ready' } };
  mockPreferences.export.providers.uberEats.status = 'file_ready';
  mockPreferences.export.providers.uberEats.readySource = 'detected_email';
  mockPreferences.gmailConnection.connected = true;
  const screen = render(<PostOnboardingImportScreen route={{ intent: 'resume_export', provider: 'uber_eats', operationId: null, downloadedVersion: null }} />);

  expect(screen.getByText('Your Uber history is ready')).toBeTruthy();
  expect(screen.getByText('Follow these three steps, then choose the ZIP to start importing.')).toBeTruthy();
  expect(screen.getByText('Open Uber’s ready message')).toBeTruthy();
  expect(screen.getByText('Guide: 1 of 3')).toBeTruthy();
  expect(screen.getByText('Help me find the ZIP')).toBeTruthy();
  expect(screen.queryByText('Show me how to download it')).toBeNull();

  fireEvent.press(screen.getByText('Open Gmail'));
  expect(mockOpenExportEmail).toHaveBeenCalledTimes(1);
  expect(mockOpenProviderGuide).not.toHaveBeenCalled();

  fireEvent.press(screen.getByText('Choose downloaded file'));
  expect(mockFile).toHaveBeenCalledTimes(1);

  fireEvent.press(screen.getByText('Help me find the ZIP'));
  expect(mockStep).toHaveBeenCalledWith('file_help');

  fireEvent.press(screen.getByText('My download link expired'));
  expect(mockStep).toHaveBeenCalledWith('request');
});

test('keeps navigation blocked during explicit upload submission', () => {
  mockState = { kind: 'download_ready', downloaded: true, provider: { provider: 'uber_eats', name: 'Uber Eats', receiptCount: 0, imported: false, status: 'file_ready' } };
  mockFileSession = { isPending: true, progress: 0.5, file: { name: 'uber.zip' }, operation: null };

  const screen = render(<PostOnboardingImportScreen route={{ intent: 'resume_export', provider: 'uber_eats', operationId: null, downloadedVersion: null }} />);

  expect(screen.getByText('Your SnackTrack is taking shape')).toBeTruthy();
  expect(screen.getByText('Uploading your file')).toBeTruthy();
  expect(screen.getByLabelText('8% complete. Uploading your file')).toBeTruthy();
  expect(screen.queryByText('Uploading your Uber history')).toBeNull();
  expect(screen.queryByText('Back')).toBeNull();
  expect(screen.queryByText(/Review your Uber download/)).toBeNull();
});

test('covers the previous step while preparing and reveals the selected-file review when ready', () => {
  mockState = { kind: 'provider_waiting', provider: { provider: 'doordash', name: 'DoorDash', receiptCount: 0, imported: false, status: 'requested' } };
  mockPreparingFile = true;
  const route = { intent: 'resume_export' as const, provider: 'doordash' as const, operationId: null, downloadedVersion: null };
  const screen = render(<PostOnboardingImportScreen route={route} />);
  expect(screen.getByText('Preparing your file…')).toBeTruthy();
  expect(screen.queryByText('You’re all set for now')).toBeNull();
  expect(screen.queryByText('Uploading your file')).toBeNull();
  mockPreparingFile = false;
  mockReadyAlertsEnabled = false;
  mockFileSession.file = { name: 'doordash.zip' };
  mockState = { kind: 'download_ready', downloaded: true, provider: { provider: 'doordash', name: 'DoorDash', receiptCount: 0, imported: false, status: 'requested' } };
  screen.rerender(<PostOnboardingImportScreen route={route} />);
  expect(screen.queryByText('Preparing your file…')).toBeNull();
  expect(screen.getByText('Finish importing your DoorDash file')).toBeTruthy();
  expect(screen.queryByText('You’re all set for now')).toBeNull();
});


test.each([
  ['uber_eats', 'Uber Eats', true],
  ['uber_eats', 'Uber Eats', false],
  ['doordash', 'DoorDash', true],
  ['doordash', 'DoorDash', false],
] as const)('waiting-page hierarchy and notification reassurance for %s (%s, %s)', (provider, name, enabled) => {
  mockReadyAlertsEnabled = enabled;
  mockState = { kind: 'provider_waiting', provider: { provider, name, receiptCount: 0, imported: false, status: 'requested' } };
  const screen = render(<PostOnboardingImportScreen route={{ intent: 'resume_export', provider, operationId: null, downloadedVersion: null }} />);
  expect(screen.getByRole('header', { name: `Waiting for your ${name} history` })).toBeTruthy();
  expect(screen.queryByText('WAITING FOR YOUR DOWNLOAD')).toBeNull();
  const reassurance = screen.queryByText('We’ll notify you when your download is ready.');
  if (enabled) expect(reassurance).toBeTruthy();
  else {
    expect(reassurance).toBeNull();
    expect(screen.getByText('Notify me when it’s ready')).toBeTruthy();
  }
  expect(screen.getByText('Your place is saved. Continue later from Add orders.')).toBeTruthy();
});

test.each([
  ['uber_eats', 'Uber Eats'],
  ['doordash', 'DoorDash'],
] as const)('keeps the %s source action aligned while progress changes', (provider, name) => {
  const source = { provider, name, receiptCount: 0, imported: false, status: 'not_started' };
  mockState = { kind: 'choose_method', providers: [source] };
  const route = { intent: 'choose' as const, provider: null, operationId: null, downloadedVersion: null };
  const screen = render(<PostOnboardingImportScreen route={route} />);
  expect(screen.getByText('Optional')).toBeTruthy();
  fireEvent.press(screen.getByText(`Complete ${name} history`));
  expect(mockResumeProvider).toHaveBeenLastCalledWith(provider);

  mockState = { kind: 'choose_method', providers: [{ ...source, status: 'requested' }] };
  screen.rerender(<PostOnboardingImportScreen route={route} />);
  expect(screen.getByText('Waiting for email')).toBeTruthy();
  fireEvent.press(screen.getByText('View next steps'));
  expect(mockResumeProvider).toHaveBeenLastCalledWith(provider);

  mockState = { kind: 'choose_method', providers: [{ ...source, status: 'file_ready' }] };
  screen.rerender(<PostOnboardingImportScreen route={route} />);
  fireEvent.press(screen.getByText('Download your file'));
  expect(mockResumeProvider).toHaveBeenLastCalledWith(provider);

  mockActiveOperation = {
    id: 'export-operation', kind: 'export_file', provider, status: 'queued', trigger: 'user', journeyContext: 'post_onboarding',
    phase: 'queued', progress: 0, result: null, errorCode: null, errorMessage: null, attempts: 0,
    createdAt: '', queuedAt: null, startedAt: null, completedAt: null, updatedAt: '', presentation: null,
  };
  screen.rerender(<PostOnboardingImportScreen route={route} />);
  expect(screen.getByText('Queued')).toBeTruthy();
  fireEvent.press(screen.getByText('View progress'));
  expect(mockViewOperation).toHaveBeenCalledTimes(1);

  mockActiveOperation = null;
  mockState = { kind: 'choose_method', providers: [{ ...source, status: 'completed', imported: true, receiptCount: 12 }] };
  screen.rerender(<PostOnboardingImportScreen route={route} />);
  expect(screen.getByText('Imported')).toBeTruthy();
  fireEvent.press(screen.getByText('Add newer history'));
  expect(mockResumeProvider).toHaveBeenLastCalledWith(provider);
});
