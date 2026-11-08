import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useImportPreferences } from '@hooks/useImportPreferences';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { Card } from '@components/ui/Card';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useOngoingUpdatesJourney } from '@hooks/useOngoingUpdatesJourney';
import { ongoingUpdatesCopy } from '@features/import-flow/ongoingUpdatesState';

export function OngoingUpdatesScreen({ reconsider = false, automatic = false }: { reconsider?: boolean; automatic?: boolean }) {
  const theme = useAppTheme();
  const journey = useOngoingUpdatesJourney(reconsider);
  const offersConsent = journey.state === 'eligible' || journey.state === 'disconnected';
  const focused = useIsFocused();
  const { acknowledgeAutomaticUpdatesOffer } = useImportPreferences();
  const acknowledged = useRef(false);
  useEffect(() => {
    if (!automatic || !focused || !offersConsent || acknowledged.current) return;
    acknowledged.current = true;
    void acknowledgeAutomaticUpdatesOffer().catch(() => { acknowledged.current = false; });
  }, [automatic, focused, offersConsent, acknowledgeAutomaticUpdatesOffer]);
  const copy = ongoingUpdatesCopy[journey.state];
  const icon = journey.state === 'eligible' ? 'leaf-outline' : journey.state === 'active' ? 'checkmark-done-outline' : journey.state === 'disconnected' || journey.state === 'reconnect' ? 'mail-outline' : 'sync-outline';
  return <SafeAreaView style={[styles.fill, { backgroundColor: theme.colors.background }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.art, { backgroundColor: theme.colors.infoBg }]}><Ionicons name={icon} size={32} color={theme.colors.primary} accessible={false} /></View>
      <AppText variant="eyebrow" tone="brand">{copy.eyebrow}</AppText>
      <AppText variant="pageTitle" accessibilityRole="header" style={styles.title}>{copy.title}</AppText>
      <AppText variant="body" tone="muted" style={styles.body}>{copy.body}</AppText>
      {journey.state === 'eligible' ? <>
        <Card style={styles.card}>
          <View style={styles.benefit}><Ionicons name="receipt-outline" size={20} color={theme.colors.primary} accessible={false} /><View style={styles.copy}><AppText variant="surfaceTitle">New receipts, added automatically</AppText><AppText variant="surfaceBody" tone="muted">Your stats grow as supported orders arrive.</AppText></View></View>
          <View style={[styles.benefit, styles.divided, { borderColor: theme.colors.divider }]}><Ionicons name="options-outline" size={20} color={theme.colors.primary} accessible={false} /><View style={styles.copy}><AppText variant="surfaceTitle">You’re in control</AppText><AppText variant="surfaceBody" tone="muted">Turn updates off anytime in Accounts &amp; permissions.</AppText></View></View>
        </Card>
        <AppText variant="metadata" tone="muted" style={styles.note}>Device notifications are a separate choice.</AppText>
      </> : <Card style={styles.card}><AppText variant="surfaceBody" tone="muted" accessibilityLiveRegion="polite">{copy.note}</AppText></Card>}
      <View style={styles.actions}>
        {journey.chooseInbox ? <>
          <AppButton label="Connect Gmail" disabled={journey.busy} onPress={() => journey.connect('gmail')} />
          <AppButton label="Connect Outlook" variant="secondary" disabled={journey.busy} onPress={() => journey.connect('outlook')} />
        </> : <AppButton label={copy.action} pending={journey.busy} onPress={journey.primary} />}
        <AppButton label={offersConsent ? 'Not now' : 'Go home for now'} variant="tertiary" disabled={journey.busy} onPress={offersConsent ? journey.decline : journey.leave} />
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, content: { flexGrow: 1, padding: 24 }, art: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 24 }, title: { marginTop: 8 }, body: { marginTop: 12, marginBottom: 24 }, card: { padding: 18 }, benefit: { flexDirection: 'row', gap: 12 }, copy: { flex: 1, gap: 4 }, divided: { borderTopWidth: 1, marginTop: 14, paddingTop: 14 }, note: { textAlign: 'center', marginTop: 14 }, actions: { marginTop: 'auto', paddingTop: 28, gap: 8 } });
