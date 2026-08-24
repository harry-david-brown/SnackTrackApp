import { Ionicons } from '@expo/vector-icons';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '@constants/theme';
import type { ImportFlowState, ImportTaskState } from '@features/import-flow/importFlowResolver';
import type { ExportDownloadHandoffState } from '@utils/exportDownloadHandoff';
import {
  UBER_EXPORT_DOWNLOAD_EXPIRY_DAYS, UBER_EXPORT_EMAIL_ACTION, UBER_EXPORT_EMAIL_ADDRESS,
  UBER_EXPORT_EMAIL_SENDER_NAME, UBER_EXPORT_EMAIL_SUBJECT,
} from '@utils/exportDownloadHandoff';
import { AppButton } from '@components/ui/AppButton';
import { UberDataUpload } from './UberDataUpload';
import { ImportTaskCard, type ImportTaskId } from './ImportTaskCard';
import type { DataPlatform } from './UberDataTutorial';
import type { CSVImportResponse } from '@/types/api';

interface ExportImportTaskSectionProps {
  state: ImportTaskState;
  providerProgress: ImportFlowState['exportProviderProgress'];
  isOpen: boolean;
  fileReady: boolean;
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
  onUploadSuccess: (result: CSVImportResponse) => void;
  onUploadError: (message: string) => void;
}

