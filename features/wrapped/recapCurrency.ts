import type { CurrencyCode } from '@utils/currency';

export const RECAP_CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP'] as const;
export type RecapCurrency = typeof RECAP_CURRENCIES[number];

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
