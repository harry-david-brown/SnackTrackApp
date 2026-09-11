import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot } from '@components/mascot/Mascot';
import WrappedShareJourney from '@components/wrapped/WrappedShareJourney';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';
import { Card } from '@components/ui/Card';
import { Colors, FontFamily, Radius, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useCurrency } from '@contexts/CurrencyContext';
import { useWrappedJourneyController } from '@hooks/useWrappedJourneyController';
import type { UserSummary } from '@/types/api';
import { resolveWrappedJourneyInstanceKey } from '@features/wrapped/wrappedNavigation';
import { experienceApi } from '@services/experienceApi';
import { suppressAdsForSession } from '@features/ads/adSession';
import { useUser } from '@contexts/UserContext';
import { trackAdminEvent } from '@services/adminAnalytics';
import { appDestinations, useAppNavigation } from '@features/navigation';

type WrappedSummary = UserSummary & { wrappedAnalytics: NonNullable<UserSummary['wrappedAnalytics']> };
const hasWrappedData = (summary: UserSummary | null): summary is WrappedSummary =>
  Boolean(summary?.wrappedAnalytics && summary.totalReceipts && summary.totalReceipts > 0);

export default function WrappedJourneyScreen() {
  const navigation = useAppNavigation();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const route = useLocalSearchParams<{ restart?: string | string[]; entryPoint?: string | string[] }>();
  const { state: userState } = useUser();
  const journey = useWrappedJourneyController();
  const { formatCurrency } = useCurrency();
  const restartToken = useMemo(() => Array.isArray(route.restart) ? route.restart[0] : route.restart, [route.restart]);
  const rawEntryPoint = Array.isArray(route.entryPoint) ? route.entryPoint[0] : route.entryPoint;
  const entryPoint = rawEntryPoint === 'notification' ? 'notification' as const : rawEntryPoint === 'automatic_first_import' ? 'automatic_first_import' as const : 'summary' as const;
  const [showJourney, setShowJourney] = useState(Boolean(restartToken) || entryPoint !== 'summary');
  const [recapSeenRecorded, setRecapSeenRecorded] = useState(false);
  const visibleJourneyRecorded = useRef(false);
  const feeTrend = journey.analytics?.wrappedAnalytics?.comparative.deliveryFeeTrend;

  useEffect(() => {
    if (restartToken) {
      setShowJourney(true);
    }
  }, [restartToken]);
  useEffect(() => {
    if (feeTrend) void trackAdminEvent('fee_trend_displayed', { properties: { trend: feeTrend.trend, coveredOrderCount: feeTrend.coveredOrderCount } }).catch(() => undefined);
  }, [feeTrend]);

  const recordFirstSlide = useCallback(() => {
    if (recapSeenRecorded) return;
    setRecapSeenRecorded(true);
    if (userState.user?.id) suppressAdsForSession(userState.user.id);
    void experienceApi.markFirstRecapSeen().catch(() => setRecapSeenRecorded(false));
  }, [recapSeenRecorded, userState.user?.id]);

  useEffect(() => {
    if (!showJourney) {
      visibleJourneyRecorded.current = false;
      return;
    }
    if (!hasWrappedData(journey.analytics) || visibleJourneyRecorded.current) return;
    visibleJourneyRecorded.current = true;
    recordFirstSlide();
  }, [journey.analytics, recordFirstSlide, showJourney]);

  if (journey.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Mascot pose="thinking" size={104} />
        <ActivityIndicator style={styles.loader} size="small" color={theme.colors.primary} />
        <AppText variant="body" style={styles.loadingText}>Preparing your summary…</AppText>
      </View>
    );
  }

  if (!hasWrappedData(journey.analytics)) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={['top']}>
        <Mascot pose="prop-receipt" size={132} />
        <AppText variant="pageTitle" style={styles.emptyTitle}>Your summary starts with one order</AppText>
        <AppText variant="body" style={styles.emptySubtitle}>Add delivery history, then SnackTrack can turn it into totals, habits, and a recap.</AppText>
        <AppButton label="Add orders" icon="add-circle-outline" onPress={journey.openImport} />
      </SafeAreaView>
    );
  }

  if (showJourney) {
    return (
      <WrappedShareJourney
        key={resolveWrappedJourneyInstanceKey(journey.dataUpdatedAt, route.restart)}
        analytics={journey.analytics}
        exportStatus={journey.exportStatus}
        exportProviderName={journey.exportProviderName}
        onExportUpsellSeen={journey.markExportOfferSeen}
        onExportUpgrade={journey.openExportUpgrade}
        onExportTutorial={journey.openExportTutorial}
        onFinishPostWrapped={() => setShowJourney(false)}
        onClose={() => setShowJourney(false)}
        entryPoint={entryPoint}
      />
    );
  }

  const topRestaurant = journey.analytics.topRestaurants[0];
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader eyebrow="YOUR SNACKTRACK" title="Summary" body="The big picture from all the delivery history you’ve added." />

        <LinearGradient colors={[Colors.secondary, Colors.primary]} style={styles.hero}>
          <View style={styles.heroCopy}>
            <AppText variant="metadata" style={styles.heroLabel}>All-time delivery spend</AppText>
            <AppText variant="heroValue" style={styles.heroValue} adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1}>{formatCurrency(journey.analytics.totalSpent)}</AppText>
            <AppText variant="metadata" style={styles.heroMeta}>{journey.analytics.totalReceipts} {journey.analytics.totalReceipts === 1 ? 'order' : 'orders'} in your history</AppText>
          </View>
          <Mascot pose="sunglasses" size={118} variant="outline" />
        </LinearGradient>

        <View style={styles.stats}>
          <Card style={styles.statCard}>
            <Ionicons name="receipt-outline" size={20} color={theme.colors.primary} />
            <AppText variant="surfaceTitle" style={styles.statValue}>{formatCurrency(journey.analytics.averageOrderValue)}</AppText>
            <AppText variant="metadata" style={styles.statLabel}>Average order</AppText>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="restaurant-outline" size={20} color={theme.colors.primary} />
            <AppText variant="surfaceTitle" style={styles.statValue} numberOfLines={2}>{topRestaurant?.name ?? 'Still learning'}</AppText>
            <AppText variant="metadata" style={styles.statLabel}>Top restaurant</AppText>
          </Card>
        </View>

        {feeTrend ? <Card style={styles.feeCard}>
          <View style={styles.recapIcon}><Ionicons name="trending-up-outline" size={24} color={theme.colors.primary} /></View>
          <View style={styles.recapCopy}>
            <AppText variant="surfaceTitle" style={styles.recapTitle}>{feeTrend.trend === 'increased' ? 'Your food wasn’t the only thing getting pricier' : feeTrend.trend === 'decreased' ? 'The delivery companies actually eased up' : 'Delivery-company fees held steady'}</AppText>
            <AppText variant="surfaceBody" style={styles.recapBody}>Average delivery and service fees {feeTrend.trend === 'flat' ? 'were broadly flat' : `${feeTrend.trend} by ${Math.abs(feeTrend.companyFeeChangePercent).toFixed(0)}%`} from {feeTrend.earliestPeriod.quarter} to {feeTrend.latestPeriod.quarter}, based on {feeTrend.coveredOrderCount} receipts with explicit fee detail.</AppText>
          </View>
        </Card> : null}

        <Card style={styles.recapCard}>
          <View style={styles.recapIcon}><Ionicons name="sparkles" size={24} color={theme.colors.primary} /></View>
          <View style={styles.recapCopy}>
            <AppText variant="surfaceTitle" style={styles.recapTitle}>Replay the fun version</AppText>
            <AppText variant="surfaceBody" style={styles.recapBody}>Your personalized, shareable SnackTrack recap is ready whenever you are.</AppText>
          </View>
        </Card>
        <AppButton label="Play my recap" icon="play" onPress={() => setShowJourney(true)} />
        <View style={styles.secondaryAction}>
          <AppButton label="View order history" variant="secondary" icon="time-outline" onPress={() => navigation.open(appDestinations.history)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 18, paddingBottom: 36 },
  hero: { minHeight: 184, padding: 20, borderRadius: Radius.card, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  heroCopy: { flex: 1, zIndex: 1 },
  heroLabel: { color: Colors.alpha(Colors.white, 0.82) },
  heroValue: { marginTop: 7, color: Colors.white, fontFamily: FontFamily.semibold },
  heroMeta: { marginTop: 9, color: Colors.alpha(Colors.white, 0.82) },
  stats: { flexDirection: 'row', gap: 12, marginTop: 12 },
  statCard: { flex: 1, minHeight: 122, padding: 16 },
  statValue: { marginTop: 15 },
  statLabel: { marginTop: 4 },
  recapCard: { marginTop: 22, marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center' },
  feeCard: { marginTop: 14, padding: 16, flexDirection: 'row', alignItems: 'center' },
  recapIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.alpha(theme.colors.primary, 0.1) },
  recapCopy: { flex: 1, marginLeft: 12 },
  recapTitle: {},
  recapBody: { marginTop: 3 },
  secondaryAction: { marginTop: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.background },
  loader: { marginTop: 10 },
  loadingText: { marginTop: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, backgroundColor: theme.colors.background },
  emptyTitle: { marginTop: 18, textAlign: 'center' },
  emptySubtitle: { marginTop: 10, marginBottom: 24, textAlign: 'center' },
});
