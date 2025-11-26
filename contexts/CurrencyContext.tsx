import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { CurrencyCode, DEFAULT_CURRENCY, detectCurrency, detectCurrencyFromLocale, formatCurrency as formatCurrencyUtil } from '../utils/currency';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  formatCurrency: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = '@snacktrack_currency';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, []);

  const loadCurrency = async () => {
    try {
      const stored = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
      
      if (stored) {
        // User has manually set a currency preference (or previously auto-detected)
        const detected = detectCurrency(stored);
        setCurrencyState(detected);
      } else {
        // No stored preference - auto-detect from device locale
        // Method 1: Try to use currencyCode directly from locale (most accurate)
        const locales = Localization.getLocales();
        let autoDetected: CurrencyCode = DEFAULT_CURRENCY;
        
        if (locales && locales.length > 0) {
          const locale = locales[0];
          let deviceLocale: string | null = null;
          
          // Prioritize region over language (user may use English US keyboard but be in Canada)
          // Method 1: Try regionCode from getLocales() (most direct region indicator)
          if (locale.regionCode) {
            deviceLocale = locale.regionCode;
          }
          
          // Method 2: Try languageRegionCode (region from language settings)
          if (!deviceLocale && locale.languageRegionCode) {
            deviceLocale = locale.languageRegionCode;
          }
          
          // Method 3: Fall back to languageTag (may contain region info like "en-CA")
          if (!deviceLocale && locale.languageTag) {
            deviceLocale = locale.languageTag;
          }
          
          // Use locale-based detection (prioritizes region over language)
          if (deviceLocale) {
            autoDetected = detectCurrencyFromLocale(deviceLocale);
          }
          
          // Method 4: Fall back to currencyCode only if locale-based detection didn't work
          // (currencyCode can be unreliable on Android without SIM card)
          if (autoDetected === DEFAULT_CURRENCY) {
            const currencyCode = locale.currencyCode || locale.languageCurrencyCode;
            if (currencyCode) {
              const currencyDetected = detectCurrency(currencyCode);
              // Only use currencyCode if it's a supported currency (not just default)
              if (currencyDetected !== DEFAULT_CURRENCY || currencyCode === 'USD') {
                autoDetected = currencyDetected;
              }
            }
          }
        }
        
        setCurrencyState(autoDetected);
        // Store the auto-detected currency so it persists
        await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, autoDetected);
      }
    } catch {
      // Default to USD on error
      setCurrencyState(DEFAULT_CURRENCY);
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrency = async (newCurrency: CurrencyCode) => {
    try {
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
      setCurrencyState(newCurrency);
    } catch {
      // Silently fail - user can try again
    }
  };

  const formatCurrency = (amount: number): string => {
    return formatCurrencyUtil(amount, currency);
  };

  if (isLoading) {
    // Return default currency while loading
    return (
      <CurrencyContext.Provider
        value={{
          currency: DEFAULT_CURRENCY,
          setCurrency,
          formatCurrency: (amount: number) => {
            return formatCurrencyUtil(amount, DEFAULT_CURRENCY);
          },
        }}
      >
        {children}
      </CurrencyContext.Provider>
    );
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

