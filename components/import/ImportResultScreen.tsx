import { useImportPreferences } from '@hooks/useImportPreferences';
import { shouldOfferAutomaticUpdates } from '@features/import-flow/ongoingUpdatesState';
import { importReturnDestination, type ImportReturnTo } from '@features/import-flow/importNavigation';
import { Redirect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot } from '@components/mascot/Mascot';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { importFailureMessage } from '@features/import-flow/importStatusPresentation';
import { resolveImportOperationRecovery } from '@features/import-flow/importOperationRecovery';
import { resolveImportOperationResult, importResultCopy, resolveMailboxOutcomes } from '@features/import-flow/importOperationResult';
import { resolvePostImportDestination } from '@features/import-flow/postImportNavigation';
import { createWrappedRestartHref } from '@features/wrapped/wrappedNavigation';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useImportOperation } from '@hooks/useImportOperation';
import { experienceApi } from '@services/experienceApi';
import { appDestinations, useAppNavigation } from '@features/navigation';

export function ImportResultScreen({ operationId, returnTo = 'home' }: { operationId?: string; returnTo?: ImportReturnTo }) {
  const navigation = useAppNavigation();
  const trackingPreferences = useImportPreferences();
  const finish = (destination = importReturnDestination(returnTo)) => navigation.replace(destination);
  const isFocused = useIsFocused();
  const theme = useAppTheme();
  const { operation, isLoading, isUnavailable, refresh } = useImportOperation(Boolean(operationId), false, operationId);
  const [summaryEligible, setSummaryEligible] = useState(false);
  const [recapReady, setRecapReady] = useState(false);
  const summary = useMemo(() => operation ? resolveImportOperationResult(operation) : null, [operation]);

  useEffect(() => {
    if (!isFocused || isUnavailable || !operation || operation.status !== 'succeeded' || operation.kind === 'export_ready_check') return;
    let cancelled = false;
    void experienceApi.getState().then(experience => {
      if (cancelled) return;
      const destination = resolvePostImportDestination({ experience, outcome: 'succeeded' });
      setRecapReady(destination === 'recap_ready');
      setSummaryEligible(destination === 'recap_ready' || experience.receiptCount >= experience.firstRecap.minimumOrderCount);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [isFocused, operation, isUnavailable]);

  if (operation?.kind === 'export_ready_check') return <Redirect href={{ pathname: '/add-history', params: { returnTo, intent: 'resume_export', provider: operation.provider ?? undefined } }} />;
  const providerName=operation?.provider==='doordash'?'DoorDash':operation?.provider==='uber_eats'?'Uber Eats':operation?.kind==='gmail_historical'?'Gmail':operation?.kind==='outlook_historical'?'Outlook':null;

  if (!operationId) return <ResultLayout pose="sad" eyebrow="YOUR HISTORY IS SAFE" title="We couldn’t find that import" body="The import link is incomplete. Add more history to continue."><AppButton size="journey" label="Add more history" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} /></ResultLayout>;

  if (!isUnavailable && operation && ['awaiting_upload', 'pending_dispatch', 'queued', 'running', 'retrying'].includes(operation.status)) {
    return <Redirect href={{ pathname: '/import-progress', params: { operationId: operation.id, returnTo } }} />;
  }

  if (isLoading) return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;

  if (isUnavailable) return <ResultLayout pose="thinking" eyebrow="STATUS UNAVAILABLE" title="We couldn’t load this result" body="Your saved history is available. Try loading the status before starting the same import again."><AppButton size="journey" label="Reload status" onPress={() => void refresh()} /><AppButton label="View order history" variant="tertiary" onPress={() => navigation.replace(appDestinations.history)} /></ResultLayout>;

  if (!operation || !summary) return <ResultLayout pose="sad" eyebrow="YOUR HISTORY IS SAFE" title="We couldn’t find that import" body="It may have expired or been replaced. Add more history to continue."><AppButton size="journey" label="Add more history" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} /></ResultLayout>;

  if (operation.status !== 'succeeded') {
    const recovery = resolveImportOperationRecovery(operation, returnTo);
    const mailboxes = resolveMailboxOutcomes(operation);
    const partial = mailboxes.some(item => item.success);
    const ended = operation.status === 'expired' || operation.status === 'superseded' || operation.status === 'cancelled';
    return <ResultLayout pose="sad" eyebrow={providerName ? `${providerName} · Your history is safe` : 'YOUR HISTORY IS SAFE'} title={partial ? 'One inbox needs attention' : ended ? 'This import is no longer active' : 'This import needs another try'} body={partial ? 'Orders saved by the successful inbox are still here. Continue with the inbox that needs attention.' : importFailureMessage(operation)}>
      {mailboxes.map(item => <AppText key={item.mailbox} variant="surfaceBody">{item.email ?? (item.mailbox === 'gmail' ? 'Gmail' : 'Outlook')}: {item.success ? 'Check completed; saved orders are available.' : item.errorCode?.includes('RECONNECT') ? 'Reconnect this inbox.' : 'Check did not finish.'}</AppText>)}
      {partial ? <AppButton label="View order history" variant="tertiary" onPress={() => navigation.replace(appDestinations.history)} /> : null}
      <AppButton size="journey" label={recovery.label} onPress={() => navigation.replace(recovery.destination)} />
      <AppButton label="Add more history" variant="tertiary" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} />
    </ResultLayout>;
  }

  if (returnTo === 'ongoing_updates') return <Redirect href={appDestinations.ongoingUpdates} />;

  const { nothingChanged, empty, title: resultTitle, body } = importResultCopy(summary);
  const canPlayRecap = recapReady || summaryEligible;
  const mailboxImport = operation.kind === 'gmail_historical' || operation.kind === 'outlook_historical';
  return <ResultLayout pose={nothingChanged ? 'thinking' : 'celebrate'} eyebrow={providerName ? `${providerName} · Import complete` : 'IMPORT COMPLETE'} title={resultTitle} body={body} onClose={() => finish()}>
    {!nothingChanged && [summary.newOrders, summary.updatedOrders, summary.unchangedOrders].some(value => value !== null && value > 0) ? <View style={styles.counts}>
      {summary.newOrders !== null && summary.newOrders > 0 ? <Count value={summary.newOrders} label="New" /> : null}
      {summary.updatedOrders !== null && summary.updatedOrders > 0 ? <Count value={summary.updatedOrders} label="Updated" /> : null}
      {summary.unchangedOrders !== null && summary.unchangedOrders > 0 ? <Count value={summary.unchangedOrders} label="Already saved" /> : null}
    </View> : null}
    {empty ? <>
      <AppButton size="journey" label={mailboxImport ? "Try another inbox" : "Choose another file"} onPress={() => navigation.replace(mailboxImport
        ? { pathname: '/add-history', params: { returnTo, intent: 'email' } }
        : resolveImportOperationRecovery(operation, returnTo).destination)} />
      {mailboxImport ? <AppButton label="Add orders from Uber Eats or DoorDash" variant="secondary" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo, intent: 'provider' } })} /> : null}
      <AppButton label="View order history" variant="tertiary" onPress={() => finish(appDestinations.history)} />
    </> : <>
      {canPlayRecap ? <AppButton size="journey" label="Play my recap" icon="play" onPress={() => {
        const destination = createWrappedRestartHref();
        navigation.replace({ ...destination, params: { ...destination.params, entryPoint: recapReady ? 'automatic_first_import' : 'summary' } });
      }} /> : null}
      {!canPlayRecap ? <AppButton size="journey" label="View order history" onPress={() => finish(appDestinations.history)} /> : null}
      <AppButton label="Add more history" variant="tertiary" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} />
    </>}

    {shouldOfferAutomaticUpdates(trackingPreferences.preferences) ? <View style={styles.updateOffer}>
      <AppText variant="surfaceTitle">Keep new orders up to date</AppText>
      <AppText variant="metadata" tone="muted">Optional: let SnackTrack check for new email receipts. You’ll review access before turning this on.</AppText>
      <AppButton label="Enable automatic updates" variant="secondary" onPress={() => navigation.open({ pathname: '/ongoing-updates', params: { automatic: 'true' } })} />
    </View> : null}
  </ResultLayout>;
}

