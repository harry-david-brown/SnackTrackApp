import type { Href } from 'expo-router';
import type { ExportProvider } from '@features/import-flow/contracts';
import type { ImportReturnTo } from '@features/import-flow/importNavigation';
import type { PostOnboardingImportIntent } from '@features/import-flow/postOnboardingImportRoute';
import type { GmailConnectionPurpose } from '@features/import-flow/gmailConnectionPurpose';

export type AppDestination = Href;

export const appDestinations = {
  entry: '/' as const,
  login: '/login' as const,
  home: '/(tabs)' as const,
  history: '/(tabs)/history' as const,
  summary: '/(tabs)/wrapped-journey' as const,
  profile: '/(tabs)/profile' as const,
  dataSetup: '/data-setup' as const,
  accountsPermissions: '/settings/accounts-permissions' as const,
  appearance: '/settings/appearance' as const,
  currency: '/settings/currency' as const,
  helpPrivacy: '/settings/help-privacy' as const,
} satisfies Record<string, AppDestination>;

export interface AddHistoryDestinationOptions {
  readonly intent?: PostOnboardingImportIntent;
  readonly returnTo?: ImportReturnTo;
  readonly provider?: ExportProvider | null;
  readonly mailbox?: 'gmail' | 'outlook' | null;
  readonly operationId?: string | null;
  readonly journeyContext?: 'onboarding' | 'post_onboarding';
  readonly downloadedVersion?: string | null;
  readonly confirmRequest?: boolean;
  readonly showDownloadSteps?: boolean;
  readonly gmailPurpose?: GmailConnectionPurpose | null;
}

export const addHistoryDestination = ({
  intent = 'choose',
  returnTo = 'home',
  provider,
  mailbox,
  operationId,
  journeyContext,
  downloadedVersion,
  confirmRequest,
  showDownloadSteps,
  gmailPurpose,
}: AddHistoryDestinationOptions = {}): AppDestination => ({
  pathname: '/add-history',
  params: {
    intent,
    returnTo,
    ...(provider ? { provider } : {}),
    ...(mailbox ? { mailbox } : {}),
    ...(operationId ? { operationId } : {}),
    ...(journeyContext ? { journeyContext } : {}),
    ...(downloadedVersion ? { downloadedVersion } : {}),
    ...(confirmRequest ? { confirmRequest: 'true' } : {}),
    ...(showDownloadSteps ? { showDownloadSteps: 'true' } : {}),
    ...(gmailPurpose ? { gmailPurpose } : {}),
  },
});

export const importProgressDestination = (
  operationId: string,
  returnTo: ImportReturnTo = 'home',
): AppDestination => ({ pathname: '/import-progress', params: { operationId, returnTo } });

export const importResultDestination = (
  operationId: string,
  returnTo: ImportReturnTo = 'home',
): AppDestination => ({ pathname: '/import-result', params: { operationId, returnTo } });

export const accountsPermissionsDestination = (
  returnTo?: ImportReturnTo,
  mailbox?: 'gmail' | 'outlook',
): AppDestination => ({
  pathname: '/settings/accounts-permissions',
  params: {
    ...(returnTo ? { returnTo } : {}),
    ...(mailbox ? { mailbox } : {}),
  },
});

export const insightHistoryDestination = (
  insightId: string,
  localDate: string,
  label: string,
  snapshotId?: string,
): AppDestination => ({
  pathname: '/(tabs)/history',
  params: { insightId, insightDate: localDate, insightLabel: label, ...(snapshotId ? { insightSnapshot: snapshotId } : {}) },
});
