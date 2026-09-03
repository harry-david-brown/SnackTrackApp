import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_PENDING_OPERATIONS_KEY = '@snacktrack_pending_operations';

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const belongsToUser = (value: unknown, userId: string): boolean => {
  const operation = record(value);
  const data = record(operation?.data);
  return data?.userId === userId;
};

/**
 * Removes work left by pre-refactor builds. Export files are no longer placed
 * in AsyncStorage: a URI-backed native file is not a durable serializable command and
 * retries now remain in the visible upload controller.
 */
export const removePendingOperationsForUser = async (userId: string): Promise<void> => {
  const serialized = await AsyncStorage.getItem(LEGACY_PENDING_OPERATIONS_KEY);
  if (!serialized) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    await AsyncStorage.removeItem(LEGACY_PENDING_OPERATIONS_KEY);
    return;
  }
  if (!Array.isArray(parsed)) {
    await AsyncStorage.removeItem(LEGACY_PENDING_OPERATIONS_KEY);
    return;
  }

  const remaining = parsed.filter((operation) => !belongsToUser(operation, userId));
  if (remaining.length === 0) {
    await AsyncStorage.removeItem(LEGACY_PENDING_OPERATIONS_KEY);
    return;
  }
  await AsyncStorage.setItem(LEGACY_PENDING_OPERATIONS_KEY, JSON.stringify(remaining));
};
