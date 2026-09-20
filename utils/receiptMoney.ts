/** A display currency never converts an amount. Legacy responses retain their existing formatter. */
export function formatReceiptMoney(amount: number, currency: string | undefined, legacy: (amount: number) => string): string {
  if (!currency) return legacy(amount);
  if (!['CAD','USD','EUR','GBP'].includes(currency)) return `${amount.toFixed(2)} (currency unknown)`;
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amount);
}
