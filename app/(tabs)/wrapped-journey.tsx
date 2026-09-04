import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';
import WrappedShareJourney from '@components/wrapped/WrappedShareJourney';
import WrappedRecapIntro from '@components/wrapped/WrappedRecapIntro';
import { AppButton } from '@components/ui/AppButton';
import { Card } from '@components/ui/Card';
import { Colors, Radius } from '@constants/theme';
import { useCurrency } from '@contexts/CurrencyContext';
import { useWrappedJourneyController } from '@hooks/useWrappedJourneyController';
import type { UserSummary } from '@/types/api';
import { resolveWrappedJourneyInstanceKey } from '@features/wrapped/wrappedNavigation';
import { experienceApi } from '@services/experienceApi';
import { suppressAdsForSession } from '@features/ads/adSession';
import { useUser } from '@contexts/UserContext';
import { trackAdminEvent } from '@services/adminAnalytics';

type WrappedSummary = UserSummary & { wrappedAnalytics: NonNullable<UserSummary['wrappedAnalytics']> };
const hasWrappedData = (summary: UserSummary | null): summary is WrappedSummary =>
  Boolean(summary?.wrappedAnalytics && summary.totalReceipts && summary.totalReceipts > 0);

export default function WrappedJourneyScreen() {
  const [fontsLoaded] = useFonts({ Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  const route = useLocalSearchParams<{ restart?: string | string[]; auto?: string | string[]; entryPoint?: string | string[] }>();
  const { state: userState } = useUser();
  const journey = useWrappedJourneyController();
  const { formatCurrency } = useCurrency();
  const restartToken = useMemo(() => Array.isArray(route.restart) ? route.restart[0] : route.restart, [route.restart]);
  const automatic = (Array.isArray(route.auto) ? route.auto[0] : route.auto) === 'true';
  const entryPoint = (Array.isArray(route.entryPoint) ? route.entryPoint[0] : route.entryPoint) === 'notification'
    ? 'notification' as const : automatic ? 'automatic_first_import' as const : 'summary' as const;
  const [showJourney, setShowJourney] = useState(Boolean(restartToken) || automatic);
  const [showIntro, setShowIntro] = useState(true);
  const [recapSeenRecorded, setRecapSeenRecorded] = useState(false);
  const feeTrend = journey.analytics?.wrappedAnalytics?.comparative.deliveryFeeTrend;

  useEffect(() => {
    if (restartToken) {
      setShowIntro(true);
      setShowJourney(true);
    }
  }, [restartToken]);
  useEffect(() => {
    if (automatic) void trackAdminEvent('automatic_recap_launched', { properties: { entryPoint } }).catch(() => undefined);
  }, [automatic, entryPoint]);
  useEffect(() => {
    if (feeTrend) void trackAdminEvent('fee_trend_displayed', { properties: { trend: feeTrend.trend, coveredOrderCount: feeTrend.coveredOrderCount } }).catch(() => undefined);
  }, [feeTrend]);

  const recordFirstSlide = useCallback(() => {
    if (recapSeenRecorded) return;
    setRecapSeenRecorded(true);
    if (userState.user?.id) suppressAdsForSession(userState.user.id);
    void experienceApi.markFirstRecapSeen().catch(() => setRecapSeenRecorded(false));
  }, [recapSeenRecorded, userState.user?.id]);

  if (journey.isLoading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <MascotPlaceholder pose="thinking" size={104} />
        <ActivityIndicator style={styles.loader} size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>Preparing your summary…</Text>
      </View>
    );
  }

  if (!hasWrappedData(journey.analytics)) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={['top']}>
        <MascotPlaceholder pose="prop-receipt" size={132} />
        <Text style={styles.emptyTitle}>Your summary starts with one order</Text>
        <Text style={styles.emptySubtitle}>Add delivery history, then SnackTrack can turn it into totals, habits, and a recap.</Text>
        <AppButton label="Add order history" icon="add-circle-outline" onPress={journey.openImport} />
      </SafeAreaView>
    );
  }

  if (showJourney) {
    if (showIntro) {
      return <WrappedRecapIntro
        orderCount={journey.analytics.totalReceipts}
        entryPoint={entryPoint}
        onVisible={recordFirstSlide}
        onStart={() => setShowIntro(false)}
        onClose={() => setShowJourney(false)}
      />;
    }
    return (
      <WrappedShareJourney
        key={resolveWrappedJourneyInstanceKey(journey.dataUpdatedAt, route.restart)}
        analytics={journey.analytics}
        postWrappedExperience={journey.postWrappedExperience}
        trackingState={journey.trackingState}
        trackingEligibility={journey.trackingEligibility}
        exportStatus={journey.exportStatus}
        exportProviderName={journey.exportProviderName}
        areImportPreferencesUpdating={journey.areImportPreferencesUpdating}
        onTrackingDecision={journey.decideTracking}
        onManageEmail={journey.openTrackingSetup}
        onExportUpsellSeen={journey.markExportOfferSeen}
        onExportUpgrade={journey.openExportUpgrade}
        onExportTutorial={journey.openExportTutorial}
        onFinishPostWrapped={() => { setShowIntro(true); setShowJourney(false); }}
        onClose={() => { setShowIntro(true); setShowJourney(false); }}
        entryPoint={entryPoint}
      />
    );
  }

  const topRestaurant = journey.analytics.topRestaurants[0];
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>YOUR SNACKTRACK</Text>
        <Text style={styles.title}>Summary</Text>
        <Text style={styles.subtitle}>The big picture from all the delivery history you’ve added.</Text>

        <LinearGradient colors={[Colors.secondary, Colors.primary]} style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>All-time delivery spend</Text>
            <Text style={styles.heroValue} adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1}>{formatCurrency(journey.analytics.totalSpent)}</Text>
            <Text style={styles.heroMeta}>{journey.analytics.totalReceipts} {journey.analytics.totalReceipts === 1 ? 'order' : 'orders'} in your history</Text>
          </View>
          <MascotPlaceholder pose="sunglasses" size={118} variant="outline" />
        </LinearGradient>

        <View style={styles.stats}>
          <Card style={styles.statCard}>
            <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{formatCurrency(journey.analytics.averageOrderValue)}</Text>
            <Text style={styles.statLabel}>Average order</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="restaurant-outline" size={20} color={Colors.primary} />
            <Text style={styles.statValue} numberOfLines={1}>{topRestaurant?.name ?? 'Still learning'}</Text>
            <Text style={styles.statLabel}>Top restaurant</Text>
          </Card>
        </View>

        {feeTrend ? <Card style={styles.feeCard}>
          <View style={styles.recapIcon}><Ionicons name="trending-up-outline" size={24} color={Colors.primary} /></View>
          <View style={styles.recapCopy}>
            <Text style={styles.recapTitle}>{feeTrend.trend === 'increased' ? 'Your food wasn’t the only thing getting pricier' : feeTrend.trend === 'decreased' ? 'The delivery companies actually eased up' : 'Delivery-company fees held steady'}</Text>
            <Text style={styles.recapBody}>Average delivery and service fees {feeTrend.trend === 'flat' ? 'were broadly flat' : `${feeTrend.trend} by ${Math.abs(feeTrend.companyFeeChangePercent).toFixed(0)}%`} from {feeTrend.earliestPeriod.quarter} to {feeTrend.latestPeriod.quarter}, based on {feeTrend.coveredOrderCount} receipts with explicit fee detail.</Text>
          </View>
        </Card> : null}

        <Card style={styles.recapCard}>
          <View style={styles.recapIcon}><Ionicons name="sparkles" size={24} color={Colors.primary} /></View>
          <View style={styles.recapCopy}>
            <Text style={styles.recapTitle}>Ready for the fun version?</Text>
            <Text style={styles.recapBody}>Replay your personalized, shareable SnackTrack recap.</Text>
          </View>
        </Card>
        <AppButton label="Play my recap" icon="play" onPress={() => { setShowIntro(true); setShowJourney(true); }} />
        <View style={styles.secondaryAction}>
          <AppButton label="View order history" variant="secondary" icon="time-outline" onPress={() => router.push('/(tabs)/history')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 36 },
  eyebrow: { color: Colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { marginTop: 5, color: Colors.textPrimary, fontSize: 32, fontWeight: '600', letterSpacing: -0.5 },
  subtitle: { marginTop: 6, marginBottom: 22, color: Colors.textSecondary, fontSize: 15, lineHeight: 21 },
  hero: { minHeight: 184, padding: 20, borderRadius: Radius.card, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  heroCopy: { flex: 1, zIndex: 1 },
  heroLabel: { color: Colors.alpha(Colors.white, 0.82), fontSize: 13, fontWeight: '700' },
  heroValue: { marginTop: 7, color: Colors.white, fontSize: 34, fontWeight: '600' },
  heroMeta: { marginTop: 9, color: Colors.alpha(Colors.white, 0.82), fontSize: 13 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 12 },
  statCard: { flex: 1, minHeight: 122, padding: 16 },
  statValue: { marginTop: 15, color: Colors.textPrimary, fontSize: 17, fontWeight: '600' },
  statLabel: { marginTop: 4, color: Colors.textSecondary, fontSize: 12 },
  recapCard: { marginTop: 22, marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center' },
  feeCard: { marginTop: 14, padding: 16, flexDirection: 'row', alignItems: 'center' },
  recapIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.alpha(Colors.primary, 0.1) },
  recapCopy: { flex: 1, marginLeft: 12 },
  recapTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
  recapBody: { marginTop: 3, color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  secondaryAction: { marginTop: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: Colors.background },
  loader: { marginTop: 10 },
  loadingText: { marginTop: 10, color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, backgroundColor: Colors.background },
  emptyTitle: { marginTop: 18, fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { marginTop: 10, marginBottom: 24, fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
