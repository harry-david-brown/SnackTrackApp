import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useImportPreferences } from './useImportPreferences';

const EXPORT_UPSELL_STORAGE_PREFIX = '@snacktrack_export_upsell';
const EXPORT_UPSELL_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const EXPORT_UPSELL_MAX_DISMISSALS = 2;

export interface ExportUpsellState {
  wrappedSeenAt: string | null;
  dashboardSeenAt: string | null;
  clickedAt: string | null;
  lastDismissedAt: string | null;
  dismissCount: number;
}

const DEFAULT_STATE: ExportUpsellState = {
  wrappedSeenAt: null,
  dashboardSeenAt: null,
  clickedAt: null,
  lastDismissedAt: null,
  dismissCount: 0,
};

type ExportUpsellSurface = 'wrapped' | 'dashboard';
const getStorageKey = (userId: string) => `${EXPORT_UPSELL_STORAGE_PREFIX}_${userId}`;

const sanitizeState = (value: unknown): ExportUpsellState => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_STATE;
  }

  const parsed = value as Partial<ExportUpsellState>;

  return {
    wrappedSeenAt: typeof parsed.wrappedSeenAt === 'string' ? parsed.wrappedSeenAt : null,
    dashboardSeenAt: typeof parsed.dashboardSeenAt === 'string' ? parsed.dashboardSeenAt : null,
    clickedAt: typeof parsed.clickedAt === 'string' ? parsed.clickedAt : null,
    lastDismissedAt: typeof parsed.lastDismissedAt === 'string' ? parsed.lastDismissedAt : null,
    dismissCount: typeof parsed.dismissCount === 'number' ? parsed.dismissCount : 0,
  };
};

const loadStateForUser = async (userId: string): Promise<ExportUpsellState> => {
  const raw = await AsyncStorage.getItem(getStorageKey(userId));
  if (!raw) {
    return DEFAULT_STATE;
  }

  try {
    return sanitizeState(JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
};

const saveStateForUser = async (userId: string, state: ExportUpsellState) => {
  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(state));
};

/** Clear device-side presentation history after the server resets receipt coverage. */
export const resetExportUpsellForUser = async (userId: string) => {
  await saveStateForUser(userId, DEFAULT_STATE);
};

const isWithinSnoozeWindow = (lastDismissedAt: string | null) => {
  if (!lastDismissedAt) {
    return false;
  }

  const dismissedAt = new Date(lastDismissedAt).getTime();
  if (Number.isNaN(dismissedAt)) {
    return false;
  }

  return Date.now() - dismissedAt < EXPORT_UPSELL_SNOOZE_MS;
};

export function useExportUpsell(userId?: string | null) {
  const [upsellState, setUpsellState] = useState<ExportUpsellState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const {
    preferences,
    isLoading: arePreferencesLoading,
    refresh: refreshPreferences,
  } = useImportPreferences(Boolean(userId));
  const hasCompletedExport = Boolean(
    preferences?.coverage.hasExportData || preferences?.export.status === 'completed'
  );

  useEffect(() => {
    if (!userId) {
      setUpsellState(DEFAULT_STATE);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      try {
        const storedState = await loadStateForUser(userId);
        if (!cancelled) {
          setUpsellState(storedState);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const updateState = useCallback(async (updater: (current: ExportUpsellState) => ExportUpsellState) => {
    if (!userId) {
      return;
    }

    const nextState = updater(upsellState);
    setUpsellState(nextState);
    await saveStateForUser(userId, nextState);
  }, [upsellState, userId]);

  const markSeen = useCallback(async (surface: ExportUpsellSurface) => {
    const timestamp = new Date().toISOString();

    await updateState((current) => {
      if (surface === 'wrapped' && current.wrappedSeenAt) {
        return current;
      }

      if (surface === 'dashboard' && current.dashboardSeenAt) {
        return current;
      }

      return {
        ...current,
        wrappedSeenAt: surface === 'wrapped' ? timestamp : current.wrappedSeenAt,
        dashboardSeenAt: surface === 'dashboard' ? timestamp : current.dashboardSeenAt,
      };
    });
  }, [updateState]);

  const markClicked = useCallback(async () => {
    await updateState((current) => ({
      ...current,
      clickedAt: new Date().toISOString(),
    }));
  }, [updateState]);

  const dismiss = useCallback(async () => {
    await updateState((current) => ({
      ...current,
      lastDismissedAt: new Date().toISOString(),
      dismissCount: current.dismissCount + 1,
    }));
  }, [updateState]);

  const markCompleted = useCallback(async () => {
    if (!userId) {
      return;
    }

    await refreshPreferences();
  }, [refreshPreferences, userId]);

  const isPermanentlyDismissed = upsellState.dismissCount >= EXPORT_UPSELL_MAX_DISMISSALS;
  const isSnoozed = isWithinSnoozeWindow(upsellState.lastDismissedAt);
  const shouldShowDashboardCard = !isLoading && !arePreferencesLoading && !hasCompletedExport && Boolean(upsellState.wrappedSeenAt) && !isPermanentlyDismissed && !isSnoozed;

  return {
    upsellState,
    isLoading: isLoading || arePreferencesLoading,
    hasCompletedExport,
    shouldShowDashboardCard,
    markSeen,
    markClicked,
    dismiss,
    markCompleted,
  };
}