function ResultLayout({ pose, eyebrow, title, body, children, onClose }: { pose: 'sad' | 'thinking' | 'celebrate'; eyebrow: string; title: string; body: string; children: React.ReactNode; onClose?: () => void }) {
  const theme = useAppTheme();
  return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}><ScrollView contentContainerStyle={styles.content}>{onClose ? <View style={styles.dismiss}><AppButton label="Close import result" icon="close" variant="icon" onPress={onClose} /></View> : null}<Mascot pose={pose} size={144} /><AppText variant="eyebrow" tone="brand">{eyebrow}</AppText><AppText accessibilityRole="header" variant="pageTitle" style={styles.center}>{title}</AppText><AppText variant="body" tone="muted" style={styles.center}>{body}</AppText><View style={styles.actions}>{children}</View></ScrollView></SafeAreaView>;
}
function Count({ value, label }: { value: number; label: string }) { return <View style={styles.count}><AppText variant="pageTitle">{value}</AppText><AppText variant="metadata" tone="muted">{label}</AppText></View>; }
const styles = StyleSheet.create({ updateOffer: { marginTop: 18, gap: 10 }, dismiss: { alignSelf: 'flex-end', marginBottom: 8 }, container: { flex: 1, justifyContent: 'center' }, content: { alignItems: 'center', padding: 24 }, center: { textAlign: 'center', marginTop: 10 }, actions: { alignSelf: 'stretch', gap: 10, marginTop: 26 }, counts: { flexDirection: 'row', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 8 }, count: { alignItems: 'center' } });
