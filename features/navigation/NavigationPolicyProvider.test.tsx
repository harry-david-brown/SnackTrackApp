import { act, render } from '@testing-library/react-native';
import { router, useGlobalSearchParams, usePathname, useSegments } from 'expo-router';
import { useUser } from '@contexts/UserContext';
import {
  NavigationPolicyProvider,
  useAppNavigation,
  useExternalNavigationBlocker,
  type NavigationOutcome,
} from './NavigationPolicyProvider';
import { appDestinations } from './appDestinations';

jest.mock('@contexts/UserContext', () => ({ useUser: jest.fn() }));

let policy: ReturnType<typeof useAppNavigation>;

function Probe({ blocked = false }: { blocked?: boolean }) {
  policy = useAppNavigation();
  useExternalNavigationBlocker('test-upload', blocked);
  return null;
}

function renderPolicy(blocked = false) {
  return render(<NavigationPolicyProvider><Probe blocked={blocked} /></NavigationPolicyProvider>);
}

describe('NavigationPolicyProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useUser).mockReturnValue({
      state: { isLoading: false, isAuthenticated: true, user: { id: 'user-1' } },
    } as ReturnType<typeof useUser>);
    jest.mocked(usePathname).mockReturnValue('/');
    jest.mocked(useGlobalSearchParams).mockReturnValue({});
    jest.mocked(useSegments).mockReturnValue(['(tabs)'] as never);
    jest.mocked(router.canGoBack).mockReturnValue(true);
  });

  it('opens a background import result only from the actual Home tab', () => {
    renderPolicy();
    let outcome: NavigationOutcome | undefined;
    act(() => {
      outcome = policy.dispatchExternalNavigation({ kind: 'import-result', source: 'background', operationId: 'op-1' });
    });
    expect(outcome).toBe('navigated');
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['/history', ['(tabs)', 'history']],
    ['/settings/appearance', ['settings', 'appearance']],
  ] as const)('does not interrupt %s for background completion', (pathname, segments) => {
    jest.mocked(usePathname).mockReturnValue(pathname);
    jest.mocked(useSegments).mockReturnValue([...segments] as never);
    renderPolicy();
    expect(policy.dispatchExternalNavigation({ kind: 'import-result', source: 'background', operationId: 'op-1' }))
      .toBe('disallowed-from-route');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('ignores the current import result even when returnTo differs', () => {
    jest.mocked(usePathname).mockReturnValue('/import-result');
    jest.mocked(useGlobalSearchParams).mockReturnValue({ operationId: 'op-1', returnTo: 'history' });
    jest.mocked(useSegments).mockReturnValue(['import-result'] as never);
    renderPolicy();
    expect(policy.dispatchExternalNavigation({ kind: 'import-result', source: 'notification', operationId: 'op-1' }))
      .toBe('already-current');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deduplicates repeated navigation while the first transition is pending', () => {
    renderPolicy();
    expect(policy.dispatchExternalNavigation({ kind: 'import-result', source: 'notification', operationId: 'op-1' }))
      .toBe('navigated');
    expect(policy.dispatchExternalNavigation({ kind: 'import-result', source: 'notification', operationId: 'op-1' }))
      .toBe('transition-pending');
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('releases a suspended transition when an external callback route is observed', () => {
    const view = renderPolicy();
    expect(policy.open({ pathname: '/add-history', params: { intent: 'email' } })).toBe('navigated');

    jest.mocked(usePathname).mockReturnValue('/oauth-callback');
    jest.mocked(useGlobalSearchParams).mockReturnValue({ gmail: 'success' });
    jest.mocked(useSegments).mockReturnValue(['oauth-callback'] as never);
    view.rerender(<NavigationPolicyProvider><Probe /></NavigationPolicyProvider>);

    expect(policy.replace({ pathname: '/add-history', params: { intent: 'email', gmail: 'success' } }))
      .toBe('navigated');
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('returns notification-opened results to the screen where the tap occurred', () => {
    jest.mocked(usePathname).mockReturnValue('/history');
    jest.mocked(useSegments).mockReturnValue(['(tabs)', 'history'] as never);
    renderPolicy();
    expect(policy.dispatchExternalNavigation({ kind: 'import-result', source: 'notification', operationId: 'op-1' }))
      .toBe('navigated');
    expect(router.navigate).toHaveBeenCalledWith({
      pathname: '/import-result',
      params: { operationId: 'op-1', returnTo: 'history' },
    });
  });

  it('discards external navigation while a critical flow owns navigation', () => {
    renderPolicy(true);
    expect(policy.dispatchExternalNavigation({ kind: 'resume-export', source: 'export-ready', provider: 'uber_eats' }))
      .toBe('blocked');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('rejects external navigation after authentication is removed', () => {
    jest.mocked(useUser).mockReturnValue({
      state: { isLoading: false, isAuthenticated: false, user: null },
    } as ReturnType<typeof useUser>);
    renderPolicy();
    expect(policy.dispatchExternalNavigation({ kind: 'import-result', source: 'notification', operationId: 'op-1' }))
      .toBe('signed-out');
  });

  it('uses the explicit fallback when there is no back history', () => {
    jest.mocked(router.canGoBack).mockReturnValue(false);
    renderPolicy();
    expect(policy.backOr(appDestinations.profile)).toBe('navigated');
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith(appDestinations.profile);
  });
});
