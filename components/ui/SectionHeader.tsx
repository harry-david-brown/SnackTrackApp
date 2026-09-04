import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.container}><AppText variant="sectionLabel" tone="muted">{title}</AppText>{subtitle ? <AppText variant="surfaceBody" tone="muted">{subtitle}</AppText> : null}</View>;
}

const styles = StyleSheet.create({
  container: { gap: 4 },
});
