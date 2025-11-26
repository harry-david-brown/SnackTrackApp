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
 * Handles various formats: "en-CA", "en_CA", "CA", "en", etc.
 */
export function detectCurrencyFromLocale(locale: string | null | undefined): CurrencyCode {
  if (!locale) return DEFAULT_CURRENCY;
  
  // Normalize locale: convert underscores to hyphens and lowercase
  const localeNormalized = locale.toLowerCase().replace(/_/g, '-');
  
  // Extract region code if present (e.g., "en-CA" -> "ca", "CA" -> "ca")
  const parts = localeNormalized.split('-');
  const regionCode = parts.length > 1 ? parts[parts.length - 1] : (parts[0].length === 2 ? parts[0] : null);
  const fullLocale = localeNormalized;
  
  // Map locale/region codes to currencies
  // Check for country codes first (more specific)
  // Check full locale strings (e.g., "en-ca", "en_ca")
  if (fullLocale === 'en-us' || fullLocale === 'en_us' || regionCode === 'us') return 'USD';
  if (fullLocale === 'en-ca' || fullLocale === 'en_ca' || regionCode === 'ca') return 'CAD';
  if (fullLocale === 'es-mx' || fullLocale === 'es_mx' || regionCode === 'mx') return 'MXN';
  if (fullLocale === 'en-gb' || fullLocale === 'en_gb' || regionCode === 'gb') return 'GBP';
  if (fullLocale === 'en-au' || fullLocale === 'en_au' || regionCode === 'au') return 'AUD';
  if (fullLocale === 'en-nz' || fullLocale === 'en_nz' || regionCode === 'nz') return 'NZD';
  if (fullLocale === 'ja-jp' || fullLocale === 'ja_jp' || fullLocale === 'ja' || regionCode === 'jp') return 'JPY';
  
  // Check for EUR countries (common European locales)
  const eurCountries = ['de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'pt', 'fi', 'ie', 'gr', 'lu', 'dk', 'se', 'pl', 'cz', 'hu', 'sk', 'si', 'ee', 'lv', 'lt', 'mt', 'cy'];
  if (regionCode && eurCountries.includes(regionCode)) return 'EUR';
  if (eurCountries.some(country => fullLocale.includes(`-${country}`) || fullLocale.includes(`_${country}`))) return 'EUR';
  
  // Check if locale explicitly mentions EUR
  if (fullLocale.includes('eur') || fullLocale.includes('euro')) return 'EUR';
  
  return DEFAULT_CURRENCY;
}

