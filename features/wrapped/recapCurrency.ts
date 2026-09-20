import type { CurrencyCode } from '@utils/currency';

export type RecapCurrency = Extract<CurrencyCode, 'CAD' | 'USD' | 'EUR' | 'GBP'>;

const isRecapCurrency = (value: string | null | undefined): value is RecapCurrency =>
  value === 'CAD' || value === 'USD' || value === 'EUR' || value === 'GBP';

/** Receipt history owns the default; a deliberate user selection owns the override. */
export function resolveRecapCurrency({
  receiptCurrency,
  selectedCurrency,
  hasManualSelection,
}: {
  receiptCurrency?: string;
  selectedCurrency: CurrencyCode;
  hasManualSelection: boolean;
}): RecapCurrency {
  if (hasManualSelection && isRecapCurrency(selectedCurrency)) return selectedCurrency;
  if (isRecapCurrency(receiptCurrency)) return receiptCurrency;
  if (isRecapCurrency(selectedCurrency)) return selectedCurrency;
  return 'USD';
}
