import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { UserSummary } from '@/types/api';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';
import { AppButton } from '@components/ui/AppButton';
import { Colors, Radius } from '@constants/theme';
import type { ProviderExportLifecycleStatus } from '@features/import-flow/contracts';
import { trackAdminEvent } from '@services/adminAnalytics';

interface WrappedUpsellFinaleProps {
  analytics: UserSummary;
  exportStatus: ProviderExportLifecycleStatus;
  providerName?: string | null;
  onUnlock: () => void;
  onManage: () => void;
  onFinish: () => void;
}

export function WrappedUpsellFinale({ analytics, exportStatus, providerName, onUnlock, onManage, onFinish }: WrappedUpsellFinaleProps) {
  const fee = analytics.wrappedAnalytics?.comparative.deliveryFeeTrend;
  const feeHeadline = fee?.trend === 'increased'
    ? 'Your food wasn’t the only thing getting pricier.'
    : fee?.trend === 'decreased'
      ? 'Did the delivery apps actually ease up?'
      : fee?.trend === 'flat'
        ? 'Your delivery fees held surprisingly steady.'
        : 'Delivery apps have some explaining to do.';
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
            <View style={styles.feeCard}>
              <View style={styles.cardIcon}><Ionicons name="trending-up" size={20} color={Colors.evidenceGold} /></View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardEyebrow}>DELIVERY-FEE TREND</Text>
                <Text style={styles.cardTitle}>{feeHeadline}</Text>
                <Text style={styles.cardBody}>{fee ? `Company fees ${fee.trend} ${Math.abs(fee.companyFeeChangePercent).toFixed(0)}% across your eligible history.` : 'See whether delivery companies quietly changed what they charged you over time.*'}</Text>
              </View>
            </View>
            <View style={styles.exampleRow}>
              <View style={styles.exampleCard}>
                <MascotPlaceholder pose="sunglasses" size={74} variant="outline" />
                <Text style={styles.exampleLabel}>MENU SOULMATE</Text>
                <Text style={styles.exampleValue}>Your exact repeat order</Text>
              </View>
              <View style={styles.exampleCard}>
                <Ionicons name="speedometer-outline" size={34} color={Colors.evidenceGold} />
                <Text style={styles.exampleLabel}>DELIVERY RECORDS</Text>
                <Text style={styles.exampleValue}>Fastest, longest, most loyal</Text>
              </View>
            </View>
            <Text style={styles.qualifier}>*Fee trends appear only when receipts contain enough explicit fee detail.</Text>
          </> : null}

          <View style={styles.actions}>
            <AppButton label={active ? 'Open Data & tracking' : 'Unlock deeper stats'} icon={active ? 'arrow-forward' : 'sparkles'} onPress={() => {
              void trackAdminEvent('deeper_stats_selected').catch(() => undefined);
              active ? onManage() : onUnlock();
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

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 42, paddingBottom: 28 },
  eyebrow: { color: Colors.evidenceGold, fontSize: 12, fontWeight: '700', letterSpacing: 1.6, textAlign: 'center' },
  title: { color: Colors.white, fontFamily: 'Fredoka_600SemiBold', fontSize: 34, lineHeight: 39, textAlign: 'center', marginTop: 11 },
  body: { color: Colors.alpha(Colors.white, 0.76), fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10, marginBottom: 20 },
  feeCard: { flexDirection: 'row', gap: 12, padding: 17, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.alpha(Colors.evidenceGold, 0.38), backgroundColor: Colors.alpha(Colors.white, 0.08) },
  cardIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.alpha(Colors.evidenceGold, 0.13) },
  cardCopy: { flex: 1 },
  cardEyebrow: { color: Colors.evidenceGold, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  cardTitle: { color: Colors.white, fontSize: 16, lineHeight: 21, fontWeight: '700', marginTop: 4 },
  cardBody: { color: Colors.alpha(Colors.white, 0.7), fontSize: 12, lineHeight: 17, marginTop: 5 },
  exampleRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  exampleCard: { flex: 1, minHeight: 148, padding: 14, borderRadius: 20, justifyContent: 'flex-end', backgroundColor: Colors.alpha(Colors.white, 0.075), borderWidth: 1, borderColor: Colors.alpha(Colors.white, 0.12) },
  exampleLabel: { color: Colors.evidenceGold, fontSize: 9, letterSpacing: 1, fontWeight: '700', marginTop: 6 },
  exampleValue: { color: Colors.white, fontSize: 14, lineHeight: 18, fontWeight: '600', marginTop: 4 },
  qualifier: { color: Colors.alpha(Colors.white, 0.52), fontSize: 10, lineHeight: 15, marginTop: 10 },
  actions: { marginTop: 22, gap: 10 },
  finishButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  finishText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
});

export default WrappedUpsellFinale;
