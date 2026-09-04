import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Mascot } from './mascot/Mascot';
import { AppButton } from './ui/AppButton';
import { AppScreen } from './ui/AppScreen';
import { AppText } from './ui/AppText';
import { Surface } from './ui/Surface';
import { FontFamily, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { trackAdminEvent } from '@services/adminAnalytics';

interface OnboardingScreenProps { onComplete: () => void }

const highlights = [
  { icon: 'mail-open-outline' as const, title: 'Bring in your orders', description: 'Start with email receipts, then fill gaps with a delivery-history download.' },
  { icon: 'sparkles-outline' as const, title: 'Meet your delivery habits', description: 'See spending patterns, repeat orders, favorites, and the details hiding in your history.' },
  { icon: 'shield-checkmark-outline' as const, title: 'Stay in control', description: 'Every scan is explicit. Ongoing tracking is always a separate choice.' },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => { void trackAdminEvent('onboarding_started').catch(() => undefined); }, []);

  return (
    <AppScreen scroll footer={<AppButton label="Get started" icon="arrow-forward" onPress={onComplete} />} contentStyle={styles.content}>
      <View style={styles.hero}>
        <AppText variant="eyebrow">WELCOME TO SNACKTRACK</AppText>
        <Mascot pose="flex" size={154} accessibilityLabel="SnackTrack mascot welcoming you" style={styles.mascot} />
        <AppText variant="pageTitle" style={styles.title}>Your delivery history has a story</AppText>
        <AppText variant="body" style={styles.subtitle}>Turn everyday orders into a clearer picture of what you spend, love, repeat, and might want to change.</AppText>
      </View>
      <Surface style={styles.surface}>
        {highlights.map((item, index) => (
          <View key={item.title} style={[styles.row, index < highlights.length - 1 && styles.rowBorder]}>
            <View style={styles.icon}><Ionicons name={item.icon} size={20} color={theme.colors.primary} /></View>
            <View style={styles.copy}>
              <AppText variant="rowTitle" style={styles.rowTitle}>{item.title}</AppText>
              <AppText variant="metadata">{item.description}</AppText>
            </View>
          </View>
        ))}
      </Surface>
    </AppScreen>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingTop: 20 },
  hero: { alignItems: 'center' },
  mascot: { marginTop: 14, marginBottom: 10 },
  title: { textAlign: 'center', maxWidth: 350 },
  subtitle: { marginTop: 12, textAlign: 'center', maxWidth: 350 },
  surface: { marginTop: 28, paddingHorizontal: 16 },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.alpha(theme.colors.primary, 0.09), alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 13 },
  rowTitle: { fontFamily: FontFamily.medium, marginBottom: 4 },
});
