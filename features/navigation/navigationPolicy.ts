import type { Href } from 'expo-router';
import type { ImportReturnTo } from '@features/import-flow/importNavigation';

type SearchParams = Record<string, string | string[] | undefined>;
type ComparableParams = Record<string, string>;

const first = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return value.length > 0 ? String(value[0]) : undefined;
  if (value === undefined || value === null) return undefined;
  return String(value);
};

export function normalizeNavigationPath(value: string): string {
  const rawPath = value.split('?')[0]?.split('#')[0] || '/';
  const withoutGroups = rawPath.replace(/\/(?:\([^/]+\))/g, '');
  const normalized = withoutGroups.replace(/\/+$/, '');
  return normalized || '/';
}

export function destinationParts(destination: Href): { pathname: string; params: SearchParams } {
  if (typeof destination === 'string') {
    const [path, query = ''] = destination.split('?');
    const params: SearchParams = {};
    new URLSearchParams(query).forEach((value, key) => { params[key] = value; });
    return { pathname: normalizeNavigationPath(path), params };
  }

  return {
    pathname: normalizeNavigationPath(String(destination.pathname)),
    params: Object.fromEntries(
      Object.entries(destination.params ?? {}).filter(([, value]) => value !== undefined),
    ) as SearchParams,
  };
}

export function isDestinationCurrent(
  destination: Href,
  currentPathname: string,
  currentParams: SearchParams,
): boolean {
  const target = destinationParts(destination);
  if (target.pathname !== normalizeNavigationPath(currentPathname)) return false;
  const targetFlow = canonicalFlowParams(target.pathname, target.params);
  if (targetFlow) {
    const currentFlow = canonicalFlowParams(target.pathname, currentParams);
    return currentFlow !== null
      && Object.keys(targetFlow).every(key => targetFlow[key] === currentFlow[key]);
  }
  return Object.entries(target.params).every(([key, value]) => first(value) === first(currentParams[key]));
}

function canonicalFlowParams(pathname: string, params: SearchParams): ComparableParams | null {
  const value = (key: string, fallback = '') => first(params[key]) ?? fallback;
  const flag = (key: string) => value(key) === 'true' ? 'true' : 'false';

  switch (pathname) {
    case '/add-history':
      return {
        intent: value('intent', 'choose'),
        returnTo: value('returnTo', 'home'),
        provider: value('provider'),
        mailbox: value('mailbox'),
        operationId: value('operationId'),
        journeyContext: value('journeyContext', 'post_onboarding'),
        downloadedVersion: value('downloadedVersion'),
        confirmRequest: flag('confirmRequest'),
        showDownloadSteps: flag('showDownloadSteps'),
        gmail: value('gmail'),
        outlook: value('outlook'),
        error: value('error'),
      };
    case '/import-progress':
    case '/import-result':
      return {
        operationId: value('operationId'),
        returnTo: value('returnTo', 'home'),
      };
    case '/settings/accounts-permissions':
      return {
        mailbox: value('mailbox'),
        returnTo: value('returnTo', 'home'),
      };
    default:
      return null;
  }
}

export function navigationDestinationKey(destination: Href): string {
  const { pathname, params } = destinationParts(destination);
  return navigationStateKey(pathname, params);
}

/** Stable identity for the route Expo Router has actually reported. */
export function navigationStateKey(pathname: string, params: SearchParams): string {
  const query = Object.entries(params)
    .map(([key, value]) => [key, first(value)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  const normalizedPathname = normalizeNavigationPath(pathname);
  return query ? `${normalizedPathname}?${query}` : normalizedPathname;
}

export function isActualHomeTab(segments: readonly string[]): boolean {
  return segments.length === 1 && segments[0] === '(tabs)';
}

export function inferImportReturnTo(pathname: string): ImportReturnTo {
  switch (normalizeNavigationPath(pathname)) {
    case '/ongoing-updates': return 'ongoing_updates';
    case '/history': return 'history';
    case '/wrapped-journey': return 'summary';
    case '/profile':
    case '/settings/accounts-permissions':
    case '/settings/appearance':
    case '/settings/currency':
    case '/settings/help-privacy':
      return 'settings';
    default:
      return 'home';
  }
}
