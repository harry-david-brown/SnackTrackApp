import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { appDestinations, useAppNavigation } from '@features/navigation';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppScreen } from '@components/ui/AppScreen';
import { AppText } from '@components/ui/AppText';
import { PageHeader } from '@components/ui/PageHeader';
import { Surface } from '@components/ui/Surface';
import { useAppTheme } from '@contexts/AppearanceContext';
import { useCurrency } from '@contexts/CurrencyContext';
import { SUPPORTED_CURRENCIES } from '@utils/currency';
import { useUser } from '@contexts/UserContext';
import { useAnalyticsQuery } from '@hooks/queries/useAnalyticsQueries';
import { RECAP_CURRENCIES, resolveRecapCurrency } from '@features/wrapped/recapCurrency';

export default function CurrencyScreen() {
  const navigation = useAppNavigation();
  const [saving, setSaving] = useState(false);
  const theme = useAppTheme();
  const { currency, hasManualSelection, setCurrency } = useCurrency();
  const { state } = useUser();
  const { data: analytics } = useAnalyticsQuery(state.user?.id);
  const effectiveCurrency = resolveRecapCurrency({
    receiptCurrency: analytics?.currencyCode,
    selectedCurrency: currency,
    hasManualSelection,
  });
  const styles = useMemo(() => createStyles(theme.colors.divider), [theme.colors.divider]);
  return <AppScreen scroll>
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.backOr(appDestinations.profile)} style={styles.back}><Ionicons name="arrow-back" size={21} color={theme.colors.primary} /></Pressable>
    <PageHeader eyebrow="CURRENCY" title="Choose your recap currency" body="Choose the currency for approximate totals in your shareable recap. Order history keeps each order’s recorded currency; this setting does not change Home or Summary totals." />
    <Surface style={styles.surface}>{RECAP_CURRENCIES.map((code, index) => {
      const item = SUPPORTED_CURRENCIES[code];
      const selected = effectiveCurrency === item.code;
      return <Pressable key={item.code} accessibilityRole="radio" accessibilityLabel={`${item.name}, ${item.code}`} accessibilityState={{ checked: selected, disabled: saving }} disabled={saving} onPress={() => { setSaving(true); void setCurrency(item.code).finally(() => setSaving(false)); }} style={[styles.row, index > 0 && styles.border]}>
        <AppText variant="surfaceTitle" style={styles.symbol}>{item.symbol}</AppText>
        <View style={styles.copy}><AppText variant="rowTitle">{item.code}</AppText><AppText variant="metadata" style={styles.body}>{item.name}</AppText></View>
        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? theme.colors.primary : theme.colors.gray400} />
      </Pressable>;
    })}</Surface>
  </AppScreen>;
}

const createStyles = (divider: string) => StyleSheet.create({ back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginBottom: 8 }, surface: { paddingVertical: 2 }, row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }, border: { borderTopWidth: 1, borderTopColor: divider }, symbol: { width: 42 }, copy: { flex: 1 }, body: { marginTop: 2 } });
