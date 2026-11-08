import { render } from '@testing-library/react-native';
import { DashboardSpendingHero } from '@components/dashboard/DashboardSpendingHero';
import { HistoricalMonthSummaryCard } from '@components/dashboard/HistoricalMonthSummaryCard';
import { resolveDashboardPeriodSummary } from '@features/dashboard/dashboardPeriodSummary';
import type { UserSummary } from '@/types/api';
import { normalizeOrderMetrics } from '@services/normalizers/orderMetricNormalizers';
import fixture from '@/__tests__/fixtures/order-event-metrics.json';

it.each([true, false])('uses tracking history for first-month copy in both cards (first: %s)', (firstMonth) => {
  const data: UserSummary = {
    userId: 'user-1', totalSpent: 90, totalReceipts: 4, averageOrderValue: 22.5,
    topRestaurants: [], refundedReceipts: 0, dataQuality: { issues: [], recommendations: [] },
    monthlyBreakdown: [
      { month: '2026-09', totalSpent: 60, receiptCount: 3 },
      ...(!firstMonth ? [{ month: '2026-06', totalSpent: 30, receiptCount: 1 }] : []),
    ],
  };
  const summary = resolveDashboardPeriodSummary(data, 'monthly', '2026-09', new Date(2026, 9, 1));
  const screen = render(<>
    <DashboardSpendingHero summary={summary} period="monthly" months={[]} selectedMonthKey="2026-09"
      loading={false} formatCurrency={value => `$${value.toFixed(2)}`}
      onChangePeriod={jest.fn()} onSelectMonth={jest.fn()} />
    <HistoricalMonthSummaryCard summary={summary} formatCurrency={value => `$${value.toFixed(2)}`} />
  </>);
  expect(screen.getAllByText(firstMonth ? 'Your first tracked month' : 'Month comparison unavailable')).toHaveLength(2);
  expect(screen.queryByText(firstMonth ? 'Month comparison unavailable' : 'Your first tracked month')).toBeNull();
  expect(screen.getByText('3 orders averaged $20.00 each.')).toBeTruthy();
});

it.each(['loading', 'unavailable'] as const)('does not present missing spending as zero while %s', (state) => {
  const screen = render(<DashboardSpendingHero
    summary={{
      period: 'monthly', monthKey: '2026-09', monthLabel: 'September 2026', isCurrentMonth: true,
      label: 'September delivery spending', totalSpent: 0, receiptCount: 0,
      averageOrderValue: 0, comparison: null, isFirstTrackedMonth: false,
    }}
    period="monthly" months={[]} selectedMonthKey="2026-09"
    loading={state === 'loading'} unavailable={state === 'unavailable'}
    formatCurrency={value => `$${value.toFixed(2)}`}
    onChangePeriod={jest.fn()} onSelectMonth={jest.fn()}
  />);
  const message = state === 'loading' ? 'Loading your spending summary…' : 'Spending summary unavailable';
  expect(screen.getByText(message)).toBeTruthy();
  expect(screen.getByLabelText(`September delivery spending. ${message}`)).toBeTruthy();
  expect(screen.queryByText('$0.00')).toBeNull();
  expect(screen.queryByText('0')).toBeNull();
  expect(screen.queryByText('No tracked orders this month yet')).toBeNull();
});

it('keeps the familiar spending hero instead of inserting outcome and data-quality panels', () => {
  const screen = render(<DashboardSpendingHero
    summary={{
      period: 'all_time', monthKey: null, monthLabel: null, isCurrentMonth: false,
      label: 'All-time delivery spending', totalSpent: 157.02, receiptCount: 5,
      averageOrderValue: 31.4, comparison: null, currencyCode: 'CAD', isFirstTrackedMonth: false,
      evidenceLabel: 'Based on receipts and exported totals',
      orderMetrics: { ...normalizeOrderMetrics(fixture.metrics), unknownFulfillment: 81, unlinkedAdjustments: 2 },
    }}
    period="all_time" months={[]} selectedMonthKey="2023-12" loading={false}
    formatCurrency={value => `$${value.toFixed(2)}`}
    onChangePeriod={jest.fn()} onSelectMonth={jest.fn()}
  />);
  expect(screen.getByText('All-time delivery spending')).toBeTruthy();
  expect(screen.getByText('$157.02')).toBeTruthy();
  expect(screen.getByText('orders')).toBeTruthy();
  expect(screen.getByText('average order')).toBeTruthy();
  expect(screen.queryByText(/refund|cancel|unknown|attempt|net cost|receipts and exported/i)).toBeNull();
});
