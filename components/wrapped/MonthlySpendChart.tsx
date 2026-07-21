/**
 * Month-by-month spending column chart for the Wrapped monthly slide.
 *
 * Follows the dataviz conventions for a single-series magnitude chart on a
 * dark surface: one hue (light lime, contrast-validated ≥3:1 against every
 * stop of the lagoon gradient), bars with rounded tops anchored to a baseline
 * over faint full-height tracks, 4px gaps, no legend (the slide title names the
 * series), and one selective direct label on the peak month. Text wears ink
 * tokens, never the bar color. This slide hides the mascot hero so the chart
 * gets the vertical room. Static — renders identically in the share capture.
 */
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { WRAPPED_FONTS, screenWidth } from './wrappedTheme';

export interface MonthlySpendDatum {
  month: string;
  totalSpent: number;
}

// Light lime — validated ≥3:1 against every stop of the lagoon gradient
// (#0C333B → #146068 → #1F8E8A), so bars stay legible top to bottom.
const BAR_COLOR = '#C6EF9A';
const TRACK_COLOR = 'rgba(255,255,255,0.10)'; // faint full-height column track
const CHART_HEIGHT = 200;
const LABEL_HEADROOM = 30; // space above the tallest bar for the peak $ label
const CONTAINER_W = Math.min(440, Math.round(screenWidth * 0.86));
// The chart is inset from the screen edges, so the peak label may overhang the
// chart's own bounds and still be fully visible. This is that spare room.
const SIDE_SLACK = Math.max(0, Math.round((screenWidth - CONTAINER_W) / 2) - 6);

/** "2025-03" → "M"; "Mar 2025" → "M" — single-letter month tick. */
const monthInitial = (month: string): string => {
  const iso = /^(\d{4})-(\d{1,2})/.exec(month);
  if (iso) {
    const index = parseInt(iso[2], 10) - 1;
    return 'JFMAMJJASOND'[index] ?? '';
  }
  return month.trim().charAt(0).toUpperCase();
};

export const MonthlySpendChart = ({
  data,
  formatCurrency,
}: {
  data: MonthlySpendDatum[];
  formatCurrency: (amount: number) => string;
}) => {
  // Most recent 12 months, oldest → newest left to right.
  const months = data.slice(-12);
  const max = Math.max(...months.map((m) => m.totalSpent), 1);
  const peakIndex = months.reduce(
    (best, m, i) => (m.totalSpent > months[best].totalSpent ? i : best),
    0
  );

  // The peak label lives outside the columns: a column is only ~30px wide, so
  // an inline label ellipsizes ("$6…"). Position it absolutely over the plot,
  // centered on its own bar — it may overhang the chart's bounds into the
  // slide's side padding (SIDE_SLACK), which keeps it visible.
  const columnWidth = CONTAINER_W / months.length;
  const peakCenter = (peakIndex + 0.5) * columnWidth;
  // Widest label that still centers on the *outermost* bar without running past
  // the available slack — so every month, edge ones included, stays centered.
  const peakLabelW = Math.max(56, Math.min(140, Math.floor(2 * SIDE_SLACK + columnWidth)));
  const peakLabelLeft = peakCenter - peakLabelW / 2;

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.plot}>
        {months.map((m, i) => {
          const height = Math.max(8, Math.round((m.totalSpent / max) * CHART_HEIGHT));
          const isPeak = i === peakIndex;
          return (
            <View key={`${m.month}-${i}`} style={chartStyles.column}>
              {/* Faint full-height track keeps even the shortest month visible */}
              <View style={chartStyles.track} />
              <View style={[chartStyles.bar, { height }, isPeak && chartStyles.barPeak]} />
            </View>
          );
        })}
        <Text
          style={[chartStyles.peakLabel, { left: peakLabelLeft, width: peakLabelW }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {formatCurrency(months[peakIndex].totalSpent)}
        </Text>
      </View>
      <View style={chartStyles.baseline} />
      <View style={chartStyles.tickRow}>
        {months.map((m, i) => (
          <Text key={`${m.month}-tick-${i}`} style={chartStyles.tick}>
            {monthInitial(m.month)}
          </Text>
        ))}
      </View>
    </View>
  );
};

const chartStyles = StyleSheet.create({
  // Concrete width derived from the screen — a percentage width here collapsed
  // because the ancestor frame shrinks to fit its content.
  container: {
    width: CONTAINER_W,
    marginTop: 12,
    marginBottom: 4,
    overflow: 'visible', // let the peak label overhang (see SIDE_SLACK)
  },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + LABEL_HEADROOM,
    overflow: 'visible',
  },
  column: {
    flex: 1,
    height: '100%', // fill the plot so the track spans the full bar zone
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2, // 4px visual gap between adjacent bars
  },
  // Full-height ghost behind each bar so short months still read as columns.
  track: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: LABEL_HEADROOM, // start below the peak-label headroom
    bottom: 0,
    maxWidth: 30,
    alignSelf: 'center',
    backgroundColor: TRACK_COLOR,
    borderRadius: 6,
  },
  bar: {
    width: '100%',
    maxWidth: 28,
    backgroundColor: BAR_COLOR,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  barPeak: {
    shadowColor: BAR_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  // Absolutely placed over the plot (see peakLabelLeft) so the full currency
  // string can span past the narrow column it belongs to.
  peakLabel: {
    position: 'absolute',
    top: 0,
    textAlign: 'center', // width + left are computed per render
    fontFamily: WRAPPED_FONTS.displayBold,
    fontSize: 15,
    color: 'white',
  },
  baseline: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  tickRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  tick: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
  },
});
