import {
  reconcileNavigationTransition,
  destinationParts,
  inferImportReturnTo,
  isActualHomeTab,
  isDestinationCurrent,
  navigationDestinationKey,
  navigationStateKey,
  normalizeNavigationPath,
} from './navigationPolicy';

describe('navigation policy', () => {
  it.each([
    ['/(tabs)', '/'],
    ['/(tabs)/history', '/history'],
    ['/settings/appearance/', '/settings/appearance'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeNavigationPath(input)).toBe(expected);
  });

  it('matches the same semantic destination across route-group paths', () => {
    const destination = { pathname: '/(tabs)/history' as const, params: { filter: 'recent' } };
    expect(isDestinationCurrent(destination, '/history', { filter: 'recent', internal: 'ignored' })).toBe(true);
    expect(isDestinationCurrent(destination, '/history', { filter: 'all' })).toBe(false);
  });

  it('treats omitted import defaults as the same flow state', () => {
    expect(isDestinationCurrent(
      { pathname: '/add-history', params: { intent: 'choose', returnTo: 'home' } },
      '/add-history',
      {},
    )).toBe(true);
  });

  it('does not suppress a genuinely different import flow state', () => {
    expect(isDestinationCurrent(
      { pathname: '/add-history', params: { intent: 'resume_export', provider: 'uber_eats', returnTo: 'home' } },
      '/add-history',
      { intent: 'resume_export', provider: 'uber_eats', showDownloadSteps: 'true' },
    )).toBe(false);
  });

  it('creates a stable key regardless of parameter order', () => {
    expect(navigationDestinationKey({ pathname: '/import-result', params: { returnTo: 'home', operationId: 'op-1' } }))
      .toBe(navigationDestinationKey({ pathname: '/import-result', params: { operationId: 'op-1', returnTo: 'home' } }));
  });

  it('creates the same key for an observed grouped route and its public pathname', () => {
    expect(navigationStateKey('/(tabs)/history', { filter: 'recent' }))
      .toBe(navigationDestinationKey({ pathname: '/history', params: { filter: 'recent' } }));
  });

  it('parses string query destinations for compatibility', () => {
    expect(destinationParts('/add-history?intent=provider&returnTo=summary')).toEqual({
      pathname: '/add-history',
      params: { intent: 'provider', returnTo: 'summary' },
    });
  });

  it.each([
    ['/', 'home'],
    ['/history', 'history'],
    ['/wrapped-journey', 'summary'],
    ['/settings/appearance', 'settings'],
  ] as const)('maps %s to the %s import return destination', (pathname, expected) => {
    expect(inferImportReturnTo(pathname)).toBe(expected);
  });

  it('recognizes only the actual tab home segments as neutral Home', () => {
    expect(isActualHomeTab(['(tabs)'])).toBe(true);
    expect(isActualHomeTab([])).toBe(false);
    expect(isActualHomeTab(['(tabs)', 'history'])).toBe(false);
  });
});

test('an observed unrelated route also releases the previous transition', () => {
  const pending = { originKey: '/home', destinationKey: '/import-progress' };
  expect(reconcileNavigationTransition(pending, '/home')).toBe(pending);
  expect(reconcileNavigationTransition(pending, '/oauth-callback')).toBeNull();
});
