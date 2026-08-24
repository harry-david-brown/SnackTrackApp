import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '@constants/theme';
import { AppButton } from '@components/ui/AppButton';

export const MAX_DEV_INSIGHT_DAY_OFFSET = 365;

interface Props {
  dayOffset: number;
  isFetching: boolean;
  onChangeDayOffset: (dayOffset: number) => void;
}

export function DashboardInsightsDevControls({ dayOffset, isFetching, onChangeDayOffset }: Props) {
  const dayLabel = dayOffset === 0 ? 'Today' : `+${dayOffset} ${dayOffset === 1 ? 'day' : 'days'}`;
  return (
    <View style={styles.container} accessibilityLabel={`Development insight preview: ${dayLabel}`}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>DEV DAY TRAVELLER</Text>
        <Text style={styles.label}>{dayLabel}{isFetching ? ' · loading…' : ''}</Text>
      </View>
      <View style={styles.actions}>
        <AppButton
          label="Previous preview day"
          accessibilityLabel="Previous dashboard insight preview day"
          variant="icon"
          icon="chevron-back"
          disabled={dayOffset === 0 || isFetching}
          onPress={() => onChangeDayOffset(dayOffset - 1)}
        />
        <AppButton
          label="Today"
          accessibilityLabel="Reset dashboard insight preview to today"
          variant="secondary"
          disabled={dayOffset === 0 || isFetching}
          onPress={() => onChangeDayOffset(0)}
        />
        <AppButton
          label="Next preview day"
          accessibilityLabel="Next dashboard insight preview day"
          variant="icon"
          icon="chevron-forward"
          disabled={dayOffset >= MAX_DEV_INSIGHT_DAY_OFFSET || isFetching}
          onPress={() => onChangeDayOffset(dayOffset + 1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.infoTint,
    gap: Spacing.sm,
  },
  copy: { gap: 2 },
  eyebrow: { color: Colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  label: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
