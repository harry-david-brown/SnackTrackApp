import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ExportProvider } from "@features/import-flow/contracts";

const prefix = (userId: string) => `import-journey:${userId}:`;
export const tutorialPositionKey = (
  userId: string,
  provider: ExportProvider,
  mode: "request" | "download",
  cycle: string,
) => `${prefix(userId)}guide-v1:${provider}:${mode}:${cycle}`;
export const alertDismissalKey = (
  userId: string,
  provider: ExportProvider,
  cycle: string,
) => `${prefix(userId)}alert-dismissed:${provider}:${cycle}`;
export const alertEnrollmentKey = (userId: string) =>
  `${prefix(userId)}alert-enrollment`;
export async function clearImportJourneyStorage(userId: string): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
    key.startsWith(prefix(userId)),
  );
  if (keys.length) await AsyncStorage.multiRemove(keys);
}
