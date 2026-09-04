import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import mobileAds, {
  AdsConsent,
  NativeAd,
  NativeAdChoicesPlacement,
  NativeAdEventType,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaAspectRatio,
  NativeMediaView,
  RevenuePrecisions,
  TestIds,
} from 'react-native-google-mobile-ads';
import { Card } from '@components/ui/Card';
import { Colors, Radius, Spacing } from '@constants/theme';
import { getConfig } from '@config/env';
import type { AdPlacement } from './contracts';
import { trackAdminEvent } from '@services/adminAnalytics';

interface Props {
  placement: AdPlacement;
  configurationVersion: number;
  onImpression: () => void;
}

let initialization: Promise<void> | null = null;
const initializeAds = async (): Promise<boolean> => {
  const consent = await AdsConsent.gatherConsent();
  if (!consent.canRequestAds) return false;
  initialization ??= mobileAds().initialize().then(() => undefined).catch(error => {
    initialization = null;
    throw error;
  });
  await initialization;
  return true;
};

const precisionName = (precision: RevenuePrecisions): string => ({
  [RevenuePrecisions.UNKNOWN]: 'unknown',
  [RevenuePrecisions.ESTIMATED]: 'estimated',
  [RevenuePrecisions.PUBLISHER_PROVIDED]: 'publisher_provided',
  [RevenuePrecisions.PRECISE]: 'precise',
}[precision] ?? 'unknown');

const safeErrorCode = (error: unknown): string => {
  const raw = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : 'UNKNOWN';
  return raw.toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 80) || 'UNKNOWN';
};

const nativeUnitId = (): string | null => {
  const configuration = getConfig();
  if (!configuration.isProduction) return TestIds.NATIVE;
  return Platform.OS === 'ios'
    ? configuration.admobNativeIosAdUnitId ?? null
    : configuration.admobNativeAndroidAdUnitId ?? null;
};

const eventProperties = (placement: AdPlacement, configurationVersion: number) => ({
  placement,
  source: 'admob' as const,
  configurationVersion,
});

