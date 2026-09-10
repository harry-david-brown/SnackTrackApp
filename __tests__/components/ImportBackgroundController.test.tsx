import { act, render } from '@testing-library/react-native';
import { router, usePathname } from 'expo-router';
import { ImportBackgroundController } from '@components/import/ImportBackgroundController';
import { experienceApi } from '@services/experienceApi';

jest.mock('@contexts/UserContext', () => ({ useUser: () => ({ state: { user: { id: 'user' } } }) }));
jest.mock('@hooks/useImportPreferences', () => ({ useImportPreferences: () => ({ preferences: null }) }));
const mockOperation = { id: 'upload', status: 'succeeded', kind: 'export_file', trigger: 'user', journeyContext: 'onboarding' };
jest.mock('@hooks/useImportOperation', () => ({ useImportOperation: () => ({ operation: mockOperation }) }));
jest.mock('@services/experienceApi', () => ({ experienceApi: { getState: jest.fn() } }));
jest.mock('@features/import-flow/postImportNavigation', () => ({ resolvePostImportDestination: () => 'recap_ready' }));
jest.mock('@features/ads/adSession', () => ({ suppressAdsForSession: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(experienceApi.getState).mockResolvedValue({} as Awaited<ReturnType<typeof experienceApi.getState>>);
});

it.each(['/add-history', '/import-progress', '/data-setup'])('leaves completion navigation to the visible journey at %s', async pathname => {
  jest.mocked(usePathname).mockReturnValue(pathname);
  render(<ImportBackgroundController />);
  await act(async () => {});
  expect(experienceApi.getState).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

it('opens the import result when a recap becomes ready outside the journey', async () => {
  jest.mocked(usePathname).mockReturnValue('/');
  render(<ImportBackgroundController />);
  await act(async () => {});
  expect(router.replace).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/import-result' }));
});

it('cancels an in-flight background redirect when the user enters add history', async () => {
  let finish!: (value: Awaited<ReturnType<typeof experienceApi.getState>>) => void;
  jest.mocked(experienceApi.getState).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  jest.mocked(usePathname).mockReturnValue('/');
  const screen = render(<ImportBackgroundController />);
  jest.mocked(usePathname).mockReturnValue('/add-history');
  screen.rerender(<ImportBackgroundController />);
  await act(async () => { finish({} as Awaited<ReturnType<typeof experienceApi.getState>>); });
  expect(router.replace).not.toHaveBeenCalled();
});
