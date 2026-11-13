import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSystemFontScale } from '@hooks/useSystemFontScale';
import { AppText } from '@components/ui/AppText';
import { Colors, Radius, Shadows, Spacing, type AppTheme } from '@constants/theme';
import { useAppTheme } from '@contexts/AppearanceContext';
import type { DashboardMonthOption } from '@features/dashboard/dashboardPeriodSummary';

interface DashboardMonthNavigatorProps {
  months: DashboardMonthOption[];
  selectedMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
}

interface MonthGroup {
  year: number;
  months: DashboardMonthOption[];
}

export function DashboardMonthNavigator({
  months,
  selectedMonthKey,
  onSelectMonth,
}: DashboardMonthNavigatorProps) {
  const theme = useAppTheme();
  const largeText = useSystemFontScale() >= 1.5;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const selectedIndex = Math.max(0, months.findIndex((month) => month.key === selectedMonthKey));
  const selectedMonth = months[selectedIndex] ?? months[months.length - 1];
  const monthGroups = useMemo<MonthGroup[]>(() => {
    const groups = new Map<number, DashboardMonthOption[]>();
    [...months].reverse().forEach((month) => {
      const group = groups.get(month.year) ?? [];
      group.push(month);
      groups.set(month.year, group);
    });
    return [...groups].map(([year, groupedMonths]) => ({ year, months: groupedMonths }));
  }, [months]);

  if (!selectedMonth) return null;

  const selectMonth = (monthKey: string) => {
    onSelectMonth(monthKey);
    setPickerVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.navigator}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show previous month"
          accessibilityState={{ disabled: selectedIndex === 0 }}
          disabled={selectedIndex === 0}
          hitSlop={4}
          onPress={() => onSelectMonth(months[selectedIndex - 1].key)}
          style={({ pressed }) => [styles.arrow, selectedIndex === 0 && styles.disabled, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose month. ${selectedMonth.label}${selectedMonth.isCurrent ? ', current month' : ''}`}
          accessibilityHint="Opens the month picker"
          accessibilityState={{ expanded: pickerVisible }}
          onPress={() => setPickerVisible(true)}
          style={({ pressed }) => [styles.monthButton, largeText && styles.monthButtonStacked, pressed && styles.pressed]}
        >
          {!largeText && <Ionicons name="calendar-outline" size={17} color={theme.colors.primary} />}
          <AppText variant="button" style={styles.monthLabel}>{selectedMonth.label}</AppText>
          {selectedMonth.isCurrent ? (
            <View style={styles.currentChip}>
              <AppText variant="metadata" style={styles.currentChipText}>Current</AppText>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show next month"
          accessibilityState={{ disabled: selectedIndex >= months.length - 1 }}
          disabled={selectedIndex >= months.length - 1}
          hitSlop={4}
          onPress={() => onSelectMonth(months[selectedIndex + 1].key)}
          style={({ pressed }) => [styles.arrow, selectedIndex >= months.length - 1 && styles.disabled, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            accessible={false}
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerVisible(false)}
          />
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleCopy}>
                <AppText variant="surfaceTitle">Choose a month</AppText>
                <AppText variant="surfaceBody" tone="muted">See the spending and orders SnackTrack found.</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close month picker"
                onPress={() => setPickerVisible(false)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={21} color={theme.colors.primary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.monthScroll}
              contentContainerStyle={styles.monthScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {monthGroups.map((group) => (
                <View key={group.year} style={styles.yearGroup}>
                  <AppText variant="sectionLabel" tone="muted">{group.year}</AppText>
                  <View style={styles.monthGrid}>
                    {group.months.map((month) => {
                      const selected = month.key === selectedMonth.key;
                      return (
                        <Pressable
                          key={month.key}
                          accessibilityRole="button"
                          accessibilityLabel={`${month.label}${month.isCurrent ? ', current month' : ''}${month.hasTrackedOrders ? '' : ', no tracked orders'}`}
                          accessibilityState={{ selected }}
                          onPress={() => selectMonth(month.key)}
                          style={({ pressed }) => [
                            styles.monthOption,
                            selected && styles.monthOptionSelected,
                            pressed && styles.pressed,
                          ]}
                        >
                          <AppText variant="button" style={selected ? styles.monthOptionTextSelected : undefined}>
                            {month.shortLabel}
                          </AppText>
                          <AppText variant="metadata" tone="muted">
                            {month.isCurrent ? 'Current' : month.hasTrackedOrders ? 'Tracked' : 'No orders'}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { marginBottom: Spacing.compact },
  navigator: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    width: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  disabled: { opacity: 0.28 },
  pressed: { opacity: 0.7 },
  monthButton: {
    minWidth: 0,
    minHeight: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  monthButtonStacked: { flexDirection: 'column', paddingVertical: Spacing.xs },
  monthLabel: { flexShrink: 1, textAlign: 'center' },
  currentChip: {
    flexShrink: 0,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: theme.colors.chipActiveBg,
  },
  currentChipText: { color: theme.colors.chipActiveText },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.control,
    backgroundColor: Colors.alpha(Colors.black, 0.42),
  },
  sheet: {
    maxHeight: '78%',
    padding: Spacing.page,
    paddingBottom: Spacing.xl,
    borderRadius: Radius.card,
    backgroundColor: theme.colors.surface,
    ...Shadows.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.section,
  },
  sheetTitleCopy: { flex: 1, gap: Spacing.xs },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: theme.colors.chipActiveBg,
  },
  monthScroll: { flexGrow: 0 },
  monthScrollContent: { gap: Spacing.lg },
  yearGroup: { gap: Spacing.sm },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  monthOption: {
    minWidth: 126,
    minHeight: 58,
    flexBasis: '46%',
    flexGrow: 1,
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: Radius.md,
    backgroundColor: theme.colors.background,
  },
  monthOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.chipActiveBg,
  },
  monthOptionTextSelected: { color: theme.colors.chipActiveText },
});