export function ExportImportTaskSection(props: ExportImportTaskSectionProps) {
  const importComplete = props.state.complete;
  const hasImportedProvider = props.providerProgress.importedCount > 0;
  const importedProviderName = props.providerProgress.uberEats.imported ? 'Uber Eats' : 'DoorDash';
  const missingProviderName = props.providerProgress.uberEats.imported ? 'DoorDash' : 'Uber Eats';
  const importedPlatform: DataPlatform = props.providerProgress.uberEats.imported ? 'uber' : 'doordash';
  const missingPlatform: DataPlatform = props.providerProgress.uberEats.imported ? 'doordash' : 'uber';
  const waitingForDownload = props.fileReady && props.downloadState !== 'downloaded';
  const readyToUpload = props.downloadState === 'downloaded';
  return (
    <View onLayout={props.onLayout}>
      <ImportTaskCard
        id="uber_export"
        title="Import a data export"
        description="Optional: upload an Uber Eats or DoorDash export to expand your history."
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
              ? `Uber says your export is ready. Its download link is available for ${UBER_EXPORT_DOWNLOAD_EXPIRY_DAYS} days.`
              : importComplete
                ? 'Uber Eats and DoorDash export history are both included in your SnackTrack stats.'
                : hasImportedProvider
                  ? `${importedProviderName} is included in your stats. Add ${missingProviderName} for more complete history.`
              : props.exportRequested
                ? 'Tell us where you are in the process and we’ll show you the right next step.'
                : 'Start with the guided request process. We’ll show you exactly what to do next.'}
        </Text>
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name={importComplete ? 'checkmark-circle-outline' : waitingForDownload ? 'mail-unread-outline' : readyToUpload ? 'cloud-upload-outline' : 'document-text-outline'} size={28} color={Colors.primary} />
            <View style={styles.headerText}>
              <Text style={styles.title}>
                {waitingForDownload
                  ? 'Find Uber’s data-ready email'
                  : readyToUpload
                    ? 'Upload your export'
                    : importComplete
                      ? 'All exports imported'
                      : hasImportedProvider
                        ? 'One export imported'
                    : props.exportRequested ? 'Continue your data request' : 'Request your delivery data'}
              </Text>
              <Text style={styles.subtitle}>
                {waitingForDownload
                  ? `Open the email below and tap “${UBER_EXPORT_EMAIL_ACTION}” to save the original ZIP.`
                  : readyToUpload
                    ? 'Choose the ZIP you downloaded. Keep the archive zipped.'
                    : importComplete
                      ? 'You can update either provider whenever you download a newer archive.'
                      : hasImportedProvider
                        ? `${missingProviderName} is still available to import.`
                    : 'Answer a couple of quick questions and SnackTrack will take you to the right step.'}
              </Text>
            </View>
          </View>
          <View style={styles.providerList} accessible accessibilityLabel={`${props.providerProgress.importedCount} of 2 delivery exports imported`}>
            <ProviderStatusRow name="Uber Eats" platform="uber" imported={props.providerProgress.uberEats.imported} status={props.providerProgress.uberEats.status} />
            <View style={styles.providerDivider} />
            <ProviderStatusRow name="DoorDash" platform="doordash" imported={props.providerProgress.doorDash.imported} status={props.providerProgress.doorDash.status} />
          </View>
          {waitingForDownload ? (
            <View style={styles.actionStack}>
              <View style={styles.emailCard} accessible accessibilityLabel={`Email from ${UBER_EXPORT_EMAIL_SENDER_NAME}, subject ${UBER_EXPORT_EMAIL_SUBJECT}, then tap ${UBER_EXPORT_EMAIL_ACTION}`}>
                <EmailRow label="From" value={UBER_EXPORT_EMAIL_SENDER_NAME} detail={UBER_EXPORT_EMAIL_ADDRESS} />
                <View style={styles.divider} />
                <EmailRow label="Subject" value={UBER_EXPORT_EMAIL_SUBJECT} />
                <View style={styles.divider} />
                <EmailRow label="Tap" value={UBER_EXPORT_EMAIL_ACTION} />
              </View>
              <AppButton label={props.downloadState === 'checking_email' ? 'Open Gmail Again' : 'Open Gmail and Find This Email'} icon="mail-outline" onPress={props.onOpenEmail} />
              <AppButton label="I Already Downloaded It" variant="secondary" icon="checkmark-circle-outline" onPress={props.onDownloaded} />
              <Text style={styles.locationHint}>Downloaded it on a computer? Move the ZIP to Files, iCloud Drive, or Google Drive on this device first.</Text>
            </View>
          ) : readyToUpload ? (
            <>
              <UberDataUpload
                onUploadSuccess={props.onUploadSuccess}
                onUploadError={props.onUploadError}
                autoOpenToken={props.autoOpenToken}
                onAutoOpenConsumed={props.onAutoOpenConsumed}
              />
              {props.fileReady ? <AppButton label="Still need to download it? Open Gmail" variant="secondary" icon="mail-outline" onPress={props.onOpenEmail} /> : null}
            </>
          ) : importComplete ? (
            <View style={styles.actionStack}>
              <AppButton label="Update Uber Eats" icon="refresh-outline" onPress={() => props.onImportProvider('uber')} />
              <AppButton label="Update DoorDash" variant="secondary" icon="refresh-outline" onPress={() => props.onImportProvider('doordash')} />
            </View>
          ) : hasImportedProvider ? (
            <View style={styles.actionStack}>
              <AppButton label={`Import ${missingProviderName}`} icon="add-circle-outline" onPress={() => props.onImportProvider(missingPlatform)} />
              <AppButton label={`Update ${importedProviderName}`} variant="secondary" icon="refresh-outline" onPress={() => props.onImportProvider(importedPlatform)} />
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
  const accent = platform === 'uber' ? Colors.uberDark : Colors.doorDash;
  const statusLabel = imported
    ? 'Imported'
    : status === 'requested' ? 'Requested'
      : status === 'file_ready' ? 'Ready'
        : status === 'import_processing' ? 'Importing'
          : status === 'failed' ? 'Needs retry'
            : 'Not imported';
  return (
    <View style={styles.providerRow} accessibilityLabel={`${name}: ${statusLabel}`}>
      <View style={[styles.providerIcon, { backgroundColor: Colors.alpha(accent, 0.12) }]}>
        <Ionicons name={platform === 'uber' ? 'car-outline' : 'bag-handle-outline'} size={20} color={accent} />
      </View>
      <Text style={styles.providerName}>{name}</Text>
      <View style={[styles.providerStatus, imported ? styles.providerStatusImported : styles.providerStatusPending]}>
        <Ionicons
          name={imported ? 'checkmark-circle' : 'ellipse-outline'}
          size={15}
          color={imported ? Colors.successDark : Colors.textSecondary}
        />
        <Text style={[styles.providerStatusText, imported && styles.providerStatusTextImported]}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

function EmailRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <View style={styles.emailRow}><Text style={styles.emailLabel}>{label}</Text><View style={styles.emailValueColumn}><Text style={styles.emailValue}>{value}</Text>{detail ? <Text style={styles.emailDetail}>{detail}</Text> : null}</View></View>;
}

const styles = StyleSheet.create({
  helper: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: 12 },
  content: { marginTop: 14, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1, marginLeft: 12 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  actionStack: { gap: 12 },
  providerList: { borderWidth: 1, borderColor: Colors.slate200, borderRadius: Radius.input, backgroundColor: Colors.slateFrost },
  providerRow: { minHeight: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  providerDivider: { height: 1, marginHorizontal: 12, backgroundColor: Colors.slate200 },
  providerIcon: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  providerName: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  providerStatus: { minHeight: 28, paddingHorizontal: 8, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', gap: 4 },
  providerStatusImported: { backgroundColor: Colors.successSurfaceCool },
  providerStatusPending: { backgroundColor: Colors.slate50 },
  providerStatusText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  providerStatusTextImported: { color: Colors.successDark },
  emailCard: { padding: 14, borderWidth: 1, borderColor: Colors.slate200, borderRadius: Radius.input, backgroundColor: Colors.slate50 },
  emailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  emailLabel: { width: 58, paddingTop: 1, fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  emailValueColumn: { flex: 1 },
  emailValue: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: Colors.textPrimary },
  emailDetail: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
  divider: { height: 1, marginVertical: 11, backgroundColor: Colors.slate200 },
  locationHint: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
});
