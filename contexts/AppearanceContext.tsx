import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  type AppearancePreference,
  type AppColorScheme,
  type AppTheme,
  themeForScheme,
} from '@constants/theme';

const APPEARANCE_STORAGE_KEY = '@snacktrack:appearance';

interface AppearanceContextValue {
  preference: AppearancePreference;
  scheme: AppColorScheme;
  theme: AppTheme;
  isReady: boolean;
  setPreference: (preference: AppearancePreference) => Promise<void>;
}

const defaultAppearance: AppearanceContextValue = {
  preference: 'system',
  scheme: 'light',
  theme: themeForScheme('light'),
  isReady: true,
  setPreference: async () => undefined,
};
const AppearanceContext = createContext<AppearanceContextValue>(defaultAppearance);

const isAppearancePreference = (value: string | null): value is AppearancePreference =>
  value === 'system' || value === 'light' || value === 'dark';

export function AppearanceProvider({ children }: React.PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(APPEARANCE_STORAGE_KEY)
      .then(value => {
        if (active && isAppearancePreference(value)) setPreferenceState(value);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  const setPreference = useCallback(async (next: AppearancePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, next);
  }, []);

  const scheme: AppColorScheme = preference === 'system'
    ? systemScheme === 'dark' ? 'dark' : 'light'
    : preference;
  const value = useMemo<AppearanceContextValue>(() => ({
    preference,
    scheme,
    theme: themeForScheme(scheme),
    isReady,
    setPreference,
  }), [isReady, preference, scheme, setPreference]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export const useAppearance = (): AppearanceContextValue => {
  return useContext(AppearanceContext);
};

export const useAppTheme = (): AppTheme => useAppearance().theme;

export const useThemedStyles = <T,>(factory: (theme: AppTheme) => T): T => {
  const theme = useAppTheme();
  return useMemo(() => factory(theme), [factory, theme]);
};

export const appearanceStorageKeyForTests = APPEARANCE_STORAGE_KEY;
