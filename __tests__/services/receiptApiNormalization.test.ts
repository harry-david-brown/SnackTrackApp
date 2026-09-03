import { api } from '@services/api/client';
import { normalizeReceiptPage, receiptApi } from '@services/api/receiptApi';
import { DataSource, ReceiptType } from '@/types/api';
import { receiptPageFixture } from '@/__tests__/fixtures/contracts';

jest.mock('@services/api/client');

const receipt = {
  id: 'receipt-1',
  userId: 'user-1',
  restaurantName: 'Noodle House',
  orderDate: '2026-08-01T12:00:00.000Z',
  amountSpent: 24,
  items: [{ name: 'Soup', quantity: 2, price: 8, customizations: ['Hot Mustard'] }],
  dataSource: 'email',
  receiptType: 'uber_eats',
};

describe('canonical receipt transport boundary', () => {
  it('normalizes the canonical items/pageInfo response', () => {
    const result = normalizeReceiptPage(receiptPageFixture);

    expect(result.items[0]).toMatchObject({
      id: receiptPageFixture.items[0].id,
      userId: receiptPageFixture.items[0].userId,
      restaurantName: 'Example Kitchen',
      dataSource: DataSource.EMAIL,
      receiptType: ReceiptType.DOORDASH,
      items: [{ name: 'Dinner', quantity: 1, price: 25.99 }],
    });
    expect(result.pageInfo.nextPage).toBeNull();
  });

  it.each([
    { data: [receipt], pagination: { total: 1 } },
    {
      items: [{ ...receipt, amount_spent: 24, amountSpent: undefined }],
      pageInfo: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false, nextPage: null },
    },
    {
      items: [{ ...receipt, dataSource: 'spreadsheet' }],
      pageInfo: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false, nextPage: null },
    },
    {
      items: [receipt],
      pageInfo: { page: 1, limit: 20, total: 21, totalPages: 2, hasMore: false, nextPage: null },
    },
  ])('rejects legacy, malformed, or internally inconsistent data: %p', value => {
    expect(() => normalizeReceiptPage(value)).toThrow('Invalid receipt response');
  });

  it('uses authenticated identity and sends every list parameter through request params', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        items: [receipt],
        pageInfo: { page: 2, limit: 10, total: 11, totalPages: 2, hasMore: false, nextPage: null },
      },
    });

    await receiptApi.getReceipts({
      page: 2,
      limit: 10,
      filters: { receiptType: ReceiptType.UBER_EATS, minAmount: 5 },
    });

    expect(api.get).toHaveBeenCalledWith('/receipts', {
      params: { page: 2, limit: 10, receiptType: 'uber_eats', minAmount: 5 },
    });
  });
});
