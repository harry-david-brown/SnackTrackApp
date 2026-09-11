import { Redirect } from 'expo-router';
import { useState } from 'react';
import { appDestinations, useAppNavigation } from '@features/navigation';
import { Pressable, StyleSheet, View } from 'react-native';
import { Mascot } from '@components/mascot/Mascot';
import { AppButton } from '@components/ui/AppButton';
import { AppScreen } from '@components/ui/AppScreen';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';
import { Surface } from '@components/ui/Surface';
import { useAppearance } from '@contexts/AppearanceContext';

export default function VisualGallery() {
  const navigation = useAppNavigation();
  const { preference, setPreference, theme } = useAppearance();
  const [largeText, setLargeText] = useState(false);
  if (!__DEV__) return <Redirect href="/" />;
  return <AppScreen scroll>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.backOr(appDestinations.home)} style={styles.back}><AppText variant="button" tone="brand">Back</AppText></Pressable>
    <PageHeader eyebrow="VISUAL QA" title="SnackTrack gallery" body="Deterministic fixtures for checking theme, type scale, spacing, surfaces, actions, and mascot proportions." />
    <View style={styles.controls}>
      {(['system', 'light', 'dark'] as const).map(value => <Pressable key={value} onPress={() => void setPreference(value)} style={[styles.chip, { backgroundColor: preference === value ? theme.colors.chipActiveBg : theme.colors.chipInactiveBg }]}><AppText variant="metadata" style={{ color: preference === value ? theme.colors.chipActiveText : theme.colors.chipInactiveText }}>{value}</AppText></Pressable>)}
      <Pressable onPress={() => setLargeText(value => !value)} style={[styles.chip, { backgroundColor: largeText ? theme.colors.chipActiveBg : theme.colors.chipInactiveBg }]}><AppText variant="metadata">Large text</AppText></Pressable>
    </View>
    <Surface style={styles.hero}>
      <Mascot pose="sunglasses" size={104} accessibilityLabel="SnackTrack mascot wearing sunglasses" />
      <View style={styles.heroCopy}><AppText variant="eyebrow" tone="brand">HOME HERO</AppText><AppText variant="pageTitle" style={largeText && styles.large}>Your delivery picture</AppText><AppText variant="body" style={styles.body}>One editorial surface, restrained type, and room for the mascot to breathe.</AppText></View>
    </Surface>
    <AppText variant="sectionLabel" style={styles.section}>GROUPED ROWS</AppText>
    <Surface style={styles.group}>{['Email receipts', 'Detailed order history', 'Keep my stats current'].map((label, index) => <View key={label} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.divider }]}><AppText variant="rowTitle" style={largeText && styles.largeRow}>{label}</AppText><AppText variant="metadata" tone="muted">Ready</AppText></View>)}</Surface>
    <View style={styles.actions}><AppButton label="Primary action" /><AppButton label="Secondary action" variant="secondary" /><AppButton label="Destructive action" variant="destructive" /></View>
  </AppScreen>;
}

const styles = StyleSheet.create({ back: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' }, controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }, chip: { minHeight: 38, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }, hero: { flexDirection: 'row', alignItems: 'center', padding: 16 }, heroCopy: { flex: 1, marginLeft: 10 }, body: { marginTop: 7 }, large: { fontSize: 36, lineHeight: 41 }, largeRow: { fontSize: 20, lineHeight: 26 }, section: { marginTop: 24, marginBottom: 9, marginLeft: 4 }, group: { paddingVertical: 2 }, row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10 }, actions: { gap: 10, marginTop: 24, marginBottom: 24 } });
