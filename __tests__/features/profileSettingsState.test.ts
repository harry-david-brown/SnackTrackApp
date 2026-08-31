import { resolveProfileSettingsState } from '@features/profile/profileSettingsState';
import type { ImportPreferencesResponse } from '@services/gmailApi';

const preferences = (): ImportPreferencesResponse => ({
  monitoring: {
    consentState: 'not_offered', consentVersion: null, consentedAt: null, revokedAt: null,
    effectiveState: 'not_offered',
    capability: { gmailConnected: true, durableAccess: true, canMonitor: true },
  },
  export: { status: 'not_started', requestedAt: null, updatedAt: null },
  gmailImport: {
    status: 'never_started', updatedAt: null, importedCount: 0, errorCode: null,
    receiptCount: 0, hasImported: false,
  },
  ongoingTracking: {
    consentState: 'not_offered', consentVersion: null, consentedAt: null, revokedAt: null,
    status: 'inactive', effectiveState: 'not_offered',
    capability: { gmailConnected: true, durableAccess: true, canTrack: true },
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

describe('resolveProfileSettingsState', () => {
  it('keeps loading labels stable while preferences load', () => {
    expect(resolveProfileSettingsState(null, true)).toEqual({
      exportAlertsLabel: 'Checking...',
      ongoingTrackingLabel: 'Checking...',
      providerExportLabel: 'Checking...',
      tutorialMode: 'request',
      tutorialPlatform: undefined,
      tutorialProviderStatuses: { uber: 'not_started', doordash: 'not_started' },
    });
  });

  it.each([
    ['enabled', 'On'],
    ['reconnect_required', 'Reconnect'],
    ['declined', 'Off'],
    ['disabled', 'Off'],
    ['not_offered', 'Not set'],
  ] as const)('maps monitoring %s to %s', (effectiveState, label) => {
    const value = preferences();
    value.monitoring.effectiveState = effectiveState;
    expect(resolveProfileSettingsState(value, false).exportAlertsLabel).toBe(label);
  });

  it.each([
    ['active', 'On'],
    ['reconnect_required', 'Reconnect'],
    ['error', 'Needs attention'],
    ['paused', 'Off'],
    ['declined', 'Off'],
    ['not_offered', 'Not set'],
  ] as const)('maps tracking %s to %s', (effectiveState, label) => {
    const value = preferences();
    value.ongoingTracking.effectiveState = effectiveState;
    expect(resolveProfileSettingsState(value, false).ongoingTrackingLabel).toBe(label);
  });

  it('opens the download tutorial only for an export in progress', () => {
    const value = preferences();
    value.export.providers = {
      uberEats: { provider: 'uber_eats', status: 'file_ready', requestedAt: null, updatedAt: null, errorCode: null },
      doorDash: { provider: 'doordash', status: 'not_started', requestedAt: null, updatedAt: null, errorCode: null },
    };
    expect(resolveProfileSettingsState(value, false).tutorialMode).toBe('download');
    expect(resolveProfileSettingsState(value, false).tutorialPlatform).toBe('uber');
    value.export.providers.uberEats.status = 'completed';
    expect(resolveProfileSettingsState(value, false).tutorialMode).toBe('request');
  });
});
