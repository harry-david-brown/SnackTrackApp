import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
import { resolveOngoingUpdatesState } from '@features/import-flow/ongoingUpdatesState';
import { importReturnDestination, parseImportReturnTo } from '@features/import-flow/importNavigation';
import { inferImportReturnTo } from '@features/navigation/navigationPolicy';

function eligible() {
  const value = createImportPreferencesFixture();
  value.ongoingTracking.baseline = { eligible: true, source: 'exports' };
  value.ongoingTracking.capability.canTrack = true;
  value.ongoingTracking.capability.connectionHealth = 'valid';
  return value;
}
it('does not guess while loading or after a failed settings read', () => {
  expect(resolveOngoingUpdatesState(null)).toBe('loading');
  expect(resolveOngoingUpdatesState(eligible(), { unavailable: true })).toBe('unavailable');
});
it('requires the server baseline, not the latest import count', () => {
  expect(resolveOngoingUpdatesState(createImportPreferencesFixture())).toBe('baseline');
  expect(resolveOngoingUpdatesState(eligible())).toBe('eligible');
});
it.each(['setting_up', 'active', 'error'] as const)('preserves %s instead of claiming success', effectiveState => {
  const value = eligible();
  value.ongoingTracking.effectiveState = effectiveState;
  value.ongoingTracking.consentState = 'granted';
  expect(resolveOngoingUpdatesState(value)).toBe(effectiveState);
});
it.each(['declined', 'paused'] as const)('does not solicit %s users unless they explicitly reconsider', effectiveState => {
  const value = eligible();
  value.ongoingTracking.effectiveState = effectiveState;
  expect(resolveOngoingUpdatesState(value)).toBe('off');
  expect(resolveOngoingUpdatesState(value, { reconsider: true })).toBe('eligible');
});
it('distinguishes a new connection from expired access and temporary outages', () => {
  const value = eligible();
  value.ongoingTracking.capability.canTrack = false;
  expect(resolveOngoingUpdatesState(value)).toBe('disconnected');
  value.gmailConnection.email = 'example@example.com';
  expect(resolveOngoingUpdatesState(value)).toBe('reconnect');
  value.ongoingTracking.capability.connectionHealth = 'unavailable';
  expect(resolveOngoingUpdatesState(value)).toBe('unavailable');
});
it('keeps uncertain saves distinct from a saved-consent check failure', () => {
  const value = eligible();
  value.ongoingTracking.effectiveState = 'error';
  expect(resolveOngoingUpdatesState(value)).toBe('error');
  expect(resolveOngoingUpdatesState(value, { saveFailed: true })).toBe('save_failed');
});
it('returns OAuth and import recovery to the ongoing-updates journey', () => {
  expect(parseImportReturnTo('ongoing_updates')).toBe('ongoing_updates');
  expect(importReturnDestination('ongoing_updates')).toBe('/ongoing-updates');
  expect(inferImportReturnTo('/ongoing-updates')).toBe('ongoing_updates');
});
