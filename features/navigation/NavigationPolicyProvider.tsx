import type { Href } from 'expo-router';
import { router, useGlobalSearchParams, usePathname, useSegments } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from 'react';
import { useUser } from '@contexts/UserContext';
import type { ExportProvider } from '@features/import-flow/contracts';
import type { ImportReturnTo } from '@features/import-flow/importNavigation';
import {
  addHistoryDestination,
  importResultDestination,
  type AppDestination,
} from './appDestinations';
import {
  inferImportReturnTo,
  reconcileNavigationTransition,
  type PendingNavigationTransition,
  isActualHomeTab,
  isDestinationCurrent,
  navigationDestinationKey,
  navigationStateKey,
  normalizeNavigationPath,
} from './navigationPolicy';

export type NavigationOutcome =
  | 'navigated'
  | 'already-current'
  | 'transition-pending'
  | 'blocked'
  | 'signed-out'
  | 'disallowed-from-route';

export type ExternalNavigationIntent =
  | {
    readonly kind: 'import-result';
    readonly source: 'background' | 'notification';
    readonly operationId: string;
    readonly returnTo?: ImportReturnTo;
  }
  | {
    readonly kind: 'resume-export';
    readonly source: 'export-ready';
    readonly provider: ExportProvider;
    readonly readyVersion?: string;
    readonly showDownloadSteps?: boolean;
  };

interface NavigationPolicyContextValue {
  open(destination: AppDestination): NavigationOutcome;
  replace(destination: AppDestination): NavigationOutcome;
  backOr(fallback: AppDestination): NavigationOutcome;
  setParams(params: Record<string, string | number | undefined>): void;
  dispatchExternalNavigation(intent: ExternalNavigationIntent): NavigationOutcome;
  registerExternalBlocker(id: string, blocked: boolean): () => void;
}

const NavigationPolicyContext = createContext<NavigationPolicyContextValue | null>(null);
const TRANSITION_RELEASE_MS = 1_000;

interface LiveNavigationState {
  readonly authenticated: boolean;
  readonly pathname: string;
  readonly params: Record<string, string | string[] | undefined>;
  readonly segments: readonly string[];
}

export function NavigationPolicyProvider({ children }: PropsWithChildren) {
  const { state } = useUser();
  const pathname = usePathname();
  const params = useGlobalSearchParams() as Record<string, string | string[] | undefined>;
  const segments = useSegments();
  const blockers = useRef(new Set<string>());
  const pending = useRef<PendingNavigationTransition | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observedRouteKey = navigationStateKey(pathname, params);
  const live = useRef<LiveNavigationState>({ authenticated: false, pathname, params, segments });
  live.current = {
    authenticated: Boolean(state.isAuthenticated && state.user),
    pathname,
    params,
    segments,
  };

  const clearPending = useCallback(() => {
    pending.current = null;
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = null;
  }, []);

  useEffect(() => clearPending, [clearPending]);

  useEffect(() => {
    if (!pending.current) return;
    clearPending();
  }, [clearPending, observedRouteKey]);

  const beginNavigation = useCallback((destination: Href, mode: 'open' | 'replace'): NavigationOutcome => {
    const current = live.current;
    const currentKey = navigationStateKey(current.pathname, current.params);
    // The app can be suspended before the release timer fires (for example,
    // while an OAuth browser is open). Once Expo Router reports a different
    // route, the old transition is complete and must not block a one-shot
    // handoff mounted on the new route.
    if (pending.current && !reconcileNavigationTransition(pending.current, currentKey)) clearPending();
    if (isDestinationCurrent(destination, current.pathname, current.params)) return 'already-current';
    if (pending.current) return 'transition-pending';

    pending.current = { destinationKey: navigationDestinationKey(destination), originKey: currentKey };
    const transition = pending.current;
    releaseTimer.current = setTimeout(() => {
      if (pending.current === transition) clearPending();
    }, TRANSITION_RELEASE_MS);
    if (mode === 'replace') router.replace(destination);
    else router.navigate(destination);
    return 'navigated';
  }, [clearPending]);

  const open = useCallback((destination: AppDestination) => beginNavigation(destination, 'open'), [beginNavigation]);
  const replace = useCallback((destination: AppDestination) => beginNavigation(destination, 'replace'), [beginNavigation]);
  const backOr = useCallback((fallback: AppDestination): NavigationOutcome => {
    const current = live.current;
    const currentKey = navigationStateKey(current.pathname, current.params);
    if (pending.current && !reconcileNavigationTransition(pending.current, currentKey)) clearPending();
    if (pending.current) return 'transition-pending';
    if (!router.canGoBack()) return beginNavigation(fallback, 'replace');
    pending.current = { destinationKey: '__back__', originKey: currentKey };
    const transition = pending.current;
    releaseTimer.current = setTimeout(() => {
      if (pending.current === transition) clearPending();
    }, TRANSITION_RELEASE_MS);
    router.back();
    return 'navigated';
  }, [beginNavigation, clearPending]);
  const setParams = useCallback((nextParams: Record<string, string | number | undefined>) => {
    router.setParams(nextParams);
  }, []);

  const dispatchExternalNavigation = useCallback((intent: ExternalNavigationIntent): NavigationOutcome => {
    const current = live.current;
    if (!current.authenticated) return 'signed-out';
    if (blockers.current.size > 0) return 'blocked';
    if (intent.kind === 'import-result') {
      const currentOperationId = current.params.operationId;
      const currentOperationValue = Array.isArray(currentOperationId) ? currentOperationId[0] : currentOperationId;
      if (normalizeNavigationPath(current.pathname) === '/import-result' && currentOperationValue === intent.operationId) {
        return 'already-current';
      }
      const returnTo = intent.returnTo ?? inferImportReturnTo(current.pathname);
      const destination = importResultDestination(intent.operationId, returnTo);
      if (isDestinationCurrent(destination, current.pathname, current.params)) return 'already-current';
      if (intent.source === 'background' && !isActualHomeTab(current.segments)) return 'disallowed-from-route';
      return beginNavigation(destination, intent.source === 'background' ? 'replace' : 'open');
    }

    return beginNavigation(addHistoryDestination({
      intent: 'resume_export',
      provider: intent.provider,
      returnTo: inferImportReturnTo(current.pathname),
      downloadedVersion: intent.readyVersion,
      showDownloadSteps: intent.showDownloadSteps,
    }), 'open');
  }, [beginNavigation]);

  const registerExternalBlocker = useCallback((id: string, blocked: boolean) => {
    if (blocked) blockers.current.add(id);
    else blockers.current.delete(id);
    return () => { blockers.current.delete(id); };
  }, []);

  const value = useMemo<NavigationPolicyContextValue>(() => ({
    open,
    replace,
    backOr,
    setParams,
    dispatchExternalNavigation,
    registerExternalBlocker,
  }), [backOr, dispatchExternalNavigation, open, registerExternalBlocker, replace, setParams]);

  return <NavigationPolicyContext.Provider value={value}>{children}</NavigationPolicyContext.Provider>;
}

export function useAppNavigation(): NavigationPolicyContextValue {
  const value = useContext(NavigationPolicyContext);
  if (!value) throw new Error('useAppNavigation must be used within NavigationPolicyProvider.');
  return value;
}

export function useExternalNavigationBlocker(id: string, blocked: boolean): void {
  const { registerExternalBlocker } = useAppNavigation();
  useEffect(() => registerExternalBlocker(id, blocked), [blocked, id, registerExternalBlocker]);
}
