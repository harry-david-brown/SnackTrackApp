import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@components/ui/AppButton';
import { FontFamily, HistoryPreviewColors as Palette } from '@constants/theme';
import type { ProviderExportLifecycleStatus } from '@features/import-flow/contracts';
import { trackAdminEvent } from '@services/adminAnalytics';

interface WrappedUpsellFinaleProps {
  exportStatus: ProviderExportLifecycleStatus;
  providerName?: string | null;
  onUnlock: () => void;
  onManage: () => void;
  onFinish: () => void;
}

export function WrappedUpsellFinale({ exportStatus, providerName, onUnlock, onManage, onFinish }: WrappedUpsellFinaleProps) {
  const active = exportStatus === 'requested' || exportStatus === 'file_ready' || exportStatus === 'import_processing' || exportStatus === 'failed';
  const activeCopy = exportStatus === 'requested'
    ? `${providerName ?? 'Your provider'} is preparing your history.`
    : exportStatus === 'file_ready'
      ? 'Your detailed history is ready to bring into SnackTrack.'
      : exportStatus === 'import_processing'
        ? 'Your detailed history is being added now.'
        : 'Your detailed-history import needs another try.';

  return (
    <LinearGradient colors={[Palette.background, Palette.backgroundEnd]} style={styles.fill}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>{active ? 'YOUR DETAILED HISTORY' : 'THERE’S MORE IN YOUR HISTORY'}</Text>
          <Text accessibilityRole="header" style={styles.title}>{active ? activeCopy : 'Same cravings.\nBigger fees?'}</Text>
          <Text style={styles.body}>{active ? 'You can pick up exactly where you left off in Data & tracking.' : 'Add detailed order history to discover what’s changed—and what you keep coming back for.'}</Text>
          {!active ? <>
            <FeeInsightPreview />
            <Text style={styles.sectionLabel}>MORE HIDING IN YOUR HISTORY</Text>
            <InsightPreview icon="fast-food-outline" title="Your food obsessions" body="How many nuggets, coffees, or hash browns are in your history?" />
            <View style={styles.more}>
              <View style={styles.moreIcon}><Ionicons name="sparkles-outline" size={17} color={Palette.gold} accessible={false} /></View>
              <View style={styles.copy}>
                <Text style={styles.moreTitle}>And that’s just a taste.</Text>
                <Text style={styles.cardBody}>Delivery records. Changing favourites.{'\n'}More stories only your orders could tell.</Text>
              </View>
            </View>
          </> : null}
          <View style={[styles.actions, active && styles.activeActions]}>
            {!active ? <Text style={styles.how}>We’ll guide you through requesting and uploading your detailed history.</Text> : null}
            <AppButton variant="gold" label={active ? 'Open Data & tracking' : 'Add detailed order history'} icon="arrow-forward" onPress={() => {
              void trackAdminEvent('deeper_stats_selected').catch(() => undefined);
              if (active) onManage();
              else onUnlock();
            }} />
            <TouchableOpacity accessibilityRole="button" onPress={onFinish} style={styles.finishButton}>
              <Text style={styles.finishText}>Finish for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

/** Illustrative marketing figures, never personal receipt-derived analytics. */
function FeeInsightPreview() {
  return <View style={styles.feeCard} accessible accessibilityLabel="Example insight. Delivery and service fees, 67 percent higher over the past 2 years. Average per order from 4 dollars 48 cents to 7 dollars 48 cents. Illustrative figures, not your personal fees.">
    <View style={styles.feeHeader}>
      <Ionicons name="receipt-outline" size={17} color={Palette.gold} accessible={false} />
      <Text style={styles.feeEyebrow}>The cost of convenience</Text>
      <Text style={styles.exampleBadge}>Example</Text>
    </View>
    <Text style={styles.feeLabel}>Delivery + service fees</Text>
    <View style={styles.increaseRow}><Text style={styles.percentage}>67%</Text><Text style={styles.higher}>higher</Text></View>
    <Text style={styles.period}>over the past 2 years</Text>
    <View style={styles.averageRow}><Text style={styles.averageLabel}>Average per order</Text><Text style={styles.averageValue}>$4.48 → $7.48</Text></View>
    <Text style={styles.exampleNote}>Example insight · Find out how your fees changed.</Text>
  </View>;
}

function InsightPreview({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return <View style={styles.insightPreview}>
    <View style={styles.insightMedia}><Ionicons name={icon} size={21} color={Palette.gold} accessible={false} /></View>
    <View style={styles.copy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardBody}>{body}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 21, paddingTop: 12, paddingBottom: 8 },
  eyebrow: { color: Palette.gold, fontFamily: FontFamily.medium, fontSize: 10, lineHeight: 15, letterSpacing: 1.4, marginBottom: 7 },
  title: { color: Palette.text, fontFamily: FontFamily.display, fontSize: 32, lineHeight: 34, letterSpacing: -0.6 },
  body: { color: Palette.muted, fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 16 },
  feeCard: { backgroundColor: Palette.surface, borderColor: Palette.surfaceBorder, borderWidth: 1, borderRadius: 21, padding: 14 },
  feeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  feeEyebrow: { flex: 1, color: Palette.gold, fontFamily: FontFamily.medium, fontSize: 11, lineHeight: 16 },
  exampleBadge: { color: Palette.muted, fontFamily: FontFamily.regular, fontSize: 10, lineHeight: 15, borderWidth: 1, borderColor: Palette.surfaceBorder, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  feeLabel: { color: Palette.text, fontFamily: FontFamily.medium, fontSize: 15, lineHeight: 21, marginTop: 13, marginBottom: 1 },
  increaseRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 9 },
  percentage: { color: Palette.gold, fontFamily: FontFamily.display, fontSize: 50, lineHeight: 54, letterSpacing: -2 },
  higher: { color: Palette.gold, fontFamily: FontFamily.medium, fontSize: 21, lineHeight: 27, letterSpacing: -0.5 },
  period: { color: Palette.muted, fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19 },
  averageRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  averageLabel: { color: Palette.subtle, fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 20 },
  averageValue: { color: Palette.text, fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 22, fontVariant: ['tabular-nums'] },
  exampleNote: { color: Palette.subtle, fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 16, marginTop: 12 },
  sectionLabel: { color: Palette.subtle, fontFamily: FontFamily.medium, fontSize: 10, lineHeight: 15, letterSpacing: 1.4, marginTop: 16, marginBottom: 1 },
  insightPreview: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11 },
  insightMedia: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.iconSurface },
  copy: { flex: 1 },
  cardTitle: { color: Palette.text, fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 },
  cardBody: { color: Palette.muted, fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 18, marginTop: 3 },
  more: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingVertical: 13, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Palette.divider },
  moreIcon: { width: 42, alignItems: 'center', paddingTop: 2 },
  moreTitle: { color: Palette.gold, fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 },
  actions: { width: '100%', marginTop: 16, gap: 2 },
  activeActions: { marginTop: 'auto', paddingTop: 22 },
  how: { color: Palette.muted, fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 16, textAlign: 'center', maxWidth: 280, alignSelf: 'center', marginBottom: 6 },
  finishButton: { minHeight: 44, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  finishText: { color: Palette.muted, fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 18 },
});

export default WrappedUpsellFinale;
