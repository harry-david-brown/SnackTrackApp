import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';
import WrappedShareJourney from '@components/wrapped/WrappedShareJourney';
import { Colors } from '@constants/theme';
import { useWrappedJourneyController } from '@hooks/useWrappedJourneyController';
import type { UserSummary } from '@/types/api';
import { resolveWrappedJourneyInstanceKey } from '@features/wrapped/wrappedNavigation';

type WrappedSummary = UserSummary & { wrappedAnalytics: NonNullable<UserSummary['wrappedAnalytics']> };
const hasWrappedData = (summary: UserSummary | null): summary is WrappedSummary =>
  Boolean(summary?.wrappedAnalytics && summary.totalReceipts && summary.totalReceipts > 0);

export default function WrappedJourneyScreen() {
  const [fontsLoaded] = useFonts({ Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  const route = useLocalSearchParams<{ restart?: string | string[] }>();
  const journey = useWrappedJourneyController();

  if (journey.isLoading || !fontsLoaded) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.white} /><Text style={styles.loadingText}>Preparing your summary...</Text></View>;
  }

  if (!hasWrappedData(journey.analytics)) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}><MascotPlaceholder pose="pointing" size={120} /></View>
        <Text style={styles.emptyTitle}>Your Wrapped Journey Awaits</Text>
        <Text style={styles.emptySubtitle}>Import receipts with Gmail to unlock your first recap fast, or upload an Uber Eats or DoorDash export for deeper history.</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={journey.openImport} accessibilityRole="button" accessibilityLabel="Import receipts">
          <Ionicons name="cloud-upload-outline" size={20} color={Colors.white} />
          <Text style={styles.emptyButtonText}>Import Receipts</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WrappedShareJourney
      key={resolveWrappedJourneyInstanceKey(journey.dataUpdatedAt, route.restart)}
      analytics={journey.analytics}
      postWrappedExperience={journey.postWrappedExperience}
      trackingState={journey.trackingState}
      trackingEligibility={journey.trackingEligibility}
      exportStatus={journey.exportStatus}
      areImportPreferencesUpdating={journey.areImportPreferencesUpdating}
      onTrackingDecision={journey.decideTracking}
      onManageGmail={journey.openImport}
      onExportUpsellSeen={journey.markExportOfferSeen}
      onExportUpgrade={journey.openExportUpgrade}
      onExportTutorial={journey.openExportTutorial}
      onFinishPostWrapped={journey.finish}
      onClose={journey.finish}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.secondary },
  loadingText: { marginTop: 16, color: Colors.white, fontSize: 16, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, backgroundColor: Colors.background },
  emptyIcon: { marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  emptySubtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.secondary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30 },
  emptyButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
