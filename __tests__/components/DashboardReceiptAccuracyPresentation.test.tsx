import { render } from '@testing-library/react-native';
import { DashboardSpendingHero } from '@components/dashboard/DashboardSpendingHero';
import { normalizeOrderMetrics } from '@services/normalizers/orderMetricNormalizers';
import fixture from '@/__tests__/fixtures/order-event-metrics.json';

it('keeps the familiar spending hero instead of inserting outcome and data-quality panels', () => {
  const screen = render(<DashboardSpendingHero
    summary={{
      period: 'all_time', monthKey: null, monthLabel: null, isCurrentMonth: false,
      label: 'All-time delivery spending', totalSpent: 157.02, receiptCount: 5,
      averageOrderValue: 31.4, comparison: null, currencyCode: 'CAD',
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
