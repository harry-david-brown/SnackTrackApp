import { ReceiptInboxChoice } from '@components/import/ReceiptInboxChoice';
import { Mascot } from '@components/mascot/Mascot';
import { ImportJourneyHeader } from '@components/import/ImportJourneyHeader';
import { ImportStepSheet } from '@components/import/ImportStepSheet';
import { EmailJourneyHeading } from './EmailJourneyHeading';
import { ImportProgressScreen } from './ImportProgressScreen';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';
import { Surface } from '@components/ui/Surface';
import { StatusBadge } from '@components/ui/StatusBadge';
import { resolveEmailSources, resolveDownloadSource, type ImportSourcePresentation } from '@features/import-flow/importSourcePresentation';
import { ExportDataUpload } from '@components/upload/UberDataUpload';
import UberDataTutorial, { ProviderRequestConfirmation } from '@components/upload/UberDataTutorial';
import { ProviderDownloadGuideCarousel } from '@components/upload/ProviderDownloadGuideCarousel';
import { useAppTheme } from '@contexts/AppearanceContext';
import { DOWNLOAD_QUESTION_PRIMARY } from '@features/import-flow/postOnboardingImportJourney';
import { isActiveImportOperation } from '@features/import-flow/contracts';
import type { PostOnboardingImportRoute } from '@features/import-flow/postOnboardingImportRoute';
import { usePostOnboardingImportController } from '@hooks/usePostOnboardingImportController';
import { appDestinations, useAppNavigation } from '@features/navigation';
import { Spacing } from '@constants/theme';

export function PostOnboardingImportScreen({ route }: { route: PostOnboardingImportRoute }) {
  const c = usePostOnboardingImportController(route);
  const theme = useAppTheme();
  const preparing = Boolean(c.preparingFile || c.fileSession.choosing);
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <View
      style={{ flex: 1, opacity: preparing ? 0 : 1 }}
      pointerEvents={preparing ? 'none' : 'auto'}
      accessibilityElementsHidden={preparing}
      importantForAccessibility={preparing ? 'no-hide-descendants' : 'auto'}
    >
      <PostOnboardingImportContent route={route} controller={c} />
    </View>
    {preparing ? <SafeAreaView style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.background, justifyContent: 'center', padding: Spacing.page }]}>
      <View accessibilityLiveRegion="polite" accessibilityLabel="Preparing your file for import" accessibilityState={{ busy: true }} style={{ alignItems: 'center', gap: Spacing.md }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <AppText variant="pageTitle" style={{ textAlign: 'center' }}>Preparing your file…</AppText>
        <AppText variant="body" tone="muted" style={{ textAlign: 'center' }}>Your import will start once your file is ready.</AppText>
      </View>
    </SafeAreaView> : null}
  </View>;
}

