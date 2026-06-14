import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { receiptApi } from '../services/api/receiptApi';
import { DataSource } from '../types/api';

const EXPORT_UPSELL_STORAGE_PREFIX = '@snacktrack_export_upsell';
const EXPORT_UPSELL_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const EXPORT_UPSELL_MAX_DISMISSALS = 2;
const RECEIPT_SOURCE_CHECK_LIMIT = 50;

export interface ExportUpsellState {
  wrappedSeenAt: string | null;
  dashboardSeenAt: string | null;
  clickedAt: string | null;
  lastDismissedAt: string | null;
  dismissCount: number;
  completedAt: string | null;
}

const DEFAULT_STATE: ExportUpsellState = {
  wrappedSeenAt: null,
  dashboardSeenAt: null,
  clickedAt: null,
  lastDismissedAt: null,
  dismissCount: 0,
  completedAt: null,
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
    completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : null,
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
  const [hasCompletedExport, setHasCompletedExport] = useState(false);

  useEffect(() => {
    if (!userId) {
      setUpsellState(DEFAULT_STATE);
      setHasCompletedExport(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      try {
        const storedState = await loadStateForUser(userId);
        let nextState = storedState;
        let completed = Boolean(storedState.completedAt);

        if (!completed) {
          try {
            const response = await receiptApi.getReceipts(userId, RECEIPT_SOURCE_CHECK_LIMIT, 0);
            completed = response.data.some((receipt) => receipt.dataSource === DataSource.CSV);

            if (completed) {
              nextState = {
                ...storedState,
                completedAt: storedState.completedAt ?? new Date().toISOString(),
              };
              await saveStateForUser(userId, nextState);
            }
          } catch {
            completed = Boolean(storedState.completedAt);
          }
        }

        if (!cancelled) {
          setUpsellState(nextState);
          setHasCompletedExport(completed);
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

    const completedAt = new Date().toISOString();
    const nextState = {
      ...upsellState,
      completedAt,
    };

    setUpsellState(nextState);
    setHasCompletedExport(true);
    await saveStateForUser(userId, nextState);
  }, [upsellState, userId]);

  const isPermanentlyDismissed = upsellState.dismissCount >= EXPORT_UPSELL_MAX_DISMISSALS;
  const isSnoozed = isWithinSnoozeWindow(upsellState.lastDismissedAt);
  const shouldShowWrappedSlide = !isLoading && !hasCompletedExport && !isPermanentlyDismissed && !isSnoozed;
  const shouldShowDashboardCard = !isLoading && !hasCompletedExport && Boolean(upsellState.wrappedSeenAt) && !isPermanentlyDismissed && !isSnoozed;

  return {
    upsellState,
    isLoading,
    hasCompletedExport,
    shouldShowWrappedSlide,
    shouldShowDashboardCard,
    markSeen,
    markClicked,
    dismiss,
    markCompleted,
  };
}
