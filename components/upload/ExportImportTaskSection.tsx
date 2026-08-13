import { Ionicons } from '@expo/vector-icons';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../../constants/theme';
import type { ImportTaskState } from '../../features/import-flow/importFlowResolver';
import type { ExportDownloadHandoffState } from '../../utils/exportDownloadHandoff';
import {
  UBER_EXPORT_DOWNLOAD_EXPIRY_DAYS, UBER_EXPORT_EMAIL_ACTION, UBER_EXPORT_EMAIL_ADDRESS,
  UBER_EXPORT_EMAIL_SENDER_NAME, UBER_EXPORT_EMAIL_SUBJECT,
} from '../../utils/exportDownloadHandoff';
import { AppButton } from '../ui/AppButton';
import { UberDataUpload } from './UberDataUpload';
import { ImportTaskCard, type ImportTaskId } from './ImportTaskCard';

interface ExportImportTaskSectionProps {
  state: ImportTaskState;
  isOpen: boolean;
  fileReady: boolean;
  downloadState: ExportDownloadHandoffState;
  showDownloadGuide: boolean;
  autoOpenToken: string | null;
  onToggle: (id: ImportTaskId) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onOpenEmail: () => void;
  onDownloaded: () => void;
  onShowTutorial: () => void;
  onAutoOpenConsumed: () => void;
  onUploadSuccess: (receiptsCount: number) => void;
  onUploadError: (message: string) => void;
}

export function ExportImportTaskSection(props: ExportImportTaskSectionProps) {
  const waitingForDownload = props.fileReady && props.downloadState !== 'downloaded';
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
          {props.fileReady
            ? props.downloadState === 'downloaded'
              ? 'You said the Uber ZIP is downloaded. Choose it to finish importing your history.'
              : `Uber says your export is ready. Its download link is available for ${UBER_EXPORT_DOWNLOAD_EXPIRY_DAYS} days.`
            : 'Already have a delivery data export? Upload it here.'}
        </Text>
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name={waitingForDownload ? 'mail-unread-outline' : 'cloud-upload-outline'} size={28} color={Colors.primary} />
            <View style={styles.headerText}>
              <Text style={styles.title}>{waitingForDownload ? 'Find Uber’s data-ready email' : props.fileReady ? 'Upload your Uber export' : 'Have an export file?'}</Text>
              <Text style={styles.subtitle}>
                {waitingForDownload
                  ? `Open the email below and tap “${UBER_EXPORT_EMAIL_ACTION}” to save the original ZIP.`
                  : 'Upload it now, or use the in-app guide if you need help with the next step.'}
              </Text>
            </View>
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
          ) : (
            <>
              <UberDataUpload
                onUploadSuccess={props.onUploadSuccess}
                onUploadError={props.onUploadError}
                autoOpenToken={props.autoOpenToken}
                onAutoOpenConsumed={props.onAutoOpenConsumed}
              />
              {props.fileReady ? <AppButton label="Still need to download it? Open Gmail" variant="secondary" icon="mail-outline" onPress={props.onOpenEmail} /> : null}
            </>
          )}
          <AppButton
            label={props.showDownloadGuide ? 'How to download and upload it' : 'How to request your data'}
            variant="secondary"
            icon="information-circle-outline"
            onPress={props.onShowTutorial}
          />
        </View>
      </ImportTaskCard>
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
  emailCard: { padding: 14, borderWidth: 1, borderColor: Colors.slate200, borderRadius: Radius.input, backgroundColor: Colors.slate50 },
  emailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  emailLabel: { width: 58, paddingTop: 1, fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  emailValueColumn: { flex: 1 },
  emailValue: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: Colors.textPrimary },
  emailDetail: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
  divider: { height: 1, marginVertical: 11, backgroundColor: Colors.slate200 },
  locationHint: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
});
