import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { Surface } from '@components/ui/Surface';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useImportFileSession, type ImportFileSession } from '@hooks/useImportFileSession';
import { showSimpleAlert } from '@utils/platformAlert';
import type { ExportProvider, ImportJourneyContext, ImportOperation } from '@features/import-flow/contracts';

export const formatImportFileSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 })} KB` : `${(bytes / (1024 * 1024)).toLocaleString(undefined, { maximumFractionDigits: 2 })} MB`;

interface Props {
  provider?: ExportProvider;
  journeyContext?: ImportJourneyContext;
  session?: ImportFileSession;
  importBlocked?: boolean;
  buttonLabel?: string;
  autoOpenToken?: string | null;
  onAutoOpenConsumed?: () => void;
  onUploadSuccess?: (operation: ImportOperation) => void | Promise<void>;
  onUploadError?: (message: string) => void | Promise<void>;
}
export function ExportDataUpload(props: Props) {
  return props.session ? <UploadControl {...props} fileSession={props.session} /> : <LocalUpload {...props} />;
}
function LocalUpload(props: Props) {
  const session = useImportFileSession(props.provider ?? 'uber_eats', props.journeyContext ?? 'legacy', props.importBlocked);
  return <UploadControl {...props} fileSession={session} />;
}
function UploadControl({ provider = 'uber_eats', fileSession, buttonLabel, autoOpenToken, onAutoOpenConsumed, onUploadSuccess }: Props & { fileSession: ImportFileSession }) {
  const theme = useAppTheme();
  const handled = useRef<string | null>(null);
  const opened = useRef<string | null>(null);
  const chooseAndSubmit = fileSession.chooseAndSubmit;
  usePreventRemove(fileSession.isPending, () => showSimpleAlert('Keep SnackTrack open', 'Your file is being uploaded and submitted. You can leave this page once processing is accepted.'));
  useEffect(() => {
    if (!autoOpenToken || opened.current === autoOpenToken) return;
    opened.current = autoOpenToken; onAutoOpenConsumed?.(); void chooseAndSubmit();
  }, [autoOpenToken, chooseAndSubmit, onAutoOpenConsumed]);
  useEffect(() => {
    if (!fileSession.operation || fileSession.isPending || handled.current === fileSession.operation.id) return;
    handled.current = fileSession.operation.id; void onUploadSuccess?.(fileSession.operation);
  }, [fileSession.operation, fileSession.isPending, onUploadSuccess]);
  const name = provider === 'uber_eats' ? 'Uber Eats' : 'DoorDash';
  if (fileSession.isPending) return <Surface accessibilityLiveRegion="polite"><ActivityIndicator color={theme.colors.primary} /><AppText variant="surfaceTitle">{fileSession.progress < 1 ? 'Uploading your file' : 'Submitting your file'}</AppText><AppText>{fileSession.file?.name}</AppText><AppText tone="muted">{fileSession.progress < 1 ? `${Math.round(fileSession.progress * 100)}% uploaded. ` : ''}Keep SnackTrack open until processing is accepted.</AppText></Surface>;
  return <View style={{ gap: 14 }}>
    <AppText variant="surfaceBody" tone="muted">Original {name} ZIP up to 50 MB, or supported CSV up to 10 MB.</AppText>
    {fileSession.file ? <Surface>
      <AppText variant="sectionLabel">SELECTED FILE</AppText>
      <AppText variant="surfaceTitle" selectable>{fileSession.file.name}</AppText>
      <AppText variant="surfaceBody" tone="muted">{name} · {formatImportFileSize(fileSession.file.size)}</AppText>
      <AppText variant="surfaceBody">Matching orders may gain details without being added twice. Newer email orders outside this download’s history stay saved.</AppText>
    </Surface> : null}
    {fileSession.offline ? <AppText accessibilityLiveRegion="polite" tone="muted">{fileSession.file ? 'Your file is selected. Reconnect to the internet to import it.' : 'You can choose a file now. Reconnect to the internet before importing it.'}</AppText> : null}
    {fileSession.statusUnavailable ? <AppText tone="muted">Import status is unavailable. Reload status before submitting this file.</AppText> : fileSession.importBlocked ? <AppText tone="muted">Another import is processing. You can choose a file now and import it when that finishes.</AppText> : null}
    {fileSession.rateLimitNotice ? <Surface accessibilityLiveRegion="polite" style={{ backgroundColor: theme.colors.warningSurface, borderColor: theme.colors.warningDeep }}>
      <AppText variant="surfaceTitle" style={{ color: theme.colors.warningDeep }}>{fileSession.rateLimitNotice.title}</AppText>
      <AppText variant="surfaceBody" style={{ color: theme.colors.warningDeep }}>{fileSession.rateLimitNotice.message}</AppText>
    </Surface> : null}
    <AppButton label={fileSession.rateLimitNotice ? 'Come back tomorrow' : fileSession.file ? fileSession.error ? 'Try this file again' : 'Import this file' : buttonLabel ?? 'Choose ZIP and import'} pending={fileSession.choosing} disabled={Boolean(fileSession.rateLimitNotice || (fileSession.file && (fileSession.offline || fileSession.importBlocked || fileSession.statusUnavailable)))} onPress={() => void (fileSession.file ? fileSession.submit() : fileSession.chooseAndSubmit())} />
    {fileSession.file && !fileSession.rateLimitNotice ? <AppButton label="Choose another file" variant="secondary" disabled={fileSession.choosing} onPress={() => void fileSession.chooseAndSubmit()} /> : null}
  </View>;
}
export const UberDataUpload = ExportDataUpload;
export default ExportDataUpload;
