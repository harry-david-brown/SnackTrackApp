import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { Surface } from '@components/ui/Surface';
import { useAppTheme } from '@contexts/AppearanceContext';
import type { ExportProvider } from '@features/import-flow/contracts';

import { PROVIDER_DOWNLOAD_STEPS, type ProviderDownloadStep } from './providerDownloadSteps';

interface ProviderDownloadGuideCarouselProps {
  provider: ExportProvider;
  onOpenEmail?: () => void;
}

export function ProviderDownloadGuideCarousel({ provider, onOpenEmail }: ProviderDownloadGuideCarouselProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedStep, setZoomedStep] = useState<ProviderDownloadStep | null>(null);
  const platform = provider === 'uber_eats' ? 'uber' : 'doordash';
  const steps = PROVIDER_DOWNLOAD_STEPS[platform];
  const slideWidth = Math.max(windowWidth - 36, 280);

  const goToStep = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, steps.length - 1));
    setCurrentIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * slideWidth, animated: true });
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setCurrentIndex(Math.max(0, Math.min(nextIndex, steps.length - 1)));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={styles.carouselContent}
        accessibilityLabel={`${platform === 'uber' ? 'Uber' : 'DoorDash'} download instructions`}
        testID="provider-download-guide-carousel"
      >
        {steps.map((step, index) => (
          <View
            key={step.title}
            style={[styles.slide, { width: slideWidth }]}
            accessibilityElementsHidden={index !== currentIndex}
            importantForAccessibility={index === currentIndex ? 'auto' : 'no-hide-descendants'}
          >
            <Surface style={styles.card}>
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel={`${step.imageLabel}. Tap to enlarge.`}
                onPress={() => setZoomedStep(step)}
                style={styles.imageButton}
              >
                <Image source={step.image} style={styles.screenshot} resizeMode="contain" accessibilityIgnoresInvertColors />
                <View style={styles.zoomHint}>
                  <Ionicons name="expand-outline" size={15} color={theme.colors.textSecondary} />
                  <AppText variant="metadata" tone="muted">Tap to enlarge</AppText>
                </View>
              </Pressable>

              <View style={styles.copy} accessibilityLiveRegion={index === currentIndex ? 'polite' : 'none'}>
                <AppText variant="sectionLabel" tone="brand">Step {index + 1} of {steps.length}</AppText>
                <AppText variant="surfaceTitle" style={styles.stepTitle}>{step.title}</AppText>
                <AppText variant="surfaceBody" tone="muted">{step.description}</AppText>
                {index === 0 && onOpenEmail ? (
                  <AppButton label="Open Gmail" variant="secondary" icon="mail-outline" onPress={onOpenEmail} />
                ) : null}
              </View>
            </Surface>
          </View>
        ))}
      </ScrollView>

      <View style={styles.navigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous download step"
          accessibilityState={{ disabled: currentIndex === 0 }}
          disabled={currentIndex === 0}
          onPress={() => goToStep(currentIndex - 1)}
          style={styles.navigationButton}
        >
          <AppText variant="button" tone={currentIndex === 0 ? 'muted' : 'brand'}>Previous</AppText>
        </Pressable>

        <View style={styles.dots} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: steps.length, now: currentIndex + 1 }}>
          {steps.map((step, index) => (
            <Pressable
              key={step.title}
              accessibilityRole="button"
              accessibilityLabel={`Show download step ${index + 1}: ${step.title}`}
              accessibilityState={{ selected: index === currentIndex }}
              onPress={() => goToStep(index)}
              style={styles.dotTarget}
            >
              <View style={[styles.dot, index === currentIndex && styles.activeDot]} />
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next download step"
          accessibilityState={{ disabled: currentIndex === steps.length - 1 }}
          disabled={currentIndex === steps.length - 1}
          onPress={() => goToStep(currentIndex + 1)}
          style={styles.navigationButton}
        >
          <AppText variant="button" tone={currentIndex === steps.length - 1 ? 'muted' : 'brand'}>Next</AppText>
        </Pressable>
      </View>

      <Modal visible={Boolean(zoomedStep)} transparent animationType="fade" onRequestClose={() => setZoomedStep(null)}>
        <View style={styles.zoomBackdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close enlarged screenshot" style={styles.zoomClose} onPress={() => setZoomedStep(null)}>
            <Ionicons name="close" size={28} color={theme.colors.white} />
          </Pressable>
          {zoomedStep ? <Image source={zoomedStep.image} style={styles.zoomedImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: { gap: 2 },
  carouselContent: { paddingTop: 8, paddingBottom: 24 },
  slide: { paddingHorizontal: 12 },
  card: { padding: 0 },
  imageButton: { minHeight: 224, alignItems: 'center', justifyContent: 'center', padding: 10, borderTopLeftRadius: theme.radii.card - 1, borderTopRightRadius: theme.radii.card - 1, backgroundColor: theme.colors.successBg },
  screenshot: { width: '100%', height: 205, borderRadius: 14, backgroundColor: theme.colors.white },
  zoomHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  copy: { gap: 7, padding: 16 },
  stepTitle: { marginTop: -1 },
  navigation: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navigationButton: { minWidth: 76, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dotTarget: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.gray200 },
  activeDot: { width: 22, backgroundColor: theme.colors.primary },
  zoomBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: theme.colors.alpha(theme.colors.black, 0.94) },
  zoomClose: { position: 'absolute', top: 48, right: 16, zIndex: 1, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: theme.colors.alpha(theme.colors.white, 0.14) },
  zoomedImage: { width: '100%', height: '86%' },
});
