import { isAdEligible, type AdRuntimeConfiguration } from './contracts';
import { normalizeAdRuntimeConfiguration } from '@services/adsApi';
import { getSessionAdImpressions, recordSessionAdImpression, resetAdSessionForTests } from './adSession';

const configuration: AdRuntimeConfiguration = {
  enabled: true,
  placement: 'dashboard_after_insights',
  placements: ['dashboard_after_insights', 'history_after_fifth_order'],
  selectionStrategy: 'first_eligible',
  maxImpressionsPerSession: 1,
  maxImpressionsPerDay: 2,
  minimumReceiptCount: 3,
  configurationVersion: 4,
  refreshAfterSeconds: 60,
};

describe('launch ad eligibility', () => {
  afterEach(resetAdSessionForTests);

  it('requires fresh enabled configuration, useful insights, enough receipts, foreground, and cap room', () => {
    const eligible = {
      configuration,
      configurationFresh: true,
      receiptCount: 3,
      insightsReady: true,
      appActive: true,
      impressionsThisSession: 0,
    };
    expect(isAdEligible(eligible)).toBe(true);
    expect(isAdEligible({ ...eligible, configurationFresh: false })).toBe(false);
    expect(isAdEligible({ ...eligible, receiptCount: 2 })).toBe(false);
    expect(isAdEligible({ ...eligible, insightsReady: false })).toBe(false);
    expect(isAdEligible({ ...eligible, appActive: false })).toBe(false);
    expect(isAdEligible({ ...eligible, impressionsThisSession: 1 })).toBe(false);
  });

  it('tracks the impression cap per user for the current process', () => {
    expect(getSessionAdImpressions('user-a')).toBe(0);
    expect(recordSessionAdImpression('user-a')).toBe(1);
    expect(getSessionAdImpressions('user-a')).toBe(1);
    expect(getSessionAdImpressions('user-b')).toBe(0);
  });
});

describe('ad runtime transport', () => {
  it('normalizes the complete runtime response', () => {
    expect(normalizeAdRuntimeConfiguration(configuration)).toEqual(configuration);
  });

  it('rejects unsafe or incomplete runtime responses', () => {
    expect(() => normalizeAdRuntimeConfiguration({ ...configuration, placement: 'wrapped' })).toThrow();
    expect(() => normalizeAdRuntimeConfiguration({ ...configuration, maxImpressionsPerSession: 4 })).toThrow();
    expect(() => normalizeAdRuntimeConfiguration({ ...configuration, enabled: 'true' })).toThrow();
  });
});
