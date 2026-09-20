import { formatReceiptMoney } from '@utils/receiptMoney';

describe('receipt money display', () => {
  it('does not substitute the display preference for a known source currency', () => {
    expect(formatReceiptMoney(12, 'USD', () => 'wrong CAD')).toContain('US$12.00');
  });
  it('does not invent a currency for DoorDash subtotal exports', () => {
    expect(formatReceiptMoney(12, 'UNKNOWN', () => '$12')).toBe('12.00 (currency unknown)');
  });
  it('preserves compatibility with legacy responses', () => {
    expect(formatReceiptMoney(12, undefined, () => 'legacy')).toBe('legacy');
  });
});
