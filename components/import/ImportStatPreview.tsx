import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { AppText } from '@components/ui/AppText';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useAppReducedMotion } from '@contexts/MotionContext';
import { Motion } from '@constants/motion';
import type { AppTheme } from '@constants/theme';

export const IMPORT_PREVIEW_INTERVAL_MS = 6_000;
const previews: readonly { title: string; body: string; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { title: 'A clearer picture of your spending', body: 'Your totals, favorite spots, and ordering habits.', icon: 'trending-up-outline' },
  { title: 'Your favorite spots', body: 'Find the restaurants you return to most.', icon: 'restaurant-outline' },
  { title: 'Your late-night habits', body: 'See when your delivery cravings usually strike.', icon: 'moon-outline' },
  { title: 'Your delivery personality', body: 'Discover the habits that make your order history yours.', icon: 'sparkles-outline' },
];

export function ImportStatPreview({ complete = false }: { complete?: boolean }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const reducedMotion = useAppReducedMotion();
  const focused = useIsFocused();
  const [index, setIndex] = useState(0);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const displayedIndex = useRef(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const [paused, setPaused] = useState(false);
  const [screenReader, setScreenReader] = useState(true);
  useEffect(() => {
    let live = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', enabled => { changed = true; setScreenReader(enabled); });
    void AccessibilityInfo.isScreenReaderEnabled().then(enabled => { if (live && !changed) setScreenReader(enabled); }).catch(() => undefined);
    return () => { live = false; subscription.remove(); };
  }, []);
  const canCycle = focused && !reducedMotion && !screenReader && !complete;
  useEffect(() => {
    if (!canCycle || paused) return;
    const timer = setTimeout(() => setIndex(current => (current + 1) % previews.length), IMPORT_PREVIEW_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [canCycle, paused, index]);
  useEffect(() => {
    let cancelled = false;
    const showLatest = () => {
      displayedIndex.current = index;
      setVisibleIndex(index);
    };
    if (!canCycle || paused) {
      showLatest();
      opacity.setValue(1);
      return;
    }
    if (displayedIndex.current === index) {
      opacity.setValue(1);
      return;
    }
    // Swap only once the outgoing copy is invisible, then reveal the new tip.
    Animated.timing(opacity, {
      toValue: 0, duration: Motion.content, easing: Motion.easing, useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || cancelled) return;
      showLatest();
      Animated.timing(opacity, {
        toValue: 1, duration: Motion.content, easing: Motion.easing, useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelled = true;
      opacity.stopAnimation();
    };
  }, [canCycle, index, opacity, paused]);
  const preview = previews[visibleIndex];
  return <View style={styles.region}>
    <Pressable style={styles.preview} accessibilityRole="button"
      accessibilityLabel={`${preview.title}. ${preview.body}. Preview ${visibleIndex + 1} of ${previews.length}`}
      accessibilityHint="Show the next preview" onPress={() => setIndex(current => (current + 1) % previews.length)}>
      <Animated.View style={[styles.content, { opacity }]}>
      <View style={styles.icon}><Ionicons name={preview.icon} size={22} color={theme.colors.primary} accessible={false} /></View>
      <View style={styles.copy}><AppText variant="rowTitle">{preview.title}</AppText><AppText variant="metadata" tone="muted" style={styles.body}>{preview.body}</AppText></View>
      </Animated.View>
    </Pressable>
    {canCycle ? <Pressable style={styles.pause} accessibilityRole="button" accessibilityLabel={paused ? 'Resume previews' : 'Pause previews'}
      onPress={() => setPaused(value => !value)}><Ionicons name={paused ? 'play-outline' : 'pause-outline'} size={18} color={theme.colors.textSecondary} accessible={false} /></Pressable> : null}
  </View>;
}
const createStyles = (theme: AppTheme) => StyleSheet.create({
  region: { flexDirection: 'row', alignItems: 'center', marginTop: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider, paddingVertical: 14 },
  preview: { flex: 1, minHeight: 76, justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: theme.radii.control, backgroundColor: theme.colors.chipActiveBg, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 }, body: { marginTop: 4 },
  pause: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
