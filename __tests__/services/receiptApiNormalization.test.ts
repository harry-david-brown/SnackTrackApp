import { api } from '@services/api/client';
import { normalizeReceipt, normalizeReceiptPage, receiptApi } from '@services/api/receiptApi';
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
  it('preserves local order days for legacy rows and rejects malformed calendar days', () => {
    expect(normalizeReceipt({ ...receipt, orderDay: '2024-02-01' }).orderDay).toBe('2024-02-01');
    expect(normalizeReceipt({ ...receipt, orderDay: null }).orderDay).toBeNull();
    expect(normalizeReceipt(receipt).orderDay).toBeUndefined();
    expect(() => normalizeReceipt({ ...receipt, orderDay: '2024-02-30' })).toThrow('Invalid receipt response');
  });
  it('keeps optional reconciliation status and rejects unknown status values', () => {
    const reconciliation={status:'unresolved',method:'standalone',reason:'ambiguous'};
    expect(normalizeReceipt({...receipt,reconciliation}).reconciliation).toEqual(reconciliation);
    expect(normalizeReceipt(receipt).reconciliation).toBeUndefined();
    expect(()=>normalizeReceipt({...receipt,reconciliation:{...reconciliation,status:'hidden'}})).toThrow();
  });
  it('preserves both sources and signed checkout differences without turning unavailable into zero', () => {
    const difference = { status: 'available', amount: -6.24, emailTotal: 24.72, exportSubtotal: 30.96, currencyCode: 'CAD', subtotalBasis: 'reconstructed' };
    const normalized = normalizeReceipt({ ...receipt, sources: ['csv','email'], checkoutDifference: difference });
    expect(normalized.sources).toEqual([DataSource.CSV,DataSource.EMAIL]);
    expect(normalized.checkoutDifference).toEqual(difference);
    expect(normalizeReceipt({ ...receipt, checkoutDifference: { ...difference, status: 'unavailable', amount: null, reason: 'unknown_currency' } }).checkoutDifference?.amount).toBeNull();
    expect(() => normalizeReceipt({ ...receipt, checkoutDifference: { ...difference, amount: 6.24 } })).toThrow('Invalid receipt response');
  });
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
      filters: { receiptType: ReceiptType.UBER_EATS, minAmount: 5, outcome: 'canceled', currencyCode: 'CAD', startDate: '2023-12-10', endDate: '2023-12-10' },
    });

    expect(api.get).toHaveBeenCalledWith('/receipts', {
      params: { page: 2, limit: 10, receiptType: 'uber_eats', minAmount: 5, outcome: 'canceled', currencyCode: 'CAD', startDate: '2023-12-10', endDate: '2023-12-10' },
    });
  });
});
