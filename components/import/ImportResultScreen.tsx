import { importReturnDestination, type ImportReturnTo } from '@features/import-flow/importNavigation';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot } from '@components/mascot/Mascot';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { resolveImportOperationRecovery } from '@features/import-flow/importOperationRecovery';
import { resolveImportOperationResult } from '@features/import-flow/importOperationResult';
import { resolvePostImportDestination } from '@features/import-flow/postImportNavigation';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useImportOperation } from '@hooks/useImportOperation';
import { experienceApi } from '@services/experienceApi';

export function ImportResultScreen({ operationId, returnTo = 'home' }: { operationId?: string; returnTo?: ImportReturnTo }) {
  const theme = useAppTheme();
  const { operation, isLoading, isUnavailable, refresh } = useImportOperation(Boolean(operationId), false, operationId);
  const [summaryEligible, setSummaryEligible] = useState(false);
  const handledLegacy = useRef(false);
  const summary = useMemo(() => operation ? resolveImportOperationResult(operation) : null, [operation]);

  useEffect(() => {
    if (isUnavailable || !operation || operation.status !== 'succeeded') return;
    void experienceApi.getState().then(experience => {
      const destination = resolvePostImportDestination({ experience, outcome: 'succeeded' });
      setSummaryEligible(destination === 'automatic_recap' || experience.receiptCount >= experience.firstRecap.minimumOrderCount);
      if (operation.journeyContext === 'post_onboarding' || operation.journeyContext === 'routine' || handledLegacy.current) return;
      handledLegacy.current = true;
      if (destination === 'automatic_recap') {
        router.replace({ pathname: '/(tabs)/wrapped-journey', params: { auto: 'true', entryPoint: 'automatic_first_import' } });
      }
    }).catch(() => undefined);
  }, [operation, isUnavailable]);

  if (!operationId) return <ResultLayout pose="sad" eyebrow="YOUR HISTORY IS SAFE" title="We couldn’t find that import" body="The import link is incomplete. Choose another import to continue."><AppButton label="Choose another import" onPress={() => router.replace({ pathname: '/add-history', params: { returnTo } })} /></ResultLayout>;

  if (!isUnavailable && operation && ['awaiting_upload', 'pending_dispatch', 'queued', 'running', 'retrying'].includes(operation.status)) {
    return <Redirect href={{ pathname: '/import-progress', params: { operationId: operation.id, returnTo } }} />;
  }

  if (isLoading) return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;

  if (isUnavailable) return <ResultLayout pose="thinking" eyebrow="STATUS UNAVAILABLE" title="We couldn’t load this result" body="Your saved history is available. Try loading the status before starting the same import again."><AppButton label="Reload status" onPress={() => void refresh()} /><AppButton label="View order history" variant="secondary" onPress={() => router.replace('/(tabs)/history')} /></ResultLayout>;

  if (!operation || !summary) return <ResultLayout pose="sad" eyebrow="YOUR HISTORY IS SAFE" title="We couldn’t find that import" body="It may have expired or been replaced. Choose another import to continue."><AppButton label="Choose another import" onPress={() => router.replace({ pathname: '/add-history', params: { returnTo } })} /></ResultLayout>;

  if (operation.status !== 'succeeded') {
    const recovery = resolveImportOperationRecovery(operation, returnTo);
    const ended = operation.status === 'expired' || operation.status === 'superseded' || operation.status === 'cancelled';
    return <ResultLayout pose="sad" eyebrow="YOUR HISTORY IS SAFE" title={ended ? 'This import is no longer active' : 'This import needs another try'} body={operation.errorMessage || (ended ? 'A newer import may have replaced it. Nothing already in SnackTrack was removed.' : 'We could not finish this import. Your saved order history is still available.')}>
      <AppButton label={recovery.label} onPress={() => router.replace(recovery.destination)} />
      <AppButton label="Choose another source" variant="secondary" onPress={() => router.replace({ pathname: '/add-history', params: { returnTo } })} />
    </ResultLayout>;
  }

  const nothingChanged = summary.changedOrders === 0;
  const duplicatesOnly = nothingChanged && (summary.unchangedOrders ?? 0) > 0;
  const empty = nothingChanged && summary.unchangedOrders === 0;
  const resultTitle = duplicatesOnly ? 'These orders are already saved' : empty ? 'No supported orders found' : nothingChanged ? 'No orders added or updated' : summary.changedOrders === null ? 'Your history was imported' : `${summary.changedOrders} orders added or updated`;
  const body = duplicatesOnly ? `All ${summary.unchangedOrders} supported orders found were already in your history. They were not added twice.` : empty ? `We didn’t find supported delivery orders in this ${summary.sourceName} import. Try another inbox or an original provider download.` : nothingChanged ? 'Your existing order history is unchanged.' : summary.importedOrders !== null && summary.changedOrders === null ? `${summary.sourceName} imported ${summary.importedOrders} supported orders. View your history to explore them.` : `${summary.sourceName} has finished updating your history.`;
  return <ResultLayout pose={nothingChanged ? 'thinking' : 'celebrate'} eyebrow="IMPORT COMPLETE" title={resultTitle} body={body}>
    <View style={styles.counts}>
      {summary.newOrders !== null ? <Count value={summary.newOrders} label="New" /> : null}
      {summary.updatedOrders !== null ? <Count value={summary.updatedOrders} label="Updated" /> : null}
      {summary.unchangedOrders !== null ? <Count value={summary.unchangedOrders} label="Already saved" /> : null}
    </View>
    <AppButton label="View order history" onPress={() => router.replace('/(tabs)/history')} />
    <AppButton label={empty ? 'Choose another source' : 'Add orders'} variant="secondary" onPress={() => router.replace({ pathname: '/add-history', params: { returnTo } })} />
    {summaryEligible ? <AppButton label="View Summary" variant="tertiary" onPress={() => router.replace('/(tabs)/wrapped-journey')} /> : null}
    <AppButton label="Close" variant="tertiary" onPress={() => router.replace(importReturnDestination(returnTo))} />
  </ResultLayout>;
}

function ResultLayout({ pose, eyebrow, title, body, children }: { pose: 'sad' | 'thinking' | 'celebrate'; eyebrow: string; title: string; body: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}><ScrollView contentContainerStyle={styles.content}><Mascot pose={pose} size={144} /><AppText variant="eyebrow" tone="brand">{eyebrow}</AppText><AppText accessibilityRole="header" variant="pageTitle" style={styles.center}>{title}</AppText><AppText variant="body" tone="muted" style={styles.center}>{body}</AppText><View style={styles.actions}>{children}</View></ScrollView></SafeAreaView>;
}
function Count({ value, label }: { value: number; label: string }) { return <View style={styles.count}><AppText variant="pageTitle">{value}</AppText><AppText variant="metadata" tone="muted">{label}</AppText></View>; }
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center' }, content: { alignItems: 'center', padding: 24 }, center: { textAlign: 'center', marginTop: 10 }, actions: { alignSelf: 'stretch', gap: 10, marginTop: 26 }, counts: { flexDirection: 'row', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 8 }, count: { alignItems: 'center' } });