export function DashboardAdPlacement({ placement, configurationVersion, onImpression }: Props) {
  const compact = placement === 'history_after_fifth_order';
  const [nativeAd, setNativeAd] = React.useState<NativeAd | null>(null);
  const [failed, setFailed] = React.useState(false);
  const impressionRecorded = React.useRef(false);
  const properties = React.useMemo(
    () => eventProperties(placement, configurationVersion),
    [configurationVersion, placement],
  );

  React.useEffect(() => {
    let cancelled = false;
    let loadedAd: NativeAd | null = null;
    impressionRecorded.current = false;
    setNativeAd(null);
    setFailed(false);

    const load = async () => {
      let requestStarted = false;
      try {
        if (!await initializeAds()) { if (!cancelled) setFailed(true); return; }
        if (cancelled) return;
        const unitId = nativeUnitId();
        if (!unitId) { if (!cancelled) setFailed(true); return; }
        requestStarted = true;
        void trackAdminEvent('ad_request_started', { properties }).catch(() => undefined);
        loadedAd = await NativeAd.createForAdRequest(unitId, {
          requestNonPersonalizedAdsOnly: true,
          aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
          adChoicesPlacement: NativeAdChoicesPlacement.TOP_RIGHT,
          startVideoMuted: true,
        });
        if (cancelled) {
          loadedAd.destroy();
          return;
        }
        void trackAdminEvent('ad_loaded', { properties }).catch(() => undefined);
        setNativeAd(loadedAd);
      } catch (error) {
        if (!cancelled && requestStarted) {
          void trackAdminEvent('ad_load_failed', {
            properties: { ...properties, errorCode: safeErrorCode(error) },
          }).catch(() => undefined);
        }
        if (!cancelled) setFailed(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
      loadedAd?.destroy();
    };
  }, [properties]);

  React.useEffect(() => {
    if (!nativeAd) return;
    const subscriptions = [
      nativeAd.addAdEventListener(NativeAdEventType.IMPRESSION, () => {
        if (impressionRecorded.current) return;
        impressionRecorded.current = true;
        onImpression();
        void trackAdminEvent('ad_impression', { properties }).catch(() => undefined);
      }),
      nativeAd.addAdEventListener(NativeAdEventType.CLICKED, () => {
        void trackAdminEvent('ad_clicked', { properties }).catch(() => undefined);
      }),
      nativeAd.addAdEventListener(NativeAdEventType.PAID, payload => {
        void trackAdminEvent('ad_revenue_paid', {
          properties: {
            ...properties,
            currency: payload.currencyCode.toUpperCase().slice(0, 3),
            valueMicros: Math.max(0, Math.round(payload.value)),
            precision: precisionName(payload.precision),
          },
        }).catch(() => undefined);
      }),
    ];
    return () => subscriptions.forEach(subscription => subscription.remove());
  }, [nativeAd, onImpression, properties]);

  if (failed) return null;
  if (!nativeAd) return <View style={[styles.reservedSlot, compact && styles.compactReservedSlot]} accessibilityLabel="Loading sponsored content">
    <View style={styles.skeletonLabel} />
    <View style={styles.skeletonLine} />
    <View style={styles.skeletonMedia} />
  </View>;
  return <NativeAdView nativeAd={nativeAd} style={styles.nativeView}>
    <Card style={[styles.card, compact && styles.compactCard]}>
      <View style={styles.header}>
        {nativeAd.icon ? <NativeAsset assetType={NativeAssetType.ICON}>
          <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} accessibilityElementsHidden />
        </NativeAsset> : null}
        <View style={styles.titleColumn}>
          <Text style={styles.sponsored} accessibilityLabel="Sponsored advertisement">SPONSORED</Text>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline}>{nativeAd.headline}</Text>
          </NativeAsset>
          {nativeAd.advertiser ? <NativeAsset assetType={NativeAssetType.ADVERTISER}>
            <Text style={styles.advertiser}>{nativeAd.advertiser}</Text>
          </NativeAsset> : null}
        </View>
      </View>
      {!compact ? <NativeMediaView style={styles.media} resizeMode="cover" /> : null}
      <NativeAsset assetType={NativeAssetType.BODY}>
        <Text style={styles.body} numberOfLines={compact ? 2 : undefined}>{nativeAd.body}</Text>
      </NativeAsset>
      <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
        <View style={styles.action} accessible accessibilityRole="button" accessibilityLabel={nativeAd.callToAction}>
          <Text style={styles.actionText}>{nativeAd.callToAction}</Text>
        </View>
      </NativeAsset>
    </Card>
  </NativeAdView>;
}

const styles = StyleSheet.create({
  reservedSlot: { minHeight: 278, marginTop: Spacing.xl, padding: Spacing.lg, borderRadius: Radius.card, backgroundColor: Colors.surface, gap: Spacing.md },
  compactReservedSlot: { minHeight: 126, marginTop: 10 },
  skeletonLabel: { width: 82, height: 10, borderRadius: 5, backgroundColor: Colors.gray100 },
  skeletonLine: { width: '72%', height: 18, borderRadius: 7, backgroundColor: Colors.gray100 },
  skeletonMedia: { flex: 1, minHeight: 150, borderRadius: Radius.md, backgroundColor: Colors.gray50 },
  nativeView: { marginTop: Spacing.xl },
  card: { padding: Spacing.lg, overflow: 'hidden', gap: Spacing.md },
  compactCard: { padding: 14, gap: 9, borderRadius: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingRight: 24 },
  icon: { width: 44, height: 44, borderRadius: Radius.md },
  titleColumn: { flex: 1, gap: 2 },
  sponsored: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  headline: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  advertiser: { color: Colors.textSecondary, fontSize: 13 },
  media: { minHeight: 120, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.gray50 },
  body: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  action: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.button, backgroundColor: Colors.primary },
  actionText: { color: Colors.buttonPrimaryText, fontSize: 15, fontWeight: '700' },
});
