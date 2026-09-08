import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
import { emailUpdatesPresentation, hasMailboxBaseline } from './emailImportPresentation';

it('offers automatic updates only when consent has never been offered', () => {
  const preferences = createImportPreferencesFixture();
  preferences.ongoingTracking.consentState = 'not_offered';
  expect(emailUpdatesPresentation(preferences)).toMatchObject({ automaticUpdates: true, label: 'Import & enable automatic updates' });
});
it.each(['declined', 'revoked'] as const)('retains %s permission on a first mailbox import', consentState => {
  const preferences = createImportPreferencesFixture();
  preferences.ongoingTracking.consentState = consentState;
  expect(emailUpdatesPresentation(preferences)).toMatchObject({ automaticUpdates: false, label: 'Import my receipts' });
  expect(emailUpdatesPresentation(preferences).description).toContain('off');
});
it('does not treat a Gmail baseline as an Outlook baseline', () => {
  const preferences = createImportPreferencesFixture();
  preferences.gmailBaseline.hasCompleted = true;
  preferences.outlookBaseline.hasCompleted = false;
  expect(hasMailboxBaseline(preferences, 'gmail')).toBe(true);
  expect(hasMailboxBaseline(preferences, 'outlook')).toBe(false);
});
it('does not re-grant an already granted permission', () => {
  const preferences = createImportPreferencesFixture();
  preferences.ongoingTracking.consentState = 'granted';
  expect(emailUpdatesPresentation(preferences).automaticUpdates).toBe(false);
});
