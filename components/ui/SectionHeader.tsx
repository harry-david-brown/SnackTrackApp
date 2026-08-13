import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@constants/theme';

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.container}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  title: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
});

