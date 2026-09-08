import type { EffectiveMonitoringState } from './contracts';

export interface ExportReadyAlertPresentation {
  enabled: boolean;
  primaryLabel: string;
  supportingText: string;
}

export function resolveExportReadyAlertPresentation(
  effectiveState: EffectiveMonitoringState | undefined,
  canMonitor: boolean,
): ExportReadyAlertPresentation {
  if (effectiveState === 'enabled') {
    return {
      enabled: true,
      primaryLabel: 'Continue using SnackTrack',
      supportingText: 'We’ll let you know when Uber’s ready email arrives. SnackTrack checks while the app is open.',
    };
  }

  if (effectiveState === 'reconnect_required') {
    return {
      enabled: false,
      primaryLabel: 'Reconnect email to get notified',
      supportingText: 'Reconnect the inbox that receives your Uber emails, then SnackTrack can watch for the ready message.',
    };
  }

  if (!canMonitor) {
    return {
      enabled: false,
      primaryLabel: 'Connect email to get notified',
      supportingText: 'Connect the inbox that receives your Uber emails, then SnackTrack can watch for the ready message.',
    };
  }

  return {
    enabled: false,
    primaryLabel: 'Notify me when it’s ready',
    supportingText: 'SnackTrack will check your connected inbox while the app is open and tell you when Uber’s ready email arrives.',
  };
}
