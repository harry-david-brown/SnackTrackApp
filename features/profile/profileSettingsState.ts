import type { ImportPreferencesResponse } from '@services/gmailApi';
import type { DataPlatform } from '@components/upload/UberDataTutorial';
import { resolveExportOpportunity, resolveImportCoverage, toDataPlatform } from '@features/import-flow/importJourneyState';
import { resolveProviderTutorialEntry, type ProviderTutorialJob } from '@features/import-flow/providerTutorialEntry';

export interface ProfileSettingsState {
  exportAlertsLabel: 'Checking...' | 'On' | 'Off' | 'Reconnect' | 'Not set';
  ongoingTrackingLabel: 'Checking...' | 'Setting up' | 'On' | 'Off' | 'Reconnect' | 'Needs attention' | 'Not set';
  providerExportLabel: string;
  tutorialMode: 'request' | 'download';
  tutorialPlatform?: DataPlatform;
  tutorialEntryJob?: ProviderTutorialJob;
  tutorialProviderStatuses: Record<DataPlatform, string>;
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
      case 'setting_up': return 'Setting up' as const;
      case 'active': return 'On' as const;
      case 'reconnect_required': return 'Reconnect' as const;
      case 'error': return 'Needs attention' as const;
      case 'paused':
      case 'declined': return 'Off' as const;
      default: return 'Not set' as const;
    }
  })();

  const coverage = resolveImportCoverage(preferences);
  const exportOpportunity = resolveExportOpportunity(coverage);
  const activeMaintenance = [coverage.providers.uberEats, coverage.providers.doorDash]
    .find((provider) => ['requested', 'file_ready', 'import_processing', 'failed'].includes(provider.status));
  const tutorialTarget = activeMaintenance ?? exportOpportunity;
  const exportStatus = tutorialTarget?.status;
  const tutorialEntry = resolveProviderTutorialEntry(exportStatus);
  const providerExportLabel = activeMaintenance
    ? `${activeMaintenance.name}: ${activeMaintenance.status === 'requested'
      ? 'update requested'
      : activeMaintenance.status === 'file_ready'
        ? 'ready'
        : activeMaintenance.status === 'import_processing'
          ? 'importing'
          : 'needs attention'}`
    : `${coverage.importedProviderCount} of 2 exports`;
  return {
    exportAlertsLabel,
    ongoingTrackingLabel,
    providerExportLabel: isLoading ? 'Checking...' : providerExportLabel,
    tutorialMode: tutorialEntry.mode,
    tutorialPlatform: tutorialTarget ? toDataPlatform(tutorialTarget.provider) : undefined,
    tutorialEntryJob: tutorialTarget ? tutorialEntry.job : undefined,
    tutorialProviderStatuses: {
      uber: coverage.providers.uberEats.status,
      doordash: coverage.providers.doorDash.status,
    },
  };
}
