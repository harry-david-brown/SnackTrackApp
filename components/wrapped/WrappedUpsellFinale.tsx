import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot } from '@components/mascot/Mascot';
import { AppButton } from '@components/ui/AppButton';
import { Colors, FontFamily } from '@constants/theme';
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
    <LinearGradient colors={[Colors.hallDeep, Colors.indigoDeep, Colors.hallGold]} locations={[0, 0.68, 1]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>THAT’S JUST THE SURFACE</Text>
          <Text style={styles.title}>{active ? activeCopy : 'Complete the picture. Unlock the good stuff.'}</Text>
          <Text style={styles.body}>{active ? 'You can pick up exactly where you left off in Data & tracking.' : 'Detailed order history can reveal the patterns a receipt alone can’t see.'}</Text>

          {!active ? <>
            <InsightPreview icon={<Mascot pose="prop-receipt" size={72} variant="outline" accessibilityLabel="SnackTrack checking a receipt" />} title="Your menu soulmate" body="The exact item you reorder most—and how often." />
            <InsightPreview icon={<Mascot pose="sunglasses" size={72} variant="outline" accessibilityLabel="SnackTrack celebrating delivery records" />} title="Your delivery records" body="Fastest arrival, longest wait, and biggest order." />
            <InsightPreview icon={<Ionicons name="fast-food-outline" size={36} color={Colors.evidenceGold} />} title="Your item obsessions" body="Favorite sides, sauces, quantities, and repeat combos." />
          </> : null}

          <View style={styles.actions}>
            <AppButton variant="gold" label={active ? 'Open Data & tracking' : 'Unlock deeper stats'} icon={active ? 'arrow-forward' : 'sparkles'} onPress={() => {
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

function InsightPreview({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <View style={styles.insightPreview}><View style={styles.insightMedia}>{icon}</View><View style={styles.cardCopy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardBody}>{body}</Text></View></View>;
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 22 },
  eyebrow: { alignSelf: 'stretch', color: Colors.evidenceGold, fontFamily: FontFamily.medium, fontSize: 12, letterSpacing: 1.2, marginTop: 4, textAlign: 'left' },
  title: { alignSelf: 'stretch', color: Colors.white, fontFamily: FontFamily.display, fontSize: 33, lineHeight: 35, marginTop: 6, textAlign: 'left' },
  body: { alignSelf: 'stretch', color: Colors.alpha(Colors.white, 0.78), fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20, marginTop: 9, marginBottom: 12, textAlign: 'left' },
  insightPreview: { width: '100%', minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: Colors.alpha(Colors.white, 0.15), backgroundColor: Colors.alpha(Colors.white, 0.09), marginBottom: 9 },
  insightMedia: { width: 78, minHeight: 72, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1 },
  cardTitle: { color: Colors.white, fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 18 },
  cardBody: { color: Colors.alpha(Colors.white, 0.72), fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16, marginTop: 4 },
  actions: { width: '100%', marginTop: 'auto', paddingTop: 10, gap: 4 },
  finishButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  finishText: { color: Colors.white, fontFamily: FontFamily.medium, fontSize: 13 },
});

export default WrappedUpsellFinale;
