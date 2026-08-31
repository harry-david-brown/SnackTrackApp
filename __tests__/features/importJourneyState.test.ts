import {
  resolveExportOpportunity,
  resolveImportCoverage,
  resolveImportSetupRecommendation,
} from '@features/import-flow/importJourneyState';
import type { ImportPreferencesResponse } from '@services/gmailApi';

const preferences = (): ImportPreferencesResponse => ({
  monitoring: {
    consentState: 'not_offered', consentVersion: null, consentedAt: null, revokedAt: null,
    effectiveState: 'not_offered',
    capability: { gmailConnected: false, durableAccess: false, canMonitor: false },
  },
  export: {
    status: 'not_started', requestedAt: null, updatedAt: null,
    providers: {
      uberEats: { provider: 'uber_eats', status: 'not_started', requestedAt: null, updatedAt: null, errorCode: null },
      doorDash: { provider: 'doordash', status: 'not_started', requestedAt: null, updatedAt: null, errorCode: null },
    },
  },
  gmailImport: {
    status: 'never_started', updatedAt: null, importedCount: 0, errorCode: null,
    receiptCount: 0, hasImported: false,
  },
  ongoingTracking: {
    consentState: 'not_offered', consentVersion: null, consentedAt: null, revokedAt: null,
    status: 'inactive', effectiveState: 'not_offered',
    capability: { gmailConnected: false, durableAccess: false, canTrack: false },
    activity: {
      lastCheckAttemptAt: null, lastSuccessfulCheckAt: null, lastStatsUpdatedAt: null,
      lastNewOrderAt: null, ordersAddedThisWeek: 0, lastErrorAt: null, lastErrorCode: null,
    },
  },
  coverage: {
    emailReceiptCount: 0, exportReceiptCount: 0, hasEmailData: false, hasExportData: false,
    exportProviders: {
      uberEats: { receiptCount: 0, hasData: false },
      doorDash: { receiptCount: 0, hasData: false },
    },
  },
});

describe('import journey provider coverage', () => {
  it('distinguishes one provider from complete export coverage', () => {
    const value = preferences();
    value.export.status = 'completed';
    value.export.providers!.uberEats.status = 'not_started';
    value.coverage.hasExportData = true;
    value.coverage.exportProviders.uberEats = { hasData: true, receiptCount: 42 };

    const result = resolveImportCoverage(value);
    expect(result.importedProviderCount).toBe(1);
    expect(result.hasAnyExportData).toBe(true);
    expect(result.allProvidersImported).toBe(false);
    expect(result.providers.uberEats.status).toBe('completed');
    expect(result.missingProviders).toEqual(['doordash']);
  });

  it('uses receipt coverage to complete stale provider lifecycle state', () => {
    const value = preferences();
    value.coverage.exportProviders.doorDash = { hasData: true, receiptCount: 8 };

    expect(resolveImportCoverage(value).providers.doorDash).toMatchObject({
      imported: true,
      status: 'completed',
    });
  });

  it('surfaces a ready or failed provider before an unstarted provider', () => {
    const value = preferences();
    value.export.providers!.uberEats.status = 'not_started';
    value.export.providers!.doorDash.status = 'failed';
    expect(resolveExportOpportunity(resolveImportCoverage(value))?.provider).toBe('doordash');

    value.export.providers!.uberEats.status = 'file_ready';
    expect(resolveExportOpportunity(resolveImportCoverage(value))?.provider).toBe('uber_eats');
  });

  it('selects the next setup action without imposing Gmail first', () => {
    const empty = preferences();
    expect(resolveImportSetupRecommendation({
      preferences: empty,
      gmailFeatureEnabled: true,
      gmailConnected: false,
      gmailNeedsReconnect: false,
    })).toEqual({ kind: 'choose_source' });

    empty.coverage.exportProviders.uberEats = { hasData: true, receiptCount: 10 };
    empty.coverage.hasExportData = true;
    expect(resolveImportSetupRecommendation({
      preferences: empty,
      gmailFeatureEnabled: true,
      gmailConnected: false,
      gmailNeedsReconnect: false,
    })).toEqual({ kind: 'connect_email', purpose: 'ongoing_tracking' });

    empty.coverage.exportProviders.doorDash = { hasData: true, receiptCount: 8 };
    expect(resolveImportSetupRecommendation({
      preferences: empty,
      gmailFeatureEnabled: true,
      gmailConnected: false,
      gmailNeedsReconnect: false,
    })).toEqual({ kind: 'connect_email', purpose: 'ongoing_tracking' });

    empty.ongoingTracking.capability = {
      gmailConnected: true, durableAccess: true, canTrack: true, connectionHealth: 'valid',
    };
    expect(resolveImportSetupRecommendation({
      preferences: empty,
      gmailFeatureEnabled: true,
      gmailConnected: true,
      gmailNeedsReconnect: false,
    })).toEqual({ kind: 'enable_tracking' });
  });

  it('recommends ongoing updates before an optional export after Gmail history completes', () => {
    const value = preferences();
    value.gmailImport = {
      ...value.gmailImport,
      status: 'completed',
      hasImported: true,
      receiptCount: 24,
      importedCount: 24,
    };
    value.coverage = {
      ...value.coverage,
      hasEmailData: true,
      emailReceiptCount: 24,
    };
    value.ongoingTracking.capability = {
      gmailConnected: true,
      durableAccess: true,
      canTrack: true,
      connectionHealth: 'valid',
    };

    expect(resolveImportSetupRecommendation({
      preferences: value,
      gmailFeatureEnabled: true,
      gmailConnected: true,
      gmailNeedsReconnect: false,
    })).toEqual({ kind: 'enable_tracking' });

    value.ongoingTracking.consentState = 'declined';
    value.ongoingTracking.effectiveState = 'declined';
    expect(resolveImportSetupRecommendation({
      preferences: value,
      gmailFeatureEnabled: true,
      gmailConnected: true,
      gmailNeedsReconnect: false,
    })).toMatchObject({ kind: 'provider', provider: { provider: 'uber_eats' } });
  });
});
