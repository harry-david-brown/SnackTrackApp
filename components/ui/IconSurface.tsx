import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Colors, Radius } from '../../constants/theme';

export function IconSurface({ icon, color = Colors.primary }: { icon: keyof typeof Ionicons.glyphMap; color?: string }) {
  return <View style={styles.surface}><Ionicons name={icon} size={24} color={color} /></View>;
}

const styles = StyleSheet.create({
  surface: { width: 48, height: 48, borderRadius: Radius.input, backgroundColor: Colors.chipActiveBg, alignItems: 'center', justifyContent: 'center' },
});
