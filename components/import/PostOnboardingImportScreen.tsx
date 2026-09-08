import { EmailImportReview } from './EmailImportReview';
import { providerPreparationCopy, DOWNLOAD_EXPIRY_HELP } from '@features/import-flow/importNavigation';
import { hasMailboxBaseline } from '@features/import-flow/emailImportPresentation';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';
import { Surface } from '@components/ui/Surface';
import { ExportDataUpload } from '@components/upload/UberDataUpload';
import UberDataTutorial, { ProviderRequestConfirmation } from '@components/upload/UberDataTutorial';
import { useAppTheme } from '@contexts/AppearanceContext';
import { UBER_EXPORT_EMAIL_SUBJECT } from '@utils/exportDownloadHandoff';
import { DOWNLOAD_QUESTION_PRIMARY } from '@features/import-flow/postOnboardingImportJourney';
import { resolveImportCoverage } from '@features/import-flow/importJourneyState';
import type { PostOnboardingImportRoute } from '@features/import-flow/postOnboardingImportRoute';
import { usePostOnboardingImportController } from '@hooks/usePostOnboardingImportController';

export function PostOnboardingImportScreen({ route }: { route: PostOnboardingImportRoute }) {
  const theme = useAppTheme();
  const c = usePostOnboardingImportController(route);
  const s = c.state;
  const provider = 'provider' in s && typeof s.provider === 'object' ? s.provider : null;
  const shortName = provider?.provider === 'uber_eats' ? 'Uber' : 'DoorDash';
  const providers = resolveImportCoverage(c.importPreferences).providers;
  const status = provider?.provider === 'uber_eats' ? c.importPreferences?.export.providers.uberEats : c.importPreferences?.export.providers.doorDash;
  if (s.kind === 'email_settings') return <Redirect href={{ pathname: "/settings/accounts-permissions", params: { mailbox: c.selection.mailbox ?? undefined, returnTo: c.returnTo } }} />;
  if (s.kind === 'operation') return <Redirect href={{ pathname: ['awaiting_upload', 'pending_dispatch', 'queued', 'running', 'retrying'].includes(s.operation.status) ? '/import-progress' : '/import-result', params: { operationId: s.operation.id, returnTo: c.returnTo } }} />;
  if (c.showTutorial) return <UberDataTutorial mode={c.tutorialEntryJob === 'download' ? 'download' : 'request'} initialPlatform={c.tutorialPlatform} entryJob={c.tutorialEntryJob} skipRequestOverview returnToParentOnBack providerStatuses={{ uber: c.flow.exportProviderProgress.uberEats.status, doordash: c.flow.exportProviderProgress.doorDash.status }} onOpenRequest={c.openProviderRequestPage} onRequestNotSubmitted={c.requestNotSubmitted} onRequestConfirmed={c.completeTutorial} onStillWaiting={c.completeTutorial} onArchiveDownloaded={c.finishDownloadGuide} onReadyConfirmed={c.tutorialReadyConfirmed} onClose={c.closeTutorial} />;
  if (s.kind === 'confirm_request') return <ProviderRequestConfirmation platform={s.provider.provider === 'uber_eats' ? 'uber' : 'doordash'} pending={c.requestSaving} onBack={c.goBack} onConfirm={() => { void c.completeTutorial(s.provider.provider === 'uber_eats' ? 'uber' : 'doordash'); }} onShowSteps={c.abandonPendingRequest} showStepsLabel="No, show the steps again" />;
  const coverageDates = (p: 'uber_eats' | 'doordash') => {
    const coverage = p === 'uber_eats' ? c.importPreferences?.coverage.exportProviders.uberEats : c.importPreferences?.coverage.exportProviders.doorDash;
    const date = (value?: string | null) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString() : null;
    const earliest = date(coverage?.earliestOrderDate);
    const latest = date(coverage?.latestOrderDate);
    return earliest && latest ? ` · Orders dated ${earliest} – ${latest}` : earliest ? ` · Orders from ${earliest}` : latest ? ` · Latest order ${latest}` : '';
  };
  const title = (heading: string, body: string, eyebrow = 'ADD ORDERS') => <PageHeader eyebrow={eyebrow} title={heading} body={body} />;
  const btn = (label: string, onPress: () => void, secondary = false) => <AppButton label={label} variant={secondary ? 'secondary' : 'primary'} onPress={onPress} />;
  const content = (() => {
    switch (s.kind) {
      case 'loading': return <><ActivityIndicator color={theme.colors.primary} />{title('Loading your import options', 'Your saved history is still available.')}</>;
      case 'temporary_outage': return <>{title('We can’t load import status', 'Your saved history is available. Try loading the status before starting the same import again.')}{btn('Try again', c.refreshStatus)}{btn('View order history', () => router.replace('/(tabs)/history'), true)}</>;
      case 'missing_operation': return <>{title('This import link is unavailable', 'It may be an old link. Your existing orders are still available.')}{btn('Add orders', () => router.replace({ pathname: '/add-history', params: { returnTo: c.returnTo } }))}</>;
      case 'choose_method': return <>
        {title('Which orders would you like to add?', 'Add your full available delivery history, including details email receipts may miss.')}
        {c.activeImportUnavailable ? <Surface><Choice icon="cloud-offline-outline" title="Import status is unavailable" body="We can’t confirm the latest progress. Reload before starting another import." onPress={c.refreshStatus} /></Surface> : null}
        {c.activeImportOperation ? <Surface><Choice icon="time-outline" title={c.activeImportUnavailable ? 'Last known import' : c.activeImportOperation.status === 'awaiting_upload' ? 'Finish your file upload' : c.importBlocked ? 'Your import is in progress' : 'Your latest import'} body="View its status without losing access to other sources." onPress={c.viewOperation} /></Surface> : null}
        {(['uber_eats', 'doordash'] as const).filter(p => c.pendingRequests[p]).map(p => <Surface key={`pending-${p}`}><Choice icon="open-outline" title={`Continue your ${p === 'uber_eats' ? 'Uber' : 'DoorDash'} request`} body="You opened the request page. Confirm whether the delivery service accepted it." onPress={() => c.resumeProviderJourney(p)} /></Surface>)}
        {[providers.uberEats, providers.doorDash].filter(p => !c.pendingRequests[p.provider] && ['requested', 'file_ready', 'failed', 'import_processing'].includes(p.status)).map(p => <Surface key={p.provider}><Choice icon="bookmark-outline" title={`Continue with ${p.name}`} body={p.status === 'requested' ? 'Request saved · Waiting for the ready message' : p.status === 'file_ready' ? 'Your download is ready' : p.status === 'failed' ? 'The last import needs another try' : 'History is being processed'} onPress={() => c.resumeProviderJourney(p.provider)} /></Surface>)}
        <Surface>{s.providers.map(p => <Choice key={p.provider} icon={p.provider === 'uber_eats' ? 'car-outline' : 'bag-handle-outline'} title={p.name} body={p.imported ? `${p.receiptCount} imported orders${coverageDates(p.provider)} · You can add a newer file` : 'Full available history, including recent orders'} onPress={() => c.chooseProvider(p.provider)} />)}</Surface>
        {!c.importPreferences?.gmailBaseline.hasCompleted && !c.importPreferences?.outlookBaseline.hasCompleted ? <AppButton label="Connect email for automatic updates" variant="secondary" onPress={c.chooseEmail} /> : null}
        <AppButton label="Accounts & automatic updates" variant="tertiary" onPress={() => router.push({ pathname: '/settings/accounts-permissions', params: { returnTo: c.returnTo } })} />
      </>;
      case 'provider_intro': return <>
        {title(`Do you already have your ${shortName} data download?`, `This is the file ${shortName} prepares when you request a copy of your account history.`, s.provider.name.toUpperCase())}
        <AppText variant="eyebrow" tone="brand">{DOWNLOAD_QUESTION_PRIMARY.recommendation}</AppText>
        {btn(DOWNLOAD_QUESTION_PRIMARY.label, c.requestHistory)}
        {btn('Yes, I have the file', () => c.chooseDownloadedFile(s.provider.provider), true)}
        {btn('I already requested it', () => c.setStep('resume'), true)}
        {s.provider.imported ? <Note text={`${s.provider.receiptCount} orders from ${s.provider.name} history files are already saved. You can still upload a newer download.`} /> : null}
      </>;
      case 'email_choice': return <>{title('Which inbox gets your receipts?', 'Choose Gmail or Outlook. You’ll review the connected address before importing.')}<Surface>{(['gmail', 'outlook'] as const).map(p => { const connection = p === 'gmail' ? c.importPreferences?.gmailConnection : c.importPreferences?.outlookConnection; return <Choice key={p} icon="mail-outline" title={p === 'gmail' ? 'Gmail' : 'Outlook'} body={`${connection?.email ?? 'Not connected'}${connection?.connectionHealth === 'reconnect_required' ? ' · Reconnect needed' : connection?.connectionHealth === 'unavailable' ? ' · Temporarily unavailable' : ''}`} onPress={() => c.chooseMailbox(p)} />; })}</Surface><Note text={c.emailUpdates.description} />{btn('Get delivery history instead', c.requestHistory, true)}</>;
      case 'email_review': {
        const baseline = c.importPreferences ? hasMailboxBaseline(c.importPreferences, s.provider) : false;
        const name = s.provider === 'gmail' ? 'Gmail' : 'Outlook';
        const canStartImport = s.connected && !s.reconnect && !s.temporarilyUnavailable && !baseline;
        return <>
          {route.connectionFailed ? <Note text="The connection wasn’t completed. You can try the selected service again. Your saved orders are still available." /> : null}
          {title(s.temporarilyUnavailable ? `${name} is temporarily unavailable` : s.reconnect ? `Reconnect ${name}` : s.connected ? baseline ? `${name} is connected` : 'Ready to find your orders?' : `Connect ${name}`, s.email ?? 'Choose your account on the email service’s secure sign-in page.')}
          {!baseline ? <EmailImportReview automaticUpdatesDescription={c.emailUpdates.description} /> : <Note text="Your receipt history is already saved. Manage automatic updates in Settings." />}
          {canStartImport && c.activeImportUnavailable ? <AppButton label="Reload import status" variant="secondary" onPress={c.refreshStatus} /> : null}
          {canStartImport && c.importBlocked ? <Note text={c.activeImportOperation?.status === 'awaiting_upload' ? 'An unfinished file upload is saved. Finish it from Add orders before importing this inbox’s history. You can still connect or repair an inbox.' : 'Another import is processing. You can import this inbox’s history when it finishes.'} /> : null}
          <AppButton label={s.temporarilyUnavailable ? 'Reload connection' : s.reconnect ? `Reconnect ${name}` : !s.connected ? `Connect ${name}` : baseline ? `Manage ${name}` : c.emailUpdates.label} pending={c.connectionBusy} disabled={canStartImport && (c.importBlocked || c.activeImportUnavailable)} onPress={c.startEmail} />
          {btn('Choose email service', c.chooseEmail, true)}
        </>;
      }
      case 'request': return <><Phase current={0} />{title(`Request your ${shortName} history`, `A data download contains your full available order history, including recent orders and details email may miss. ${providerPreparationCopy(s.provider.provider)}`)}<Surface><Choice icon="open-outline" title="1. Request your data" body={`Sign in on ${shortName}’s official page and submit your request.`} /><Choice icon="mail-outline" title="2. Wait for the ready message" body={`${shortName} will send instructions for downloading your history.`} /><Choice icon="cloud-upload-outline" title="3. Bring the file to SnackTrack" body="Save the ZIP, then choose it here." /></Surface>{btn(`Open ${shortName} request page`, () => { void c.openRequestPage(); })}{btn('Show step-by-step help', () => c.openProviderGuide(), true)}<AppButton label="I already requested or downloaded it" variant="tertiary" onPress={() => c.setStep('resume')} /></>;

      case 'resume': return <>{title('Where did you leave off?', `Continue your ${shortName} download from the step you need.`)}<Surface><Choice icon="time-outline" disabled={c.requestSaving} title={c.requestSaving ? "Saving your request…" : "I’m waiting for the ready message"} body="I submitted the request, but haven’t received the download instructions." onPress={() => { void c.completeTutorial(s.provider.provider === 'uber_eats' ? 'uber' : 'doordash'); }} /><Choice icon="mail-open-outline" title="My download is ready" body="Help me download the file." onPress={() => c.confirmProviderReady()} /><Choice icon="folder-open-outline" title="I saved the file" body="Choose it and review before importing." onPress={() => c.chooseDownloadedFile()} /></Surface>{btn('I haven’t requested it yet', () => c.setStep('request'), true)}</>;
      case 'provider_waiting': return <>
        {title(`${shortName} is preparing your data`, `${providerPreparationCopy(s.provider.provider)} There’s nothing else you need to do in SnackTrack right now.`, 'REQUEST SUBMITTED')}
        <Surface>
          <AppText variant="surfaceTitle">Keep an eye on your email</AppText>
          <AppText variant="surfaceBody" tone="muted">Look for the email saying your download is ready.</AppText>
          {s.provider.provider === 'uber_eats' ? <View style={{ gap: 8, paddingVertical: 16 }}><AppText variant="sectionLabel">EMAIL SUBJECT</AppText><AppText variant="surfaceTitle" selectable>{UBER_EXPORT_EMAIL_SUBJECT}</AppText></View> : null}
        </Surface>
        <Note text={`Your progress is saved. When the email arrives, return to Add orders → Continue with ${s.provider.name}.`} />
        {btn('Return home', c.goHome)}
        {s.provider.provider === 'uber_eats' ? c.importPreferences?.monitoring.effectiveState === 'enabled' ? <Note text="Uber ready-email checks are on. SnackTrack checks while the app is open. You still download the file yourself." /> : <>
          <AppButton label={c.importPreferences?.monitoring.consentState === 'granted' ? 'Restore Uber email checks' : 'Check for Uber’s ready email'} variant="secondary" pending={c.readyAlertsBusy} onPress={c.enableReadyAlerts} />
          <AppText variant="metadata" tone="muted">Optional: let SnackTrack check for Uber’s ready email while the app is active.</AppText>
        </> : null}
        <View style={styles.laterActions}>
          <AppText variant="metadata" tone="muted">Ready to continue?</AppText>
          <AppButton label="I received the email" variant="secondary" icon="mail-open-outline" onPress={() => c.confirmProviderReady(s.provider.provider)} />
        </View>
      </>;
      case 'download_ready': return <><Phase current={s.downloaded ? 2 : 1} />{title(s.downloaded ? `Choose your ${shortName} download` : `Download your history from ${shortName}`, s.downloaded ? 'Choose the file you saved. You’ll review it before starting the import.' : status?.readySource === 'detected_email' ? 'We found the ready message. Open its link and save the download to this device.' : 'You marked your download as ready. Open the provider’s ready message and save the download to this device.')}
        {s.downloaded ? <>{c.activeImportUnavailable ? <AppButton label="Reload import status" variant="secondary" onPress={c.refreshStatus} /> : null}<Note text={Platform.OS === 'ios' ? 'Look in Files → Browse → Downloads. Also check iCloud Drive or On My iPhone. Keep the ZIP intact.' : 'Look in Files → Downloads on this device. Keep the ZIP intact.'} /><ExportDataUpload session={c.fileSession} provider={s.provider.provider} journeyContext={route.journeyContext ?? 'post_onboarding'} importBlocked={c.importBlocked && c.activeImportOperation?.status !== 'awaiting_upload'} onUploadSuccess={c.uploadSucceeded} onUploadError={c.uploadFailed} /></> : <><Note text={`Keep the download zipped. ${DOWNLOAD_EXPIRY_HELP}`} />{btn('I saved it — choose my file', () => c.chooseDownloadedFile())}{btn('Show download steps', () => c.openProviderGuide(s.provider.provider, true), true)}</>}
        <AppButton label="Find my downloaded file" variant="secondary" disabled={c.navigationBlocked} onPress={() => c.setStep('file_help')} /><AppButton label="My download link expired" variant="tertiary" disabled={c.navigationBlocked} onPress={() => c.setStep('request')} />
      </>;
      case 'file_help': return <>{title('Find your downloaded file', 'Check the device where you saved the download. You don’t need to request another one just because you can’t find it.')}<Surface><Choice icon="folder-open-outline" title={Platform.OS === 'ios' ? 'Open Files' : 'Open your Files app'} body={Platform.OS === 'ios' ? 'Check Browse → Downloads, iCloud Drive, and On My iPhone.' : 'Check Downloads on this device.'} /><Choice icon="laptop-outline" title="Downloaded on a computer?" body="Transfer the original ZIP to this device, then choose it in SnackTrack. Keep it zipped." /></Surface>{btn(c.fileSession.file ? 'Back to my selected file' : 'Choose my file', () => c.chooseDownloadedFile())}{btn('Show download steps', () => c.openProviderGuide(s.provider.provider, true), true)}<AppButton label="My download link expired" variant="tertiary" onPress={() => c.setStep('request')} /></>;
      case 'provider_failed': return <>{title(`${s.provider.name} needs another try`, 'The last import could not finish. Your saved history is still available.')}{btn('Choose the file again', () => c.chooseDownloadedFile())}{btn('Get a newer download', () => c.setStep('request'), true)}</>;
      case 'provider_processing': return <>{title(`Adding your ${s.provider.name} history`, 'Your submitted import continues in the background.')}{c.activeImportOperation?.provider === s.provider.provider ? btn('View import status', c.viewOperation) : btn('Refresh status', () => { void c.refreshImportPreferences(); })}{btn('Use another source', c.showProviderChoice, true)}</>;
    }
  })();
  return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}><ScrollView contentContainerStyle={styles.content}><View style={styles.top}><AppButton label="Back" disabled={c.navigationBlocked} variant="tertiary" icon="arrow-back" onPress={c.goBack} /><AppButton label="Close" disabled={c.navigationBlocked} variant="tertiary" onPress={c.close} /></View>{content}</ScrollView></SafeAreaView>;
}
function Choice({ icon, title, body, onPress, disabled = false }: { disabled?: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; body: string; onPress?: () => void }) { const theme = useAppTheme(); const content = <><Ionicons name={icon} size={24} color={disabled ? theme.colors.textSecondary : theme.colors.primary} /><View style={styles.copy}><AppText variant="rowTitle" tone={disabled ? 'muted' : 'primary'}>{title}</AppText><AppText variant="metadata" tone="muted">{body}</AppText></View>{onPress && !disabled ? <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} /> : null}</>; return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${body}`} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={styles.row}>{content}</Pressable> : <View style={styles.row}>{content}</View>; }
function Note({ text }: { text: string }) { const theme = useAppTheme(); return <Surface style={{ backgroundColor: theme.colors.successSurface }}><AppText variant="metadata" tone="muted">{text}</AppText></Surface>; }
function Phase({ current }: { current: number }) { return <View style={styles.top}>{['Request', 'Download', 'Upload'].map((label, i) => <AppText key={label} variant="metadata" tone={i === current ? 'brand' : 'muted'}>{i + 1}. {label}{i === current ? ' •' : ''}</AppText>)}</View>; }
const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: 18, paddingBottom: 44, gap: 14 }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12 }, copy: { flex: 1, gap: 4 }, laterActions: { marginTop: 18, alignSelf: 'stretch', gap: 10 } });
