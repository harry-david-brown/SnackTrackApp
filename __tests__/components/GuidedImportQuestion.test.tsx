import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostOnboardingImportScreen } from '@components/import/PostOnboardingImportScreen';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
const mockStep = jest.fn();
const mockFile = jest.fn();
const mockEnableReadyAlerts = jest.fn();
const mockGoHome = jest.fn();
const mockOpenProviderGuide = jest.fn();
const mockOpenExportEmail = jest.fn();
const mockPreferences = createImportPreferencesFixture();
let mockState: object = { kind: 'provider_intro', provider: { provider: 'uber_eats', name: 'Uber Eats', receiptCount: 0, imported: false, status: 'not_started' } };
let mockFileSession = { isPending: false, progress: 0, file: null as { name: string } | null, operation: null as { id: string } | null };
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@components/upload/UberDataTutorial', () => () => null);
jest.mock('@components/upload/UberDataUpload', () => ({ ExportDataUpload: () => null }));
jest.mock('@hooks/usePostOnboardingImportController', () => ({ usePostOnboardingImportController: () => ({
  state: mockState,
  fileSession: mockFileSession,
  importPreferences: mockPreferences,
  selection: { mailbox: null },
  showTutorial: false,
  navigationBlocked: false,
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
  mockState = { kind: 'provider_intro', provider: { provider: 'uber_eats', name: 'Uber Eats', receiptCount: 0, imported: false, status: 'not_started' } };
  mockFileSession = { isPending: false, progress: 0, file: null, operation: null };
  mockPreferences.monitoring.effectiveState = 'not_offered';
  mockPreferences.monitoring.capability.canMonitor = false;
  mockPreferences.export.providers.uberEats.status = 'not_started';
  mockPreferences.export.providers.uberEats.readySource = null;
  mockPreferences.gmailConnection.connected = false;
});
test('offers the recommended unsure path before file and waiting shortcuts without choosing for the user', () => {
  const screen = render(<PostOnboardingImportScreen route={{ intent: 'provider', provider: 'uber_eats', operationId: null, downloadedVersion: null }} />);
  expect(screen.getByText('Recommended')).toBeTruthy();
  expect(mockStep).not.toHaveBeenCalled();
  expect(mockFile).not.toHaveBeenCalled();
  const labels = screen.getAllByRole('button').map(button => button.props.accessibilityLabel);
  expect(labels.indexOf('No / I’m not sure')).toBeLessThan(labels.indexOf('Yes, I have the file'));
  fireEvent.press(screen.getByText('No / I’m not sure'));
  expect(mockStep).toHaveBeenCalledTimes(1);
});

test('returns home after ready-alert consent succeeds', () => {
  mockState = { kind: 'provider_waiting', provider: { provider: 'uber_eats', name: 'Uber Eats', receiptCount: 0, imported: false, status: 'requested' } };
  mockPreferences.monitoring.capability.canMonitor = true;
  const screen = render(<PostOnboardingImportScreen route={{ intent: 'resume_export', provider: 'uber_eats', operationId: null, downloadedVersion: null }} />);

  fireEvent.press(screen.getByText('Notify me when it’s ready'));

  expect(mockEnableReadyAlerts).toHaveBeenCalledWith(mockGoHome);
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
  expect(screen.getByText('Step 1 of 3')).toBeTruthy();
  expect(screen.getByText('Help me find the ZIP')).toBeTruthy();
  expect(screen.queryByText('Show me how to download it')).toBeNull();

  fireEvent.press(screen.getByText('Open Gmail'));
  expect(mockOpenExportEmail).toHaveBeenCalledTimes(1);
  expect(mockOpenProviderGuide).not.toHaveBeenCalled();

  fireEvent.press(screen.getByText('Choose ZIP and import'));
  expect(mockFile).toHaveBeenCalledTimes(1);

  fireEvent.press(screen.getByText('Help me find the ZIP'));
  expect(mockStep).toHaveBeenCalledWith('file_help');

  fireEvent.press(screen.getByText('My download link expired'));
  expect(mockStep).toHaveBeenCalledWith('request');
});

test('moves directly from selection into upload progress without a review page', () => {
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
