import { importReturnDestination, type ImportReturnTo } from '@features/import-flow/importNavigation';
import { Redirect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot } from '@components/mascot/Mascot';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { resolveImportOperationRecovery } from '@features/import-flow/importOperationRecovery';
import { resolveImportOperationResult, importResultCopy } from '@features/import-flow/importOperationResult';
import { resolvePostImportDestination } from '@features/import-flow/postImportNavigation';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useImportOperation } from '@hooks/useImportOperation';
import { experienceApi } from '@services/experienceApi';
import { appDestinations, useAppNavigation } from '@features/navigation';

export function ImportResultScreen({ operationId, returnTo = 'home' }: { operationId?: string; returnTo?: ImportReturnTo }) {
  const navigation = useAppNavigation();
  const isFocused = useIsFocused();
  const theme = useAppTheme();
  const { operation, isLoading, isUnavailable, refresh } = useImportOperation(Boolean(operationId), false, operationId);
  const [summaryEligible, setSummaryEligible] = useState(false);
  const [recapReady, setRecapReady] = useState(false);
  const summary = useMemo(() => operation ? resolveImportOperationResult(operation) : null, [operation]);

  useEffect(() => {
    if (!isFocused || isUnavailable || !operation || operation.status !== 'succeeded') return;
    let cancelled = false;
    void experienceApi.getState().then(experience => {
      if (cancelled) return;
      const destination = resolvePostImportDestination({ experience, outcome: 'succeeded' });
      setRecapReady(destination === 'recap_ready');
      setSummaryEligible(destination === 'recap_ready' || experience.receiptCount >= experience.firstRecap.minimumOrderCount);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [isFocused, operation, isUnavailable]);

  if (!operationId) return <ResultLayout pose="sad" eyebrow="YOUR HISTORY IS SAFE" title="We couldn’t find that import" body="The import link is incomplete. Choose another import to continue."><AppButton label="Choose another import" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} /></ResultLayout>;

  if (!isUnavailable && operation && ['awaiting_upload', 'pending_dispatch', 'queued', 'running', 'retrying'].includes(operation.status)) {
    return <Redirect href={{ pathname: '/import-progress', params: { operationId: operation.id, returnTo } }} />;
  }

  if (isLoading) return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;

  if (isUnavailable) return <ResultLayout pose="thinking" eyebrow="STATUS UNAVAILABLE" title="We couldn’t load this result" body="Your saved history is available. Try loading the status before starting the same import again."><AppButton label="Reload status" onPress={() => void refresh()} /><AppButton label="View order history" variant="secondary" onPress={() => navigation.replace(appDestinations.history)} /></ResultLayout>;

  if (!operation || !summary) return <ResultLayout pose="sad" eyebrow="YOUR HISTORY IS SAFE" title="We couldn’t find that import" body="It may have expired or been replaced. Choose another import to continue."><AppButton label="Choose another import" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} /></ResultLayout>;

  if (operation.status !== 'succeeded') {
    const recovery = resolveImportOperationRecovery(operation, returnTo);
    const ended = operation.status === 'expired' || operation.status === 'superseded' || operation.status === 'cancelled';
    return <ResultLayout pose="sad" eyebrow="YOUR HISTORY IS SAFE" title={ended ? 'This import is no longer active' : 'This import needs another try'} body={operation.errorMessage || (ended ? 'A newer import may have replaced it. Nothing already in SnackTrack was removed.' : 'We could not finish this import. Your saved order history is still available.')}>
      <AppButton label={recovery.label} onPress={() => navigation.replace(recovery.destination)} />
      <AppButton label="Choose another source" variant="secondary" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} />
    </ResultLayout>;
  }

  const { nothingChanged, empty, title: resultTitle, body } = importResultCopy(summary);
  return <ResultLayout pose={nothingChanged ? 'thinking' : 'celebrate'} eyebrow="IMPORT COMPLETE" title={resultTitle} body={body}>
    <View style={styles.counts}>
      {summary.newOrders !== null ? <Count value={summary.newOrders} label="New" /> : null}
      {summary.updatedOrders !== null ? <Count value={summary.updatedOrders} label="Updated" /> : null}
      {summary.unchangedOrders !== null ? <Count value={summary.unchangedOrders} label="Already saved" /> : null}
    </View>
    {recapReady
      ? <AppButton label="Start my recap" icon="play" onPress={() => navigation.replace({ pathname: '/(tabs)/wrapped-journey', params: { entryPoint: 'automatic_first_import' } })} />
      : summaryEligible
        ? <AppButton label="View Summary" onPress={() => navigation.replace(appDestinations.summary)} />
        : <AppButton label="View order history" onPress={() => navigation.replace(appDestinations.history)} />}
    <AppButton
      label={recapReady || summaryEligible ? 'View order history' : empty ? 'Choose another source' : 'Add orders'}
      variant="secondary"
      onPress={() => recapReady || summaryEligible
        ? navigation.replace(appDestinations.history)
        : navigation.replace({ pathname: '/add-history', params: { returnTo } })}
    />
    {summaryEligible && !recapReady
      ? <AppButton label={empty ? 'Choose another source' : 'Add orders'} variant="tertiary" onPress={() => navigation.replace({ pathname: '/add-history', params: { returnTo } })} />
      : null}
    <AppButton label="Close" variant="tertiary" onPress={() => navigation.replace(importReturnDestination(returnTo))} />
  </ResultLayout>;
}

function ResultLayout({ pose, eyebrow, title, body, children }: { pose: 'sad' | 'thinking' | 'celebrate'; eyebrow: string; title: string; body: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}><ScrollView contentContainerStyle={styles.content}><Mascot pose={pose} size={144} /><AppText variant="eyebrow" tone="brand">{eyebrow}</AppText><AppText accessibilityRole="header" variant="pageTitle" style={styles.center}>{title}</AppText><AppText variant="body" tone="muted" style={styles.center}>{body}</AppText><View style={styles.actions}>{children}</View></ScrollView></SafeAreaView>;
}
function Count({ value, label }: { value: number; label: string }) { return <View style={styles.count}><AppText variant="pageTitle">{value}</AppText><AppText variant="metadata" tone="muted">{label}</AppText></View>; }
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center' }, content: { alignItems: 'center', padding: 24 }, center: { textAlign: 'center', marginTop: 10 }, actions: { alignSelf: 'stretch', gap: 10, marginTop: 26 }, counts: { flexDirection: 'row', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 8 }, count: { alignItems: 'center' } });
