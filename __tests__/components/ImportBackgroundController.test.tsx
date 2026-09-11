import { act, render } from '@testing-library/react-native';
import { usePathname } from 'expo-router';
import { ImportBackgroundController } from '@components/import/ImportBackgroundController';
import { experienceApi } from '@services/experienceApi';
import { useAppNavigation, type NavigationOutcome } from '@features/navigation';

jest.mock('@contexts/UserContext', () => ({ useUser: () => ({ state: { user: { id: 'user' } } }) }));
jest.mock('@hooks/useImportPreferences', () => ({ useImportPreferences: () => ({ preferences: null }) }));
const mockOperation = { id: 'upload', status: 'succeeded', kind: 'export_file', trigger: 'user', journeyContext: 'onboarding' };
const dispatchExternalNavigation = jest.fn<NavigationOutcome, []>(() => 'navigated');
jest.mock('@hooks/useImportOperation', () => ({ useImportOperation: () => ({ operation: mockOperation }) }));
jest.mock('@services/experienceApi', () => ({ experienceApi: { getState: jest.fn() } }));
jest.mock('@features/import-flow/postImportNavigation', () => ({ resolvePostImportDestination: () => 'recap_ready' }));
jest.mock('@features/ads/adSession', () => ({ suppressAdsForSession: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAppNavigation).mockReturnValue({
    open: jest.fn(),
    replace: jest.fn(),
    backOr: jest.fn(),
    setParams: jest.fn(),
    dispatchExternalNavigation,
    registerExternalBlocker: jest.fn(() => () => undefined),
  });
  jest.mocked(experienceApi.getState).mockResolvedValue({} as Awaited<ReturnType<typeof experienceApi.getState>>);
});

it.each(['/add-history', '/import-progress', '/data-setup'])('leaves completion navigation to the visible journey at %s', async pathname => {
  jest.mocked(usePathname).mockReturnValue(pathname);
  render(<ImportBackgroundController />);
  await act(async () => {});
  expect(experienceApi.getState).not.toHaveBeenCalled();
  expect(dispatchExternalNavigation).not.toHaveBeenCalled();
});

it('requests background result navigation when a recap becomes ready on Home', async () => {
  jest.mocked(usePathname).mockReturnValue('/');
  render(<ImportBackgroundController />);
  await act(async () => {});
  expect(dispatchExternalNavigation).toHaveBeenCalledWith({
    kind: 'import-result',
    source: 'background',
    operationId: 'upload',
    returnTo: 'home',
  });
});

it('leaves a disallowed completion available until the user returns Home', async () => {
  dispatchExternalNavigation.mockReturnValueOnce('disallowed-from-route').mockReturnValue('navigated');
  jest.mocked(usePathname).mockReturnValue('/history');
  const screen = render(<ImportBackgroundController />);
  await act(async () => {});
  expect(dispatchExternalNavigation).toHaveBeenCalledTimes(1);

  jest.mocked(usePathname).mockReturnValue('/');
  screen.rerender(<ImportBackgroundController />);
  await act(async () => {});
  expect(dispatchExternalNavigation).toHaveBeenCalledTimes(2);
});

it('does not repeatedly handle a result that is already current', async () => {
  dispatchExternalNavigation.mockReturnValue('already-current');
  jest.mocked(usePathname).mockReturnValue('/import-result');
  const screen = render(<ImportBackgroundController />);
  await act(async () => {});
  screen.rerender(<ImportBackgroundController />);
  await act(async () => {});
  expect(dispatchExternalNavigation).toHaveBeenCalledTimes(1);
});

it('cancels an in-flight background redirect when the user enters add history', async () => {
  let finish!: (value: Awaited<ReturnType<typeof experienceApi.getState>>) => void;
  jest.mocked(experienceApi.getState).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  jest.mocked(usePathname).mockReturnValue('/');
  const screen = render(<ImportBackgroundController />);
  jest.mocked(usePathname).mockReturnValue('/add-history');
  screen.rerender(<ImportBackgroundController />);
  await act(async () => { finish({} as Awaited<ReturnType<typeof experienceApi.getState>>); });
  expect(dispatchExternalNavigation).not.toHaveBeenCalled();
});
