import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppScreen } from '@components/ui/AppScreen';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';
import { Surface } from '@components/ui/Surface';
import { useAppTheme } from '@contexts/AppearanceContext';
import { appDestinations, useAppNavigation } from '@features/navigation';

const rows = [
  { icon: 'shield-checkmark-outline' as const, title: 'Privacy policy', body: 'How SnackTrack handles account and receipt data.', url: 'https://getsnacktrack.com/privacy-policy' },
  { icon: 'mail-outline' as const, title: 'Contact support', body: 'hello@getsnacktrack.com', url: 'mailto:hello@getsnacktrack.com' },
];

export default function HelpPrivacyScreen() {
  const navigation = useAppNavigation();
  const theme = useAppTheme();
  return <AppScreen scroll>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.backOr(appDestinations.profile)} style={styles.back}><Ionicons name="arrow-back" size={21} color={theme.colors.primary} /></Pressable>
    <PageHeader eyebrow="HELP & PRIVACY" title="Answers and control" body="Learn how imports work, review privacy details, or get help from us." />
    <Surface style={styles.guide}>
      <AppText variant="surfaceTitle">Building your history</AppText>
      <AppText variant="surfaceBody" style={styles.guideBody}>Start with the email registered with your delivery apps. If email misses orders, use a provider history download to fill the gaps and unlock deeper detail.</AppText>
    </Surface>
    <AppText variant="sectionLabel" style={styles.section}>SUPPORT</AppText>
    <Surface style={styles.rows}>{rows.map((row, index) => <Pressable key={row.title} accessibilityRole="link" onPress={() => void Linking.openURL(row.url)} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.divider }]}>
      <View style={[styles.icon, { backgroundColor: theme.colors.alpha(theme.colors.primary, 0.09) }]}><Ionicons name={row.icon} size={20} color={theme.colors.primary} /></View>
      <View style={styles.copy}><AppText variant="rowTitle">{row.title}</AppText><AppText variant="metadata" style={styles.rowBody}>{row.body}</AppText></View>
      <Ionicons name="open-outline" size={18} color={theme.colors.gray500} />
    </Pressable>)}</Surface>
  </AppScreen>;
}

const styles = StyleSheet.create({ back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginBottom: 8 }, guide: { padding: 18 }, guideBody: { marginTop: 7 }, section: { marginTop: 24, marginBottom: 9, marginLeft: 4 }, rows: { paddingVertical: 2 }, row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }, icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, marginLeft: 12 }, rowBody: { marginTop: 3 } });
