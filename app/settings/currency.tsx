import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppScreen } from '@components/ui/AppScreen';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';
import { Surface } from '@components/ui/Surface';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useCurrency } from '@contexts/CurrencyContext';
import { SUPPORTED_CURRENCIES } from '@utils/currency';

export default function CurrencyScreen() {
  const theme = useAppTheme();
  const { currency, setCurrency } = useCurrency();
  const styles = useMemo(() => createStyles(theme.colors.divider), [theme.colors.divider]);
  return <AppScreen scroll>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={21} color={theme.colors.primary} /></Pressable>
    <PageHeader eyebrow="CURRENCY" title="How should totals appear?" body="Choose the currency used to format your SnackTrack statistics." />
    <Surface style={styles.surface}>{Object.values(SUPPORTED_CURRENCIES).map((item, index) => {
      const selected = currency === item.code;
      return <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => void setCurrency(item.code)} style={[styles.row, index > 0 && styles.border]}>
        <AppText variant="surfaceTitle" style={styles.symbol}>{item.symbol}</AppText>
        <View style={styles.copy}><AppText variant="rowTitle">{item.code}</AppText><AppText variant="metadata" style={styles.body}>{item.name}</AppText></View>
        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? theme.colors.primary : theme.colors.gray400} />
      </Pressable>;
    })}</Surface>
  </AppScreen>;
}

const createStyles = (divider: string) => StyleSheet.create({ back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginBottom: 8 }, surface: { paddingVertical: 2 }, row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }, border: { borderTopWidth: 1, borderTopColor: divider }, symbol: { width: 42 }, copy: { flex: 1 }, body: { marginTop: 2 } });
