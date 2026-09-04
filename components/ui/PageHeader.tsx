import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
export function PageHeader({ eyebrow, title, body, centered = false }: { eyebrow?: string; title: string; body?: string; centered?: boolean }) {
  const alignment = centered ? styles.centered : undefined;
  return <View style={styles.container}>{eyebrow ? <AppText variant="eyebrow" tone="brand" style={alignment}>{eyebrow}</AppText> : null}<AppText variant="pageTitle" style={[styles.title, alignment]}>{title}</AppText>{body ? <AppText tone="muted" style={[styles.body, alignment]}>{body}</AppText> : null}</View>;
}
const styles = StyleSheet.create({ container: { marginBottom: 18 }, title: { marginTop: 5 }, body: { marginTop: 9 }, centered: { textAlign: 'center' } });
