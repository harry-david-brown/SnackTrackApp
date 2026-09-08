import { Ionicons } from '@expo/vector-icons';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Radius, type AppTheme } from '@constants/theme';
import { useMemo } from 'react';
import { useAppTheme } from '@contexts/AppearanceContext';
import type { ImportFlowState, ImportTaskState } from '@features/import-flow/importFlowResolver';
import type { ExportDownloadHandoffState } from '@utils/exportDownloadHandoff';
import {
  UBER_EXPORT_EMAIL_ACTION, UBER_EXPORT_EMAIL_ADDRESS,
  UBER_EXPORT_EMAIL_SENDER_NAME, UBER_EXPORT_EMAIL_SUBJECT,
} from '@utils/exportDownloadHandoff';
import { AppButton } from '@components/ui/AppButton';
import { ExportDataUpload } from './UberDataUpload';
import { ImportTaskCard, type ImportTaskId } from './ImportTaskCard';
import type { DataPlatform } from './UberDataTutorial';
import type { ImportOperation } from '@features/import-flow/contracts';

interface ExportImportTaskSectionProps {
  state: ImportTaskState;
  providerProgress: ImportFlowState['exportProviderProgress'];
  isOpen: boolean;
  fileReady: boolean;
  readyProvider?: 'uber_eats' | 'doordash' | null;
  exportRequested: boolean;
  downloadState: ExportDownloadHandoffState;
  autoOpenToken: string | null;
  onToggle: (id: ImportTaskId) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onOpenEmail: () => void;
  onDownloaded: () => void;
  onShowTutorial: () => void;
  onImportProvider: (platform: DataPlatform) => void;
  onAutoOpenConsumed: () => void;
  onUploadSuccess: (result: ImportOperation) => void | Promise<void>;
  onUploadError: (message: string) => void | Promise<void>;
}

