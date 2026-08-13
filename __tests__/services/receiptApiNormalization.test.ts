import { normalizeReceiptPage } from '../../services/api/receiptApi';
import { DataSource, ReceiptType } from '../../types/api';

describe('normalizeReceiptPage', () => {
  it('maps snake-case transport fields and string item payloads', () => {
    const result = normalizeReceiptPage({
      data: [{
        id: 'receipt-1', user_id: 'user-1', restaurant_name: 'Noodle House',
        order_date: '2026-08-01', amount_spent: 24,
        items: '[{"name":"Soup","quantity":2,"price":8}]',
        data_source: 'email', receipt_type: 'uber_eats', created_at: '2026-08-01T12:00:00Z',
      }],
      pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
    }, 20, 0);
    expect(result.data[0]).toMatchObject({
      id: 'receipt-1', userId: 'user-1', restaurantName: 'Noodle House',
      dataSource: DataSource.EMAIL, receiptType: ReceiptType.UBER_EATS,
      items: [{ name: 'Soup', quantity: 2, price: 8 }],
    });
  });

  it('fails safely when required transport fields are malformed', () => {
    expect(() => normalizeReceiptPage({ data: [{ amount_spent: '24' }] }, 20, 0))
      .toThrow('Invalid receipt response');
  });

  it('accepts the live endpoint shape when creation metadata is omitted', () => {
    const result = normalizeReceiptPage({
      data: [{
        id: 'receipt-2', userId: 'user-1', restaurantName: 'Taco House',
        orderDate: '2026-08-02T12:00:00Z', amountSpent: 18, items: [],
        dataSource: 'email', receiptType: 'uber_eats',
      }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1, hasMore: false, hasPrevious: false },
    }, 20, 0);

    expect(result.data[0].createdAt).toBe('2026-08-02T12:00:00Z');
    expect(result.pagination.offset).toBe(0);
  });
});
