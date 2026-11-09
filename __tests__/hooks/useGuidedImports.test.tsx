import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import { usePostOnboardingImportController } from '@hooks/usePostOnboardingImportController';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
let mockPreferences = createImportPreferencesFixture();
const mockConnect = jest.fn();
const mockImport = jest.fn();
const mockSetupOngoingUpdates = jest.fn();
const mockReport = jest.fn();
const mockOpenTutorial = jest.fn();
const mockCloseTutorial = jest.fn();
const mockComplete = jest.fn();
const mockChooseFile = jest.fn();
const mockSubmitFile = jest.fn();
let mockBusy = false;
let mockRequestSaving = false;
let mockOperation: object | null = null;
const selectedFile = { name: 'saved.zip' };
const mockFileSession: { file: typeof selectedFile | null; isPending: boolean; choose: jest.Mock; submit: jest.Mock } = { file: selectedFile, isPending: false, choose: mockChooseFile, submit: mockSubmitFile };
jest.mock('@hooks/useProviderReadyAlerts', () => ({ useProviderReadyAlerts: () => ({ available: false }) }));
jest.mock('@hooks/useImportFileSession', () => ({ useImportFileSession: () => mockFileSession }));
jest.mock('@hooks/useReturningImportActions', () => ({ useReturningImportActions: () => ({ importPreferences: mockPreferences, importPreferencesLoading: false, importPreferencesError: null, activeImportOperation: mockOperation, activeImportUnavailable: false, busy: mockBusy, connectionBusy: false, requestSaving: mockRequestSaving, emailUpdates: { automaticUpdates: false }, connectEmail: mockConnect, connectOutlook: mockConnect, connectEmailForOngoingTracking: mockConnect, connectOutlookForOngoingTracking: mockConnect, reconnectEmail: mockConnect, reconnectOutlook: mockConnect, setupOngoingUpdates: mockSetupOngoingUpdates, importEmail: mockImport, importOutlook: mockImport, reportDownloaded: mockReport, completeTutorial: mockComplete, openProviderTutorial: mockOpenTutorial, closeTutorial: mockCloseTutorial }) }));
jest.mock('@hooks/useImportOperation', () => ({ useImportOperation: () => ({ operation: null, isLoading: false, isUnavailable: false }) }));
const route = { intent: 'choose' as const, provider: null, operationId: null, downloadedVersion: null };
beforeEach(() => { jest.clearAllMocks(); mockPreferences = createImportPreferencesFixture(); mockBusy = false; mockRequestSaving = false; mockOperation = null; mockFileSession.file = selectedFile; mockChooseFile.mockResolvedValue(selectedFile); mockSubmitFile.mockResolvedValue(undefined); mockConnect.mockResolvedValue(true); mockComplete.mockResolvedValue(true); });
it('Back restores the previous visible decision and retains the selected file through help', async () => {
  const { result } = renderHook(() => usePostOnboardingImportController(route));
  act(() => result.current.chooseProvider('uber_eats'));
  await act(async () => { await result.current.chooseDownloadedFile(); });
  act(() => result.current.setStep('file_help'));
  act(() => result.current.goBack());
  expect(result.current.state).toMatchObject({ kind: 'download_ready', downloaded: true });
  expect(result.current.fileSession.file).toBe(mockFileSession.file);
  act(() => result.current.goBack());
  expect(result.current.state.kind).toBe('request');
  expect(result.current.selectedProvider).toBe('uber_eats');
});
it('starts importing the validated file without a review step', async () => {
  mockPreferences.export.providers.uberEats.status = 'file_ready';
  mockFileSession.file = null;
  mockChooseFile.mockResolvedValueOnce(null).mockResolvedValueOnce(selectedFile);
  const { result } = renderHook(() => usePostOnboardingImportController({ ...route, intent: 'resume_export', provider: 'uber_eats' }));

  await act(async () => { expect(await result.current.chooseDownloadedFile()).toBe(false); });
  expect(result.current.state).toMatchObject({ kind: 'download_ready', downloaded: false });
  expect(mockReport).not.toHaveBeenCalled();
  expect(mockSubmitFile).not.toHaveBeenCalled();

  await act(async () => { expect(await result.current.chooseDownloadedFile()).toBe(true); });
  expect(result.current.state).toMatchObject({ kind: 'download_ready', downloaded: true });
  expect(mockReport).toHaveBeenCalledWith('uber_eats', false);
  expect(mockSubmitFile).toHaveBeenCalledWith(selectedFile);
});
it('does not connect or import a chosen mailbox until the review action', () => {
  const { result } = renderHook(() => usePostOnboardingImportController(route));
  act(() => result.current.chooseEmail());
  act(() => result.current.chooseMailbox('outlook'));
  expect(result.current.state).toMatchObject({ kind: 'email_review', provider: 'outlook' });
  expect(mockConnect).not.toHaveBeenCalled();
  expect(mockImport).not.toHaveBeenCalled();
});
it('keeps an explicit request choice before provider selection', () => {
  const { result } = renderHook(() => usePostOnboardingImportController(route));
  act(() => result.current.requestHistory());
  act(() => result.current.chooseProvider('doordash'));
  expect(result.current.state).toMatchObject({ kind: 'request', provider: { provider: 'doordash' } });
});
it.each(['home', 'history', 'summary', 'settings'] as const)('Close returns to %s', returnTo => {
  const { result } = renderHook(() => usePostOnboardingImportController({ ...route, returnTo }));
  act(() => result.current.close());
  expect(router.replace).toHaveBeenCalledWith({ home: '/(tabs)', history: '/(tabs)/history', summary: '/(tabs)/wrapped-journey', settings: '/settings/accounts-permissions' }[returnTo]);
});
it('stays on confirmation when saving fails and advances only on successful save', async () => {
  mockComplete.mockResolvedValueOnce(false);
  const { result } = renderHook(() => usePostOnboardingImportController({ ...route, provider: 'uber_eats', confirmRequest: true }));
  await act(async () => { expect(await result.current.completeTutorial('uber')).toBe(false); });
  expect(result.current.state.kind).toBe('confirm_request');
  await act(async () => { mockPreferences.export.providers.uberEats.status = 'requested'; await result.current.completeTutorial('uber'); });
  expect(result.current.state.kind).toBe('provider_waiting');
});
it('does not close or move Back while a request is saving', () => {
  mockRequestSaving = true;
  const { result } = renderHook(() => usePostOnboardingImportController(route));
  act(() => { result.current.close(); result.current.goBack(); });
  expect(router.replace).not.toHaveBeenCalled();
});
it('repairs the chosen service despite an active import and retains explicit reconnect after selection', async () => {
  mockBusy = true;
  mockOperation = { id: 'active', status: 'running' };
  const { result } = renderHook(() => usePostOnboardingImportController({ ...route, intent: 'reconnect' }));
  act(() => result.current.chooseMailbox('outlook'));
  await act(async () => { await result.current.startEmail(); });
  expect(mockConnect).toHaveBeenCalledTimes(1);
  expect(mockImport).not.toHaveBeenCalled();
});
it('does not repeat connection repair after a successful cold OAuth return', () => {
  mockPreferences.outlookBaseline.hasCompleted = true;
  const { result } = renderHook(() => usePostOnboardingImportController({ ...route, intent: 'reconnect', mailbox: 'outlook', connectionSucceeded: true }));
  expect(result.current.state.kind).toBe('email_review');
  expect(mockConnect).not.toHaveBeenCalled();
});
it('opens a linked download guide once and continues to the native picker', async () => {
  const handoff = { ...route, intent: 'resume_export' as const, provider: 'uber_eats' as const, showDownloadSteps: true };
  const { result, rerender } = renderHook(() => usePostOnboardingImportController(handoff));
  expect(mockOpenTutorial).toHaveBeenCalledWith('uber', 'download');
  act(() => result.current.closeTutorial());
  rerender({});
  expect(mockOpenTutorial).toHaveBeenCalledTimes(1);
  await act(async () => { result.current.finishDownloadGuide('uber'); });
  expect(result.current.selection.step).toBe('upload');
  expect(mockReport).toHaveBeenCalledWith('uber_eats', false);
  expect(mockSubmitFile).toHaveBeenCalledWith(selectedFile);
});
it('opens the picker for a direct file shortcut instead of showing an empty review', async () => {
  mockPreferences.export.providers.uberEats.status = 'requested';
  mockFileSession.file = null;
  mockChooseFile.mockResolvedValue(null);
  const { result } = renderHook(() => usePostOnboardingImportController({ ...route, provider: 'uber_eats', showDownloadSteps: true, downloadedVersion: 'v1' }));
  await act(async () => undefined);
  expect(mockChooseFile).toHaveBeenCalledTimes(1);
  expect(result.current.state).toMatchObject({ kind: 'download_ready', downloaded: false });
  expect(mockOpenTutorial).not.toHaveBeenCalled();
});
it.each(['gmail', 'outlook'] as const)('starts the first %s import only from the reviewed action', async mailbox => {
  const connection = mailbox === 'gmail' ? mockPreferences.gmailConnection : mockPreferences.outlookConnection;
  Object.assign(connection, { connected: true, connectionHealth: 'valid', canImport: true, email: `${mailbox}@example.com` });
  const { result } = renderHook(() => usePostOnboardingImportController({ ...route, intent: 'email', mailbox }));
  expect(mockImport).not.toHaveBeenCalled();
  await act(async () => { await result.current.startEmail(); });
  expect(mockImport).toHaveBeenCalledWith('initial', false);
});
it('continues a connected mailbox into tracking consent without reimporting history', async () => {
  Object.assign(mockPreferences.gmailConnection, { connected: true, connectionHealth: 'valid', canImport: true });
  mockPreferences.gmailBaseline.hasCompleted = true;
  const { result } = renderHook(() => usePostOnboardingImportController({ ...route, intent: 'email', mailbox: 'gmail', gmailPurpose: 'ongoing_tracking' }));
  await act(async () => { await result.current.startEmail(); });
  expect(mockSetupOngoingUpdates).toHaveBeenCalledTimes(1);
  expect(mockImport).not.toHaveBeenCalled();
});