export function ExportImportTaskSection(props: ExportImportTaskSectionProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const importComplete = props.state.complete;
  const hasImportedProvider = props.providerProgress.importedCount > 0;
  const importedProviderName = props.providerProgress.uberEats.imported ? 'Uber Eats' : 'DoorDash';
  const missingProviderName = props.providerProgress.uberEats.imported ? 'DoorDash' : 'Uber Eats';
  const importedPlatform: DataPlatform = props.providerProgress.uberEats.imported ? 'uber' : 'doordash';
  const missingPlatform: DataPlatform = props.providerProgress.uberEats.imported ? 'doordash' : 'uber';
  const missingProviderStatus = props.providerProgress.uberEats.imported
    ? props.providerProgress.doorDash.status
    : props.providerProgress.uberEats.status;
  const processingPlatform: DataPlatform | null = props.providerProgress.uberEats.status === 'import_processing'
    ? 'uber'
    : props.providerProgress.doorDash.status === 'import_processing' ? 'doordash' : null;
  const processingProviderName = processingPlatform === 'uber' ? 'Uber Eats' : 'DoorDash';
  const failedPlatform: DataPlatform | null = props.providerProgress.uberEats.status === 'failed'
    ? 'uber'
    : props.providerProgress.doorDash.status === 'failed' ? 'doordash' : null;
  const failedProviderName = failedPlatform === 'uber' ? 'Uber Eats' : 'DoorDash';
  const requestedPlatform: DataPlatform | null = props.providerProgress.uberEats.status === 'requested'
    ? 'uber'
    : props.providerProgress.doorDash.status === 'requested' ? 'doordash' : null;
  const requestedProviderName = requestedPlatform === 'uber' ? 'Uber Eats' : 'DoorDash';
  const readyProvider = props.readyProvider
    ?? (props.providerProgress.doorDash.status === 'file_ready' ? 'doordash' : 'uber_eats');
  const waitingForDownload = props.fileReady && props.downloadState !== 'downloaded';
  const readyToUpload = props.downloadState === 'downloaded';
  const readyProviderName = readyProvider === 'doordash' ? 'DoorDash' : 'Uber Eats';
  return (
    <View onLayout={props.onLayout}>
      <ImportTaskCard
        id="uber_export"
        title="Add delivery-app history"
        description="Import missing orders for deeper coverage and richer statistics."
        iconName="cloud-upload-outline"
        statusLabel={props.state.label}
        statusTone={props.state.tone}
        isComplete={props.state.complete}
        isOpen={props.isOpen}
        onPress={props.onToggle}
      >
        <Text style={styles.helper}>
          {readyToUpload
            ? 'Your delivery ZIP is downloaded. Choose it to finish importing your history.'
            : props.fileReady
              ? readyProvider === 'doordash'
                ? 'DoorDash says your data archive is ready. Download the ZIP from its email, then return here.'
                : 'Uber says your download is ready. Check the download deadline in Uber’s email.'
              : processingPlatform
                  ? `${processingProviderName} is being added to your SnackTrack history.`
                  : failedPlatform
                    ? `${failedProviderName} was not imported. Your existing SnackTrack history is unchanged.`
                  : requestedPlatform
                    ? `${requestedProviderName} is preparing a newer archive. Your existing imported history remains available.`
                : importComplete
                  ? 'Uber Eats and DoorDash history are both included in your SnackTrack stats.'
                : hasImportedProvider
                  ? `${importedProviderName} is included in your stats. Add ${missingProviderName} for more complete history.`
              : props.exportRequested
                ? 'Tell us where you are in the process and we’ll show you the right next step.'
                : 'Start with the guided request process. We’ll show you exactly what to do next.'}
        </Text>
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name={importComplete ? 'checkmark-circle-outline' : waitingForDownload ? 'mail-unread-outline' : readyToUpload ? 'cloud-upload-outline' : 'document-text-outline'} size={28} color={theme.colors.primary} />
            <View style={styles.headerText}>
              <Text style={styles.title}>
                {waitingForDownload
                  ? `Find ${readyProviderName}’s data-ready email`
                  : readyToUpload
                    ? 'Add your downloaded history'
                    : processingPlatform
                        ? `Importing ${processingProviderName}`
                        : failedPlatform
                          ? `${failedProviderName} import needs attention`
                        : requestedPlatform
                          ? `${requestedProviderName} update requested`
                      : importComplete
                        ? 'Your delivery history is complete'
                      : hasImportedProvider
                        ? 'One delivery app added'
                    : props.exportRequested ? 'Continue your data request' : 'Request your delivery data'}
              </Text>
              <Text style={styles.subtitle}>
                {waitingForDownload
                  ? readyProvider === 'doordash'
                    ? 'Open DoorDash’s ready message, tap “View Your Data Archive,” and save the original ZIP.'
                    : `Open the email below and tap “${UBER_EXPORT_EMAIL_ACTION}” to save the original ZIP.`
                  : readyToUpload
                    ? 'Choose the ZIP you downloaded. Keep the archive zipped.'
                    : processingPlatform
                        ? 'SnackTrack is processing this in the background. You can leave this screen.'
                        : failedPlatform
                          ? 'Try the archive again. Any previously imported receipts are still safe.'
                        : requestedPlatform
                          ? 'Keep an eye on your email. You can continue this provider’s guide whenever the newer archive is ready.'
                      : importComplete
                        ? 'Uber Eats and DoorDash are both included. Add a newer archive whenever you want to refresh your history.'
                      : hasImportedProvider
                        ? missingProviderStatus === 'failed'
                          ? `${missingProviderName} needs another attempt.`
                          : `${missingProviderName} is still available to import.`
                    : 'Answer a couple of quick questions and SnackTrack will take you to the right step.'}
              </Text>
            </View>
          </View>
          <View style={styles.providerList} accessible accessibilityLabel={`${props.providerProgress.importedCount} of 2 delivery-app history files added`}>
            <ProviderStatusRow name="Uber Eats" platform="uber" imported={props.providerProgress.uberEats.imported} status={props.providerProgress.uberEats.status} />
            <View style={styles.providerDivider} />
            <ProviderStatusRow name="DoorDash" platform="doordash" imported={props.providerProgress.doorDash.imported} status={props.providerProgress.doorDash.status} />
          </View>
          {waitingForDownload ? (
            <View style={styles.actionStack}>
              {readyProvider === 'uber_eats' ? (
                <View style={styles.emailCard} accessible accessibilityLabel={`Email from ${UBER_EXPORT_EMAIL_SENDER_NAME}, subject ${UBER_EXPORT_EMAIL_SUBJECT}, then tap ${UBER_EXPORT_EMAIL_ACTION}`}>
                  <EmailRow label="From" value={UBER_EXPORT_EMAIL_SENDER_NAME} detail={UBER_EXPORT_EMAIL_ADDRESS} />
                  <View style={styles.divider} />
                  <EmailRow label="Subject" value={UBER_EXPORT_EMAIL_SUBJECT} />
                  <View style={styles.divider} />
                  <EmailRow label="Tap" value={UBER_EXPORT_EMAIL_ACTION} />
                </View>
              ) : null}
              <AppButton label={readyProvider === 'doordash' ? 'Show DoorDash Download Instructions' : props.downloadState === 'checking_email' ? 'Review the Ready Message Again' : 'Find the Ready Message'} icon="mail-outline" onPress={props.onOpenEmail} />
              <AppButton label="I Already Downloaded It" variant="secondary" icon="checkmark-circle-outline" onPress={props.onDownloaded} />
              <Text style={styles.locationHint}>Downloaded it on a computer? Move the ZIP to Files, iCloud Drive, or Google Drive on this device first.</Text>
            </View>
          ) : readyToUpload ? (
            <>
              <ExportDataUpload
                provider={readyProvider}
                onUploadSuccess={props.onUploadSuccess}
                onUploadError={props.onUploadError}
                autoOpenToken={props.autoOpenToken}
                onAutoOpenConsumed={props.onAutoOpenConsumed}
              />
              {props.fileReady ? <AppButton label="Still need to download it? Review the steps" variant="secondary" icon="mail-outline" onPress={props.onOpenEmail} /> : null}
            </>
          ) : processingPlatform ? (
            <AppButton
              label={`Importing ${processingProviderName}…`}
              variant="secondary"
              icon="hourglass-outline"
              disabled
            />
          ) : failedPlatform ? (
            <AppButton
              label={`Try ${failedProviderName} Again`}
              icon="refresh-outline"
              onPress={() => props.onImportProvider(failedPlatform)}
            />
          ) : requestedPlatform ? (
            <AppButton
              label={`Continue ${requestedProviderName} Update`}
              icon="arrow-forward"
              onPress={() => props.onImportProvider(requestedPlatform)}
            />
          ) : importComplete ? (
            <AppButton
              label="Add Newer History"
              variant="secondary"
              icon="refresh-outline"
              onPress={props.onShowTutorial}
            />
          ) : hasImportedProvider ? (
            <View style={styles.actionStack}>
              <AppButton
                label={missingProviderStatus === 'failed' ? `Try ${missingProviderName} Again` : `Import ${missingProviderName}`}
                icon={missingProviderStatus === 'failed' ? 'refresh-outline' : 'add-circle-outline'}
                onPress={() => props.onImportProvider(missingPlatform)}
              />
              <AppButton label={`Add Newer ${importedProviderName} History`} variant="secondary" icon="refresh-outline" onPress={() => props.onImportProvider(importedPlatform)} />
            </View>
          ) : (
            <AppButton
              label={props.exportRequested ? 'Check What to Do Next' : 'Request Your Data'}
              icon="arrow-forward"
              onPress={props.onShowTutorial}
            />
          )}
          {!importComplete && (waitingForDownload || readyToUpload) ? (
            <AppButton label="Show Me the Full Guide" variant="secondary" icon="information-circle-outline" onPress={props.onShowTutorial} />
          ) : null}
        </View>
      </ImportTaskCard>
    </View>
  );
}

