// Currency utility for formatting currency values
// Supports major Uber Eats markets

export type CurrencyCode = 'USD' | 'CAD' | 'MXN' | 'EUR' | 'GBP' | 'AUD' | 'NZD' | 'JPY';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  CAD: { code: 'CAD', symbol: '$', name: 'Canadian Dollar', locale: 'en-CA' },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-EU' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  AUD: { code: 'AUD', symbol: '$', name: 'Australian Dollar', locale: 'en-AU' },
  NZD: { code: 'NZD', symbol: '$', name: 'New Zealand Dollar', locale: 'en-NZ' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

/**
 * Format a number as currency using the specified currency code
 */
export function formatCurrency(amount: number, currencyCode: CurrencyCode = DEFAULT_CURRENCY): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  
  // For JPY, don't show decimals
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currencyCode,
    ...(currencyCode === 'JPY' ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  };

  return new Intl.NumberFormat(currency.locale, options).format(amount);
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: CurrencyCode): string {
  return SUPPORTED_CURRENCIES[currencyCode].symbol;
}

/**
 * Get currency name for a currency code
 */
export function getCurrencyName(currencyCode: CurrencyCode): string {
  return SUPPORTED_CURRENCIES[currencyCode].name;
}

/**
 * Detect currency from a currency string (e.g., from CSV)
 */
export function detectCurrency(currencyString: string | null | undefined): CurrencyCode {
  if (!currencyString) return DEFAULT_CURRENCY;
  
  const upper = currencyString.toUpperCase().trim();
  if (upper in SUPPORTED_CURRENCIES) {
    return upper as CurrencyCode;
  }
  
  return DEFAULT_CURRENCY;
}

/**
 * Detect currency from device locale
 * Maps locale/region codes to currency codes
 */
export function detectCurrencyFromLocale(locale: string | null | undefined): CurrencyCode {
  if (!locale) return DEFAULT_CURRENCY;
  
  const localeLower = locale.toLowerCase();
  
  // Map locale/region codes to currencies
  // Check for country codes first (more specific)
  if (localeLower.includes('us') || localeLower === 'en-us') return 'USD';
  if (localeLower.includes('ca') || localeLower === 'en-ca') return 'CAD';
  if (localeLower.includes('mx') || localeLower === 'es-mx') return 'MXN';
  if (localeLower.includes('gb') || localeLower === 'en-gb') return 'GBP';
  if (localeLower.includes('au') || localeLower === 'en-au') return 'AUD';
  if (localeLower.includes('nz') || localeLower === 'en-nz') return 'NZD';
  if (localeLower.includes('jp') || localeLower === 'ja-jp' || localeLower === 'ja') return 'JPY';
  
  // Check for EUR countries (common European locales)
  const eurCountries = ['de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'pt', 'fi', 'ie', 'gr', 'lu', 'dk', 'se', 'pl', 'cz', 'hu', 'sk', 'si', 'ee', 'lv', 'lt', 'mt', 'cy'];
  if (eurCountries.some(country => localeLower.includes(country))) return 'EUR';
  
  // Check if locale explicitly mentions EUR
  if (localeLower.includes('eur') || localeLower.includes('euro')) return 'EUR';
  
  return DEFAULT_CURRENCY;
}