it.each(['uber_eats', 'doordash'] as const)('keeps %s preparation active through slow file validation and submits once validation finishes', async provider => {
  let finishChoice!: (file: typeof selectedFile | null) => void;
  mockChooseFile.mockImplementationOnce(() => new Promise(resolve => { finishChoice = resolve; }));
  mockFileSession.file = null;
  const { result } = renderHook(() => usePostOnboardingImportController({ ...route, intent: 'resume_export', provider }));
  let selection!: Promise<boolean>;
  act(() => { selection = result.current.chooseDownloadedFile(); });
  expect(result.current.preparingFile).toBe(true);
  expect(result.current.navigationBlocked).toBe(true);
  expect(mockCloseTutorial).not.toHaveBeenCalled();
  await act(async () => { expect(await result.current.chooseDownloadedFile()).toBe(false); });
  expect(mockChooseFile).toHaveBeenCalledTimes(1);
  expect(result.current.preparingFile).toBe(true);
  act(() => result.current.goBack());
  expect(router.replace).not.toHaveBeenCalled();
  await act(async () => {
    mockFileSession.file = selectedFile;
    finishChoice(selectedFile);
    expect(await selection).toBe(true);
  });
  expect(result.current.preparingFile).toBe(false);
  expect(result.current.state).toMatchObject({ kind: 'download_ready', downloaded: true, provider: { provider } });
  expect(mockCloseTutorial).toHaveBeenCalledTimes(1);
  expect(mockSubmitFile).toHaveBeenCalledWith(selectedFile);
});

it('restores the previous decision after a canceled or rejected selection without closing the guide', async () => {
  let finishChoice!: (file: null) => void;
  mockChooseFile.mockImplementationOnce(() => new Promise(resolve => { finishChoice = resolve; }));
  const { result } = renderHook(() => usePostOnboardingImportController({ ...route, intent: 'resume_export', provider: 'doordash' }));
  const previous = result.current.selection;
  let selection!: Promise<boolean>;
  act(() => { selection = result.current.chooseDownloadedFile(); });
  expect(result.current.preparingFile).toBe(true);
  await act(async () => { finishChoice(null); expect(await selection).toBe(false); });
  expect(result.current.preparingFile).toBe(false);
  expect(result.current.navigationBlocked).toBeFalsy();
  expect(result.current.selection).toEqual(previous);
  expect(mockCloseTutorial).not.toHaveBeenCalled();
  expect(mockReport).not.toHaveBeenCalled();
});
