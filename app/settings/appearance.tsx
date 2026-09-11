import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppScreen } from '@components/ui/AppScreen';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';
import { Surface } from '@components/ui/Surface';
import { useAppearance } from '@contexts/AppearanceContext';
import type { AppearancePreference } from '@constants/theme';
import { appDestinations, useAppNavigation } from '@features/navigation';

const options: readonly { id: AppearancePreference; title: string; body: string }[] = [
  { id: 'system', title: 'System', body: 'Match this device automatically' },
  { id: 'light', title: 'Light', body: 'Warm canvas and bright surfaces' },
  { id: 'dark', title: 'Dark', body: 'Deep forest surfaces and softer contrast' },
];

export default function AppearanceScreen() {
  const navigation = useAppNavigation();
  const { preference, setPreference, theme } = useAppearance();
  return <AppScreen>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.backOr(appDestinations.profile)} style={styles.back}><Ionicons name="arrow-back" size={21} color={theme.colors.primary} /></Pressable>
    <PageHeader eyebrow="APPEARANCE" title="Choose how SnackTrack looks" body="Follow your device or keep SnackTrack in the appearance you prefer." />
    <Surface style={styles.surface}>{options.map((option, index) => {
      const selected = preference === option.id;
      return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${option.title}. ${option.body}`} onPress={() => void setPreference(option.id)} style={[styles.row, index > 0 && { borderTopColor: theme.colors.divider, borderTopWidth: 1 }]}>
        <View style={styles.copy}><AppText variant="rowTitle">{option.title}</AppText><AppText variant="metadata" tone="muted" style={styles.body}>{option.body}</AppText></View>
        <View style={[styles.radio, { borderColor: selected ? theme.colors.primary : theme.colors.gray400 }]}>{selected ? <View style={[styles.radioFill, { backgroundColor: theme.colors.primary }]} /> : null}</View>
      </Pressable>;
    })}</Surface>
  </AppScreen>;
}

const styles = StyleSheet.create({ back: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginBottom: 8 }, surface: { paddingVertical: 2 }, row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingVertical: 11 }, copy: { flex: 1, paddingRight: 12 }, body: { marginTop: 3 }, radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, radioFill: { width: 12, height: 12, borderRadius: 6 } });
