import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { FontFamily, Radius, Spacing, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import { AnimatedChoiceGroup } from '@components/ui/AnimatedChoiceGroup';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import {
  receiptDateRangeFilters,
  receiptOutcomeFilters,
  receiptProviderFilters,
  type ReceiptHistoryFilterSelection,
} from '@features/receipts/receiptHistoryView';

interface ReceiptHistoryFiltersProps {
  search: string;
  selection: ReceiptHistoryFilterSelection;
  expanded: boolean;
  hasOutcomeEvidence: boolean;
  resultCount: number | null;
  resultNoun: 'order' | 'record';
  onSearchChange: (value: string) => void;
  onSelectionChange: (value: ReceiptHistoryFilterSelection) => void;
  onToggleExpanded: () => void;
  onShowResults: () => void;
  onClear: () => void;
}

export function ReceiptHistoryFilters({
  search, selection, expanded, hasOutcomeEvidence, resultCount, resultNoun,
  onSearchChange, onSelectionChange, onToggleExpanded, onShowResults, onClear,
}: ReceiptHistoryFiltersProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showRefundInfo, setShowRefundInfo] = useState(false);
  const activeFilters = [
    { key: 'provider' as const, options: receiptProviderFilters, value: selection.provider },
    { key: 'dateRange' as const, options: receiptDateRangeFilters, value: selection.dateRange },
    { key: 'outcome' as const, options: receiptOutcomeFilters, value: selection.outcome },
  ].filter(filter => filter.value !== 'all');
  const hasFilters = activeFilters.length > 0 || Boolean(search.trim());
  const countBadge = activeFilters.length > 0 ? (
    <View style={styles.countBadge}><AppText variant="metadata" style={styles.selectedText}>{activeFilters.length}</AppText></View>
  ) : null;

  return <View style={styles.container}>
    <View style={styles.searchField}>
      <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={onSearchChange}
        placeholder="Search restaurants"
        placeholderTextColor={theme.colors.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Search restaurants"
        onSubmitEditing={onShowResults}
      />
      {search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onSearchChange('')} style={styles.clearSearch}>
        <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
      </Pressable> : null}
    </View>

    {expanded ? <View style={styles.panel}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter orders"
          accessibilityHint={`${activeFilters.length} active filters. Collapse filter options.`}
          accessibilityState={{ expanded: true }}
          onPress={onToggleExpanded}
          style={({ pressed }) => [styles.panelHeading, pressed && styles.pressed]}
        >
          <Ionicons name="options-outline" size={20} color={theme.colors.primary} />
          <AppText variant="surfaceTitle">Filters</AppText>
          {countBadge}
          <Ionicons name="chevron-up" size={16} color={theme.colors.textSecondary} />
        </Pressable>
        <AppButton label="Reset" variant="tertiary" onPress={onClear} disabled={!hasFilters} />
      </View>
      <FilterGroup label="Service">
        <AnimatedChoiceGroup options={receiptProviderFilters} value={selection.provider} onChange={value => onSelectionChange({ ...selection, provider: value })} />
      </FilterGroup>
      <FilterGroup label="Date">
        <AnimatedChoiceGroup options={receiptDateRangeFilters} value={selection.dateRange} onChange={value => onSelectionChange({ ...selection, dateRange: value })} />
      </FilterGroup>
      {hasOutcomeEvidence ? <>
        <FilterGroup label="Activity">
          <AnimatedChoiceGroup options={receiptOutcomeFilters} value={selection.outcome} onChange={value => onSelectionChange({ ...selection, outcome: value })} />
        </FilterGroup>
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="About refund records"
            accessibilityState={{ expanded: showRefundInfo }}
            onPress={() => setShowRefundInfo(current => !current)}
            style={({ pressed }) => [styles.refundInfo, pressed && styles.pressed]}
          >
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} />
            <AppText variant="metadata" tone="muted" style={styles.flexibleText}>About refund records</AppText>
            <Ionicons name={showRefundInfo ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textSecondary} />
          </Pressable>
          {showRefundInfo ? <AppText variant="metadata" tone="muted" style={styles.refundNote}>We count refunds only when a receipt confirms them. Possible refunds and records we haven’t matched to an order stay separate.</AppText> : null}
        </View>
      </> : null}
      <AppButton
        label={resultCount === null ? 'Show results' : `Show ${resultCount} ${resultNoun}${resultCount === 1 ? '' : 's'}`}
        onPress={onShowResults}
      />
    </View> : <>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter orders"
          accessibilityHint={`${activeFilters.length} active filters. Expand filter options.`}
          accessibilityState={{ expanded: false }}
          onPress={onToggleExpanded}
          style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
        >
          <Ionicons name="options-outline" size={20} color={theme.colors.primary} />
          <AppText variant="button">Filters</AppText>
          {countBadge}
        </Pressable>
        {hasFilters ? <AppButton label="Clear all" variant="tertiary" onPress={onClear} /> : null}
      </View>
      {activeFilters.length > 0 ? <View style={styles.chips}>
        {activeFilters.map(filter => {
          const label = filter.options.find(option => option.value === filter.value)?.label ?? filter.value;
          return <Pressable
            key={filter.key}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label} filter`}
            onPress={() => onSelectionChange({ ...selection, [filter.key]: 'all' })}
            style={({ pressed }) => [styles.chip, styles.selectedChip, pressed && styles.pressed]}
          >
            <AppText variant="metadata" style={[styles.flexibleText, styles.selectedText]}>{label}</AppText>
            <Ionicons name="close" size={16} color={theme.colors.chipActiveText} />
          </Pressable>;
        })}
      </View> : null}
    </>}
  </View>;
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.group}>
    <AppText variant="metadata" tone="muted">{label}</AppText>
    {children}
  </View>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { gap: Spacing.md },
  searchField: { minHeight: 48, paddingLeft: Spacing.control, paddingRight: Spacing.xs, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: Radius.input, backgroundColor: theme.colors.surface },
  searchInput: { flex: 1, minWidth: 0, minHeight: 46, color: theme.colors.textPrimary, fontSize: 15, fontFamily: FontFamily.regular, paddingVertical: Spacing.sm },
  clearSearch: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  panel: { padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: Radius.card, backgroundColor: theme.colors.surface },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  panelHeading: { flexDirection: 'row', flexWrap: 'wrap', minHeight: 44, alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
  filterButton: { flexDirection: 'row', flexShrink: 1, minHeight: 44, alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: Radius.control, backgroundColor: theme.colors.surface },
  countBadge: { minWidth: 26, minHeight: 26, paddingHorizontal: Spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.chipActiveBg, borderRadius: Radius.pill },
  group: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { minHeight: 44, maxWidth: '100%', paddingHorizontal: Spacing.compact, paddingVertical: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: Radius.pill, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
  selectedChip: { borderColor: theme.colors.chipActiveBg, backgroundColor: theme.colors.chipActiveBg },
  selectedText: { color: theme.colors.chipActiveText, fontFamily: FontFamily.medium },
  flexibleText: { flexShrink: 1 },
  refundInfo: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  refundNote: { paddingBottom: Spacing.sm, lineHeight: 18 },
  pressed: { opacity: 0.76 },
});
