import { resolveOngoingUpdatesPresentation, resolveTrackingEligibility } from '@features/import-flow/trackingEligibility';
import type { ImportPreferencesResponse } from '@services/gmailApi';

const preferences = (overrides: {
  baseline?: boolean;
  canTrack?: boolean;
  health?: 'valid' | 'reconnect_required' | 'unavailable';
  bothExports?: boolean;
  oneExport?: boolean;
} = {}) => ({
  gmailBaseline: {
    hasCompleted: overrides.baseline ?? true,
    completedAt: '2026-08-24T00:00:00.000Z',
    latestAttempt: { status: 'completed', updatedAt: null, importedCount: 0, errorCode: null },
  },
  gmailImport: { status: 'completed', updatedAt: null, importedCount: 0, errorCode: null, receiptCount: 0, hasImported: true },
  ongoingTracking: {
    capability: {
      canTrack: overrides.canTrack ?? true,
      connectionHealth: overrides.health ?? 'valid',
    },
  },
  coverage: {
    exportProviders: {
      uberEats: { hasData: overrides.bothExports || overrides.oneExport || false, receiptCount: overrides.bothExports || overrides.oneExport ? 10 : 0 },
      doorDash: { hasData: overrides.bothExports ?? false, receiptCount: overrides.bothExports ? 10 : 0 },
    },
  },
}) as unknown as ImportPreferencesResponse;

describe('resolveTrackingEligibility', () => {
  it('uses sticky baseline completion instead of the latest attempt status', () => {
    const value = preferences();
    value.gmailBaseline!.latestAttempt.status = 'failed';
    expect(resolveTrackingEligibility(value)).toEqual({ eligible: true, reason: 'eligible' });
  });

  it('distinguishes baseline, temporary availability, and reconnect recovery', () => {
    expect(resolveTrackingEligibility(preferences({ baseline: false }))).toEqual({ eligible: false, reason: 'historical_baseline_required' });
    expect(resolveTrackingEligibility(preferences({ health: 'unavailable' }))).toEqual({ eligible: false, reason: 'gmail_temporarily_unavailable' });
    expect(resolveTrackingEligibility(preferences({ canTrack: false, health: 'reconnect_required' }))).toEqual({ eligible: false, reason: 'gmail_reconnect_required' });
  });

  it('accepts both receipt-backed provider exports without completing Gmail history', () => {
    expect(resolveTrackingEligibility(preferences({ baseline: false, bothExports: true })))
      .toEqual({ eligible: true, reason: 'eligible' });
  });

  it('accepts one receipt-backed provider export and leaves provider completeness separate', () => {
    expect(resolveTrackingEligibility(preferences({ baseline: false, oneExport: true })))
      .toEqual({ eligible: true, reason: 'eligible' });
  });

  it('presents future updates as the recommended next step after history exists', () => {
    const value = preferences({ baseline: false });
    expect(resolveOngoingUpdatesPresentation(value, true)).toMatchObject({
      visible: true,
      statusLabel: 'Recommended',
      tone: 'recommended',
      actionLabel: 'Enable Ongoing Updates',
      actionVariant: 'primary',
    });
  });

  it('uses a reconnect action when completed history exists but Gmail access is unhealthy', () => {
    expect(resolveOngoingUpdatesPresentation(preferences({
      canTrack: false,
      health: 'reconnect_required',
    }), true)).toMatchObject({
      statusLabel: 'Reconnect',
      actionLabel: 'Reconnect Gmail',
      tone: 'warning',
    });
  });
});
