import { DataSource, ReceiptType, type Receipt } from '@/types/api';
import {
  receiptDateFilters,
  resolveReceiptHistorySections,
} from '@features/receipts/receiptHistoryView';

const receipt = (id: string, orderDate: string | null): Receipt => ({
  id,
  userId: 'user-1',
  restaurantName: 'Restaurant',
  orderDate,
  amountSpent: 20,
  items: [],
  dataSource: DataSource.EMAIL,
  receiptType: ReceiptType.UBER_EATS,
});

describe('receipt history view', () => {
  it('groups newest months first and keeps undated orders last', () => {
    const result = resolveReceiptHistorySections([
      receipt('old', '2026-08-10T12:00:00.000Z'),
      receipt('unknown', null),
      receipt('new', '2026-09-01T12:00:00.000Z'),
    ]);
    expect(result.map((section) => section.key)).toEqual(['2026-09', '2026-08', 'unknown']);
  });

  it('uses canonical month counts only for the unfiltered history', () => {
    const result = resolveReceiptHistorySections(
      [receipt('one', '2026-09-01T12:00:00.000Z')],
      [{ month: '2026-09', totalSpent: 100, receiptCount: 4 }],
      true,
    );
    expect(result[0].summary).toBe('4 orders');
  });

  it('produces stable local date filters', () => {
    const now = new Date(2026, 8, 20);
    expect(receiptDateFilters('all', now)).toEqual({});
    expect(receiptDateFilters('this_month', now)).toEqual({ startDate: '2026-09-01' });
    expect(receiptDateFilters('last_3_months', now)).toEqual({ startDate: '2026-07-01' });
  });
});
