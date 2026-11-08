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
          {!active ? <View style={styles.recapContext}>
            <Ionicons name="checkmark" size={15} color={Palette.gold} accessible={false} />
            <Text style={styles.recapContextText}>Your recap, wrapped.</Text>
          </View> : null}
          <Text style={styles.eyebrow}>{active ? 'YOUR DETAILED HISTORY' : 'THE NEXT CHAPTER'}</Text>
          <Text accessibilityRole="header" style={styles.title}>{active ? activeCopy : 'There’s more to\nyour order story.'}</Text>
          <Text style={styles.body}>{active ? 'You can pick up exactly where you left off in Data & tracking.' : 'Bring in your detailed history to explore the little things behind the total.'}</Text>
          {!active ? <>
            <View style={styles.previews}>
              <InsightPreview icon="receipt-outline" title="The cost of convenience" body="See how delivery and service fees have changed over time." />
              <InsightPreview icon="fast-food-outline" title="Your usual, revealed" body="The items you come back to. And just how often." />
              <InsightPreview icon="timer-outline" title="Deliveries to remember" body="Explore your quickest arrivals and longest waits." />
            </View>
            <Text style={styles.availability}>What you discover depends on the details in your file.</Text>
          </> : null}
          <View style={styles.actions}>
            {!active ? <Text style={styles.how}>Request your history from your delivery app, then upload it here. We’ll guide you.</Text> : null}
            <AppButton variant="gold" label={active ? 'Open Data & tracking' : 'Add detailed history'} icon="arrow-forward" onPress={() => {
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

function InsightPreview({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return <View style={styles.insightPreview}>
    <View style={styles.insightMedia}><Ionicons name={icon} size={26} color={Palette.gold} accessible={false} /></View>
    <View style={styles.copy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardBody}>{body}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 },
  recapContext: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  recapContextText: { color: Palette.muted, fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 18 },
  eyebrow: { color: Palette.gold, fontFamily: FontFamily.medium, fontSize: 11, lineHeight: 15, letterSpacing: 1.5, marginBottom: 9 },
  title: { color: Palette.text, fontFamily: FontFamily.display, fontSize: 35, lineHeight: 38, letterSpacing: -0.6 },
  body: { color: Palette.muted, fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22, marginTop: 13, marginBottom: 24 },
  previews: { gap: 10 },
  insightPreview: { flexDirection: 'row', alignItems: 'center', gap: 15, minHeight: 91, paddingVertical: 16, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Palette.surface, borderColor: Palette.surfaceBorder, borderWidth: 1 },
  insightMedia: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.iconSurface },
  copy: { flex: 1 },
  cardTitle: { color: Palette.text, fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 19 },
  cardBody: { color: Palette.muted, fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 18, marginTop: 5 },
  availability: { color: Palette.muted, fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 14 },
  actions: { width: '100%', marginTop: 'auto', paddingTop: 28, gap: 5 },
  how: { color: Palette.muted, fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 19, textAlign: 'center', maxWidth: 300, alignSelf: 'center', marginBottom: 10 },
  finishButton: { minHeight: 48, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  finishText: { color: Palette.muted, fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 19 },
});

export default WrappedUpsellFinale;
