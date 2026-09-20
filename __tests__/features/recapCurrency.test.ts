import { resolveRecapCurrency } from '@features/wrapped/recapCurrency';

describe('resolveRecapCurrency', () => {
  it('defaults to the dominant receipt currency', () => {
    expect(resolveRecapCurrency({
      receiptCurrency: 'CAD',
      selectedCurrency: 'USD',
      hasManualSelection: false,
    })).toBe('CAD');
  });

  it('preserves a supported manual selection', () => {
    expect(resolveRecapCurrency({
      receiptCurrency: 'CAD',
      selectedCurrency: 'GBP',
      hasManualSelection: true,
    })).toBe('GBP');
  });

  it('falls back safely when receipt currency cannot be determined', () => {
    expect(resolveRecapCurrency({
      receiptCurrency: 'UNKNOWN',
      selectedCurrency: 'USD',
      hasManualSelection: false,
    })).toBe('USD');
  });
});