function PostOnboardingImportContent({ route, controller: c }: {
  route: PostOnboardingImportRoute;
  controller: ReturnType<typeof usePostOnboardingImportController>;
}) {
  const navigation = useAppNavigation();
  const theme = useAppTheme();
  const s = c.state;
  const provider = 'provider' in s && typeof s.provider === 'object' ? s.provider : null;
  const shortName = provider?.provider === 'uber_eats' ? 'Uber' : 'DoorDash';
  if (s.kind === 'email_settings') return <Redirect href={{ pathname: "/settings/accounts-permissions", params: { mailbox: c.selection.mailbox ?? undefined, returnTo: c.returnTo } }} />;
  if (c.fileSession.isPending) return <ImportProgressScreen providerName={c.selectedProvider==='doordash'?'DoorDash':'Uber Eats'} returnTo={c.returnTo} uploadActive uploadProgress={c.fileSession.progress} />;
  if (c.fileSession.operation) return <Redirect href={{
    pathname: isActiveImportOperation(c.fileSession.operation) ? '/import-progress' : '/import-result',
    params: { operationId: c.fileSession.operation.id, returnTo: c.returnTo },
  }} />;
  if (s.kind === 'operation') return <Redirect href={{ pathname: ['awaiting_upload', 'pending_dispatch', 'queued', 'running', 'retrying'].includes(s.operation.status) ? '/import-progress' : '/import-result', params: { operationId: s.operation.id, returnTo: c.returnTo } }} />;
  if (c.showTutorial) return <><UberDataTutorial mode={c.tutorialEntryJob === 'download' ? 'download' : 'request'} initialPlatform={c.tutorialPlatform} entryJob={c.tutorialEntryJob} skipRequestOverview returnToParentOnBack providerStatuses={{ uber: c.flow.exportProviderProgress.uberEats.status, doordash: c.flow.exportProviderProgress.doorDash.status }} onOpenRequest={c.openProviderRequestPage} onRequestNotSubmitted={c.requestNotSubmitted} onRequestConfirmed={c.completeTutorial} onStillWaiting={c.completeTutorial} onArchiveDownloaded={c.finishDownloadGuide} onReadyConfirmed={c.tutorialReadyConfirmed} onClose={c.closeTutorial} onOverview={c.showProviderChoice} onSteps={c.openSteps} /><ImportStepSheet visible={c.stepSheetVisible} onClose={c.closeSteps} onReady={()=>{c.closeTutorial();c.confirmProviderReady();}} onFile={()=>{void c.chooseDownloadedFile();}} onRequest={()=>{c.closeTutorial();c.setStep('request');}}/></>;
  if (s.kind === 'confirm_request') return <ProviderRequestConfirmation platform={s.provider.provider === 'uber_eats' ? 'uber' : 'doordash'} pending={c.requestSaving} onOverview={c.showProviderChoice} onBack={()=>c.setStep('request')} onConfirm={() => { void c.completeTutorial(s.provider.provider === 'uber_eats' ? 'uber' : 'doordash'); }} onShowSteps={c.abandonPendingRequest} showStepsLabel="Check the steps again" />;
  const coverageDates = (p: 'uber_eats' | 'doordash') => {
    const coverage = p === 'uber_eats' ? c.importPreferences?.coverage.exportProviders.uberEats : c.importPreferences?.coverage.exportProviders.doorDash;
    const latest = coverage?.latestOrderDate;
    if (!latest || Number.isNaN(Date.parse(latest))) return '';
    const month = new Date(latest).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
    return ` · Through ${month}`;
  };
  const title = (heading: string, body: string, eyebrow = 'ADD ORDERS') => <PageHeader eyebrow={eyebrow} title={heading} body={body} />;
  const btn = (label: string, onPress: () => void, secondary = false) => <AppButton label={label} size={secondary ? 'default' : 'journey'} variant={secondary ? 'tertiary' : 'primary'} onPress={onPress} />;
  const content = (() => {
    switch (s.kind) {
      case 'loading': return <><ActivityIndicator color={theme.colors.primary} />{title('Loading your import options', 'Your saved history is still available.')}</>;
      case 'temporary_outage': return <>{title('We can’t load import status', 'Your saved history is available. Try loading the status before starting the same import again.')}{btn('Try again', c.refreshStatus)}{btn('View order history', () => navigation.replace(appDestinations.history), true)}</>;
      case 'missing_operation': return <>{title('This import link is unavailable', 'It may be an old link. Your existing orders are still available.')}{btn('Add orders', () => navigation.replace({ pathname: '/add-history', params: { returnTo: c.returnTo } }))}</>;
      case 'choose_method': {
        const emailSources = resolveEmailSources(c.importPreferences, c.activeImportOperation);
        const emailImported = emailSources.some(source => source.completed);
        return <>
          {emailImported
            ? title('Add more of your history', 'Your email receipt import is complete. History downloads can help fill the gaps.', 'YOUR HISTORY')
            : title('Add your orders', 'Choose an inbox or add a history download. Each source is optional.')}
          {c.activeImportUnavailable ? <Note text="Import status is temporarily unavailable. Refresh before starting another import." /> : null}
          <AppText variant="sectionLabel" tone="muted">Email receipts</AppText>
          <Surface>{emailSources.map((source, index) => <View key={source.mailbox} style={index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider } : undefined}>
            <Choice icon={source.completed ? 'mail-open-outline' : 'mail-outline'} title={source.mailbox === 'gmail' ? 'Gmail' : 'Outlook'}
              body={source.presentation.body} badge={source.presentation}
              actionLabel={source.presentation.actionLabel}
              onPress={source.presentation.actionLabel ? source.active ? c.viewOperation : () => c.chooseMailbox(source.mailbox) : undefined} />
          </View>)}</Surface>
          <View style={styles.completionHeading}>
            <AppText variant="pageTitle" accessibilityRole="header" style={styles.completionTitle}>Complete your history</AppText>
            <AppText variant="body" tone="muted">Add orders that email receipts may have missed.</AppText>
          </View>
          <Surface>{s.providers.map((p, index) => {
            const presentation = resolveDownloadSource(p, Boolean(c.pendingRequests[p.provider]), coverageDates(p.provider), c.activeImportOperation);
            return <View key={p.provider} style={index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider } : undefined}>
              <Choice icon={p.provider === 'uber_eats' ? 'car-outline' : 'bag-handle-outline'} title={p.name}
                body={presentation.body} badge={presentation} actionLabel={presentation.actionLabel} inlineAction
                onPress={presentation.action === 'operation' ? c.viewOperation : () => c.resumeProviderJourney(p.provider)} />
            </View>;
          })}</Surface>
          {c.activeImportOperation && !emailSources.some(source => source.active) ? <AppButton label="View latest import" variant="tertiary" onPress={c.viewOperation} /> : null}
          <AppText variant="metadata" tone="muted">{emailImported ? 'These downloads are optional. Your saved history is ready to explore.' : 'Each source is optional. Choose the ones you use.'}</AppText>
          <AppButton label="Accounts & automatic updates" variant="tertiary" onPress={() => navigation.open({ pathname: '/settings/accounts-permissions', params: { returnTo: c.returnTo } })} />
        </>;
      }
      case 'provider_intro': return <>
        {title(`Have you downloaded your ${shortName} order history?`, `You’ll request your order history from ${shortName}, wait for their email, then download and upload the file here.`, s.provider.name.toUpperCase())}
        <View style={styles.journeyActions}>
        {btn(DOWNLOAD_QUESTION_PRIMARY.label, c.requestHistory)}
        {btn('Yes, I have the file', () => c.chooseDownloadedFile(s.provider.provider), true)}
        {btn('I already requested it', () => c.setStep('resume'), true)}
        </View>
        {s.provider.imported ? <Note text={`${s.provider.receiptCount} orders from ${s.provider.name} history files are already saved. You can still upload a newer download.`} /> : null}
      </>;
      case 'email_choice': return <ReceiptInboxChoice disabled={c.connectionBusy} onChooseEmail={c.chooseMailbox} onChooseAlternative={c.requestHistory} />;
      case 'email_review': {
        const name = s.provider === 'gmail' ? 'Gmail' : 'Outlook';
        const canStartImport = s.connected && !s.reconnect && !s.temporarilyUnavailable;
        return <>
          {route.connectionFailed ? <Note text="The connection wasn’t completed. You can try the selected service again. Your saved orders are still available." /> : null}
          <EmailJourneyHeading providerName={name} connected={s.connected} reconnect={s.reconnect} unavailable={s.temporarilyUnavailable} email={s.email} busy={c.connectionBusy} onChangeAccount={c.switchInbox} />
          <View style={styles.journeyActions}>
            {!s.connected && !s.reconnect && !s.temporarilyUnavailable ? <AppText variant="metadata" tone="muted" style={styles.waitingActionCopy}>Next, choose your account and review access.</AppText> : null}
            {canStartImport && c.activeImportUnavailable ? <AppButton label="Reload import status" variant="secondary" onPress={c.refreshStatus} /> : null}
            {canStartImport && c.importBlocked ? <Note text={c.activeImportOperation?.status === 'awaiting_upload' ? 'An unfinished file upload is saved. Finish it from Add orders before importing this inbox’s history. You can still connect or repair an inbox.' : 'Another import is processing. You can import this inbox’s history when it finishes.'} /> : null}
            <AppButton size="journey" label={s.temporarilyUnavailable ? 'Reload connection' : s.reconnect ? `Reconnect ${name}` : !s.connected ? `Connect ${name}` : 'Find my orders'} pending={c.connectionBusy} disabled={canStartImport && (c.importBlocked || c.activeImportUnavailable)} onPress={c.startEmail} />
            <AppButton label="Use another method" variant="tertiary" disabled={c.connectionBusy} onPress={c.showProviderChoice} />
          </View>
        </>;
      }
      case 'request': return <View style={styles.requestGroup}>
        <View style={styles.requestHero}>
          <Mascot pose="prop-first-receipt" size={142} accessibilityLabel="SnackTrack mascot holding a receipt" />
          <View style={styles.requestHeading}>
            <AppText variant="pageTitle" accessibilityRole="header" style={styles.requestCentered}>Complete your {s.provider.name} history</AppText>
            <AppText variant="body" tone="muted" style={styles.requestCentered}>Add orders that email receipts may have missed.</AppText>
          </View>
        </View>
        <Surface>
          <View style={styles.requestStep}>
            <AppText variant="eyebrow" tone="brand">STEP 1 OF 3</AppText>
            <AppText variant="surfaceTitle" accessibilityRole="header">Request your history from {shortName}</AppText>
            <AppText variant="surfaceBody" tone="muted">They’ll email you when your file is ready. Then download it and upload it here.</AppText>
          </View>
          <View style={styles.requestActions}>
            {btn(`Open ${shortName} request page`, () => { void c.openRequestPage(); })}
            {btn('Show me how', () => c.openProviderGuide(), true)}
          </View>
        </Surface>
        <AppButton label="Already started?" variant="tertiary" onPress={c.openSteps} />
      </View>;

      case 'resume': return <>{title('Where did you leave off?', `Continue your ${shortName} download from the step you need.`)}<Surface><Choice icon="time-outline" disabled={c.requestSaving} title={c.requestSaving ? "Saving your request…" : "I’m waiting for the ready message"} body="I submitted the request, but haven’t received the download instructions." onPress={() => { void c.completeTutorial(s.provider.provider === 'uber_eats' ? 'uber' : 'doordash'); }} /><Choice icon="mail-open-outline" title="My download is ready" body="Help me download the file." onPress={() => c.confirmProviderReady()} /><Choice icon="folder-open-outline" title="I saved the file" body="Choose it and start importing." onPress={() => c.chooseDownloadedFile()} /></Surface>{btn('I haven’t requested it yet', () => c.setStep('request'), true)}</>;
      case 'provider_waiting': return <>
        <View style={{alignSelf:'flex-start',padding:22,borderRadius:24,backgroundColor:theme.colors.successSurface,marginTop:24}}><Ionicons name="time-outline" size={30} color={theme.colors.primary}/></View>
        <PageHeader title={`Waiting for your ${s.provider.name} history`} body={`${s.provider.name} will email you when your download is ready. You can leave this page while you wait.`} />
        <AppText variant="metadata" tone="muted">Your place is saved. Continue later from Add orders.</AppText>
        {c.readyAlerts.available ? <Surface>
          <AppText variant="surfaceTitle">{c.readyAlerts.label}</AppText>
          {c.readyAlerts.inboxLabel ? <AppText variant="metadata" tone="muted">Connected: {c.readyAlerts.inboxLabel}</AppText> : null}
          <AppText variant="surfaceBody" tone="muted">Allow SnackTrack to check your inbox for the email saying your download is ready, even while the app is closed. You still download and upload the file yourself. This does not turn on automatic receipt imports.</AppText>
          <AppText variant="metadata" tone="muted" accessibilityLiveRegion="polite">{c.readyAlerts.description}</AppText>
          {c.readyAlerts.chooseInbox ? <>
            <AppText variant="surfaceBody">Choose the inbox used by your {shortName} account. It may differ from your SnackTrack sign-in email.</AppText>
            <AppButton label="Gmail" pending={c.readyAlerts.busy} onPress={() => c.readyAlerts.connect('gmail')} />
            <AppButton label="Outlook" variant="secondary" pending={c.readyAlerts.busy} onPress={() => c.readyAlerts.connect('outlook')} />
          </> : !c.readyAlerts.enabled && c.readyAlerts.notificationsSupported ? <AppButton label={c.readyAlerts.actionLabel} variant="secondary" pending={c.readyAlerts.busy} onPress={() => c.readyAlerts.issue === 'denied' ? c.readyAlerts.openSettings() : c.readyAlerts.enroll()} /> : null}
          {c.readyAlerts.monitoringGranted ? <AppButton label="Turn off download alerts" variant="tertiary" pending={c.readyAlerts.busy} onPress={() => { void c.readyAlerts.disable(); }} /> : <AppButton label="Not now" variant="tertiary" onPress={() => { void c.readyAlerts.dismiss(); }} />}
        </Surface> : <AppText variant="metadata" tone="muted">Check your {shortName} account’s email for the download link, then return here with the file.</AppText>}
        <View style={{flex:1,minHeight:24}}/>
        {c.readyAlerts.enabled ? <AppText variant="metadata" tone="muted" accessibilityLiveRegion="polite" style={{textAlign:'center'}}>We’ll notify you when your download is ready.</AppText> : null}
        <AppButton size="journey" label="Go home for now" onPress={()=>{void c.readyAlerts.leave();}}/>
        <AppButton label="I’m further along or at a different step" variant="tertiary" onPress={c.openSteps}/>
      </>;
      case 'download_ready': {
        const uploadTitle = c.fileSession.file
            ? `Finish importing your ${shortName} file`
            : `Choose your ${shortName} file`;
        const uploadBody = c.fileSession.file
            ? 'Your file is saved for this session. Continue when you’re ready.'
            : 'Choose your downloaded file to start importing. We’ll match overlapping orders with your existing history.';
        return <>

        {title(
          s.downloaded ? uploadTitle : `Your ${shortName} history is ready`,
          s.downloaded
            ? uploadBody
            : 'Follow these three steps, then choose the ZIP to start importing.',
        )}
        {s.downloaded ? <>
          {c.activeImportUnavailable ? <AppButton label="Reload import status" variant="secondary" onPress={c.refreshStatus} /> : null}
          <ExportDataUpload session={c.fileSession} provider={s.provider.provider} journeyContext={route.journeyContext ?? 'post_onboarding'} importBlocked={c.importBlocked && c.activeImportOperation?.status !== 'awaiting_upload'} onUploadSuccess={c.uploadSucceeded} onUploadError={c.uploadFailed} />
        </> : <>
          <ProviderDownloadGuideCarousel
            provider={s.provider.provider}
            onOpenEmail={s.provider.provider === 'uber_eats' && c.importPreferences?.gmailConnection.connected ? c.openExportEmail : undefined}
          />
          <View style={styles.downloadDecision}>
            <AppButton size="journey" label="Choose downloaded file" variant="primary" pending={c.fileSession.choosing} onPress={() => { void c.chooseDownloadedFile(); }} />
            <AppButton label="Help me find the ZIP" variant="tertiary" disabled={c.navigationBlocked} onPress={() => c.setStep('file_help')} />
            <AppButton label="My download link expired" variant="tertiary" disabled={c.navigationBlocked} onPress={() => c.setStep('request')} />
          </View>
        </>}
      </>;
      }
      case 'file_help': return <>{title('Find your downloaded file', 'Check the device where you saved the download. You don’t need to request another one just because you can’t find it.')}<Surface><Choice icon="folder-open-outline" title={Platform.OS === 'ios' ? 'Open Files' : 'Open your Files app'} body={Platform.OS === 'ios' ? 'Check Browse → Downloads, iCloud Drive, and On My iPhone.' : 'Check Downloads on this device.'} /><Choice icon="laptop-outline" title="Downloaded on a computer?" body="Transfer the original ZIP to this device, then choose it in SnackTrack. Keep it zipped." /></Surface>{btn(c.fileSession.file ? 'Back to my selected file' : 'Choose file', c.fileSession.file ? () => c.setStep('upload') : () => c.chooseDownloadedFile())}{btn('Show download steps', () => c.openProviderGuide(s.provider.provider, true), true)}<AppButton label="My download link expired" variant="tertiary" onPress={() => c.setStep('request')} /></>;
      case 'provider_failed': return <>{title(`${s.provider.name} needs another try`, 'The last import could not finish. Your saved history is still available.')}{btn('Choose the file again', () => c.chooseDownloadedFile())}{btn('Get a newer download', () => c.setStep('request'), true)}</>;
      case 'provider_processing': return <>{title(`Adding your ${s.provider.name} history`, 'Your submitted import continues in the background.')}{c.activeImportOperation?.provider === s.provider.provider ? btn('View import status', c.viewOperation) : btn('Refresh status', () => { void c.refreshImportPreferences(); })}{btn('Use another source', c.showProviderChoice, true)}</>;
    }
  })();
  const stageIndex=provider?(s.kind==='download_ready'?(s.downloaded?2:1):s.kind==='provider_processing'?2:0):s.kind==='email_review'?(s.connected&&!s.reconnect?1:0):undefined;
  return <SafeAreaView style={[styles.container,{backgroundColor:theme.colors.background}]}>
    <ScrollView contentContainerStyle={[styles.content, s.kind === 'request' && styles.requestContent]}>
      <ImportJourneyHeader provider={s.kind === 'request' ? undefined : provider?.name??(s.kind==='email_review'?(s.provider==='gmail'?'Gmail':'Outlook'):undefined)} stage={s.kind === 'request' ? undefined : stageIndex}
        mailbox={s.kind==='email_review'} waiting={s.kind==='provider_waiting'} disabled={c.navigationBlocked}
        backLabel={s.kind==='choose_method'?'Back':'Add orders'} onBack={s.kind==='choose_method'?c.close:c.showProviderChoice}
        onSteps={provider&&s.kind!=='provider_waiting'&&s.kind!=='request'?c.openSteps:undefined}/>
      {content}
    </ScrollView>
    <ImportStepSheet visible={c.stepSheetVisible} onClose={c.closeSteps} onReady={()=>c.confirmProviderReady()}
      onFile={()=>{void c.chooseDownloadedFile();}} onRequest={()=>c.setStep('request')}/>
  </SafeAreaView>;
}
function Choice({ icon, title, body, bodyTone = 'muted', actionLabel, onPress, badge, inlineAction = false, disabled = false }: { badge?: ImportSourcePresentation; inlineAction?: boolean; disabled?: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; body: string; bodyTone?: 'muted' | 'brand'; actionLabel?: string; onPress?: () => void }) {
  const theme = useAppTheme();
  const content = <>
    <View style={inlineAction ? [choiceStyles.iconWell, { backgroundColor: theme.colors.chipActiveBg, borderRadius: theme.radii.control }] : undefined}>
      <Ionicons name={icon} size={24} color={disabled ? theme.colors.textSecondary : theme.colors.primary} />
    </View>
    <View style={styles.copy}>
      <View style={styles.sourceTitle}>
        <AppText variant="rowTitle" tone={disabled ? 'muted' : 'primary'}>{title}</AppText>
        {badge ? <StatusBadge label={badge.status} tone={badge.tone} /> : null}
      </View>
      {body ? <AppText variant="metadata" tone={disabled ? 'muted' : bodyTone} style={bodyTone === 'brand' ? choiceStyles.actionText : undefined}>{body}</AppText> : null}
      {actionLabel && onPress ? (
        <View style={[choiceStyles.action, { marginTop: theme.spacing.sm }]}>
          <AppText variant="metadata" tone={badge?.tone === 'complete' ? 'muted' : 'brand'} style={[choiceStyles.actionText, choiceStyles.actionLabel]}>{actionLabel}</AppText>
          {inlineAction ? <Ionicons name="arrow-forward" size={16} color={badge?.tone === 'complete' ? theme.colors.textSecondary : theme.colors.primary} accessible={false} /> : null}
        </View>
      ) : null}
    </View>
    {onPress && !disabled && !inlineAction ? <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} /> : null}
  </>;
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={[title, badge?.status, body, actionLabel].filter(Boolean).join('. ')} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>{content}</Pressable>
    : <View style={styles.row}>{content}</View>;
}
const choiceStyles = StyleSheet.create({ actionText: { fontSize: 14, lineHeight: 18 }, action: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, actionLabel: { flexShrink: 1 }, iconWell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' } });
function Note({ text }: { text: string }) { const theme = useAppTheme(); return <Surface style={{ backgroundColor: theme.colors.successSurface }}><AppText variant="metadata" tone="muted">{text}</AppText></Surface>; }
const styles = StyleSheet.create({ container: { flex: 1 }, completionHeading: { marginTop: Spacing.sm, gap: Spacing.sm }, completionTitle: { fontSize: 24, lineHeight: 28 }, sourceTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm }, requestContent: { paddingBottom: Spacing.xl }, requestGroup: { flexGrow: 1, flexShrink: 0, justifyContent: 'center', paddingVertical: Spacing.lg, gap: Spacing.md }, requestHero: { alignItems: 'center', paddingBottom: Spacing.lg, gap: Spacing.lg }, requestHeading: { alignSelf: 'stretch', gap: Spacing.md }, requestCentered: { textAlign: 'center' }, requestStep: { gap: Spacing.sm }, requestActions: { paddingTop: Spacing.lg, gap: Spacing.sm }, journeyActions: { marginTop: 'auto', paddingTop: Spacing.xl, gap: Spacing.md }, content: { flexGrow: 1, padding: 18, paddingBottom: 44, gap: 14 }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12 }, copy: { flex: 1, gap: 4 }, waitingActions: { alignSelf: 'stretch', gap: 8 }, waitingActionCopy: { textAlign: 'center', paddingHorizontal: 12 }, laterActions: { marginTop: 18, alignSelf: 'stretch', gap: 10 }, downloadDecision: { gap: 8 } });