function ProviderStatusRow({
  name,
  platform,
  imported,
  status,
}: {
  name: string;
  platform: DataPlatform;
  imported: boolean;
  status: string;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const accent = platform === 'uber' ? theme.colors.uberDark : theme.colors.doorDash;
  const statusLabel = status === 'requested' ? imported ? 'Update requested' : 'Requested'
      : status === 'file_ready' ? 'Ready'
        : status === 'import_processing' ? 'Importing'
          : status === 'failed' ? 'Needs retry'
            : imported ? 'Imported' : 'Not imported';
  const statusComplete = imported && status === 'completed';
  return (
    <View style={styles.providerRow} accessibilityLabel={`${name}: ${statusLabel}`}>
      <View style={[styles.providerIcon, { backgroundColor: theme.colors.alpha(accent, 0.12) }]}>
        <Ionicons name={platform === 'uber' ? 'car-outline' : 'bag-handle-outline'} size={20} color={accent} />
      </View>
      <Text style={styles.providerName}>{name}</Text>
      <View style={[styles.providerStatus, statusComplete ? styles.providerStatusImported : styles.providerStatusPending]}>
        <Ionicons
          name={statusComplete ? 'checkmark-circle' : 'ellipse-outline'}
          size={15}
          color={statusComplete ? theme.colors.successDark : theme.colors.textSecondary}
        />
        <Text style={[styles.providerStatusText, statusComplete && styles.providerStatusTextImported]}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

function EmailRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.emailRow}><Text style={styles.emailLabel}>{label}</Text><View style={styles.emailValueColumn}><Text style={styles.emailValue}>{value}</Text>{detail ? <Text style={styles.emailDetail}>{detail}</Text> : null}</View></View>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  helper: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19, marginTop: 12 },
  content: { marginTop: 14, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1, marginLeft: 12 },
  title: { fontSize: 18, fontWeight: '500', color: theme.colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  actionStack: { gap: 12 },
  providerList: { borderWidth: 1, borderColor: theme.colors.slate200, borderRadius: Radius.input, backgroundColor: theme.colors.slateFrost },
  providerRow: { minHeight: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  providerDivider: { height: 1, marginHorizontal: 12, backgroundColor: theme.colors.slate200 },
  providerIcon: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  providerName: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary },
  providerStatus: { minHeight: 28, paddingHorizontal: 8, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', gap: 4 },
  providerStatusImported: { backgroundColor: theme.colors.successSurfaceCool },
  providerStatusPending: { backgroundColor: theme.colors.slate50 },
  providerStatusText: { fontSize: 11, fontWeight: '500', color: theme.colors.textSecondary },
  providerStatusTextImported: { color: theme.colors.successDark },
  emailCard: { padding: 14, borderWidth: 1, borderColor: theme.colors.slate200, borderRadius: Radius.input, backgroundColor: theme.colors.slate50 },
  emailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  emailLabel: { width: 58, paddingTop: 1, fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  emailValueColumn: { flex: 1 },
  emailValue: { fontSize: 14, lineHeight: 19, fontWeight: '500', color: theme.colors.textPrimary },
  emailDetail: { marginTop: 2, fontSize: 12, color: theme.colors.textSecondary },
  divider: { height: 1, marginVertical: 11, backgroundColor: theme.colors.slate200 },
  locationHint: { fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary },
});
