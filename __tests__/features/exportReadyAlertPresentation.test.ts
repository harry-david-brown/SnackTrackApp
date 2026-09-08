import { resolveExportReadyAlertPresentation } from '@features/import-flow/exportReadyAlertPresentation';

describe('resolveExportReadyAlertPresentation', () => {
  it('makes notifications the primary choice when inbox monitoring is available', () => {
    expect(resolveExportReadyAlertPresentation('not_offered', true)).toEqual({
      enabled: false,
      primaryLabel: 'Notify me when it’s ready',
      supportingText: 'SnackTrack will check your connected inbox while the app is open and tell you when Uber’s ready email arrives.',
    });
  });

  it.each(['enabled'] as const)('confirms when ready-email notifications are %s', (state) => {
    expect(resolveExportReadyAlertPresentation(state, true)).toEqual({
      enabled: true,
      primaryLabel: 'Continue using SnackTrack',
      supportingText: 'We’ll let you know when Uber’s ready email arrives. SnackTrack checks while the app is open.',
    });
  });

  it('offers reconnection when mailbox access has expired', () => {
    expect(resolveExportReadyAlertPresentation('reconnect_required', false)).toEqual({
      enabled: false,
      primaryLabel: 'Reconnect email to get notified',
      supportingText: 'Reconnect the inbox that receives your Uber emails, then SnackTrack can watch for the ready message.',
    });
  });

  it.each(['disabled', 'declined', 'not_offered'] as const)('offers connection for %s without a monitorable inbox', (state) => {
    expect(resolveExportReadyAlertPresentation(state, false)).toEqual({
      enabled: false,
      primaryLabel: 'Connect email to get notified',
      supportingText: 'Connect the inbox that receives your Uber emails, then SnackTrack can watch for the ready message.',
    });
  });
});
