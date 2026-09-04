import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Radius } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';

export function IconSurface({ icon, color }: { icon: keyof typeof Ionicons.glyphMap; color?: string }) {
  const theme = useAppTheme();
  return <View style={[styles.surface, { backgroundColor: theme.colors.chipActiveBg }]}><Ionicons name={icon} size={24} color={color ?? theme.colors.primary} /></View>;
}

const styles = StyleSheet.create({
  surface: { width: 48, height: 48, borderRadius: Radius.input, alignItems: 'center', justifyContent: 'center' },
});
