import type { ImportPreferencesResponse } from '@services/gmailApi';

export interface ProfileSettingsState {
  exportAlertsLabel: 'Checking...' | 'On' | 'Off' | 'Reconnect' | 'Not set';
  ongoingTrackingLabel: 'Checking...' | 'On' | 'Off' | 'Reconnect' | 'Needs attention' | 'Not set';
  tutorialMode: 'request' | 'download';
}

export function resolveProfileSettingsState(
  preferences: ImportPreferencesResponse | null,
  isLoading: boolean,
): ProfileSettingsState {
  const exportAlertsLabel = (() => {
    if (isLoading) return 'Checking...' as const;
    switch (preferences?.monitoring.effectiveState) {
      case 'enabled': return 'On' as const;
      case 'reconnect_required': return 'Reconnect' as const;
      case 'declined':
      case 'disabled': return 'Off' as const;
      default: return 'Not set' as const;
    }
  })();

  const ongoingTrackingLabel = (() => {
    if (isLoading) return 'Checking...' as const;
    switch (preferences?.ongoingTracking.effectiveState) {
      case 'active': return 'On' as const;
      case 'reconnect_required': return 'Reconnect' as const;
      case 'error': return 'Needs attention' as const;
      case 'paused':
      case 'declined': return 'Off' as const;
      default: return 'Not set' as const;
    }
  })();

  const exportStatus = preferences?.export.status;
  return {
    exportAlertsLabel,
    ongoingTrackingLabel,
    tutorialMode: exportStatus && !['not_started', 'completed'].includes(exportStatus)
      ? 'download'
      : 'request',
  };
}
