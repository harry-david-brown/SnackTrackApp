import {
  createWrappedRestartHref,
  resolveWrappedJourneyInstanceKey,
} from '@features/wrapped/wrappedNavigation';

describe('wrapped navigation', () => {
  it('creates an explicit restart intent for post-import navigation', () => {
    expect(createWrappedRestartHref(12345)).toEqual({
      pathname: '/(tabs)/wrapped-journey',
      params: { restart: '12345' },
    });
  });

  it('changes the deck instance when a new restart intent arrives', () => {
    expect(resolveWrappedJourneyInstanceKey(100, undefined)).toBe('100:resume');
    expect(resolveWrappedJourneyInstanceKey(100, 'first-import')).toBe('100:first-import');
    expect(resolveWrappedJourneyInstanceKey(100, ['second-import', 'ignored'])).toBe('100:second-import');
  });
});
