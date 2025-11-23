import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { CurrencyCode, DEFAULT_CURRENCY, detectCurrency, detectCurrencyFromLocale } from '../utils/currency';

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
        // User has manually set a currency preference
        const detected = detectCurrency(stored);
        setCurrencyState(detected);
      } else {
        // No stored preference - auto-detect from device locale
        const locales = Localization.getLocales();
        const deviceLocale = locales && locales.length > 0 
          ? (locales[0].regionCode || locales[0].languageTag || locales[0].languageCode || null)
          : null;
        const autoDetected = detectCurrencyFromLocale(deviceLocale);
        setCurrencyState(autoDetected);
        // Store the auto-detected currency so it persists
        await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, autoDetected);
      }
    } catch (error) {
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
    } catch (error) {
      // Silently fail - user can try again
    }
  };

  const formatCurrency = (amount: number): string => {
    const { formatCurrency: format } = require('../utils/currency');
    return format(amount, currency);
  };

  if (isLoading) {
    // Return default currency while loading
    return (
      <CurrencyContext.Provider
        value={{
          currency: DEFAULT_CURRENCY,
          setCurrency,
          formatCurrency: (amount: number) => {
            const { formatCurrency: format } = require('../utils/currency');
            return format(amount, DEFAULT_CURRENCY);
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

