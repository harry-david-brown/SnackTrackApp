import type { ImportPreferencesResponse } from "./contracts";

export function canMarkUberNotUsed(preferences: ImportPreferencesResponse | null): boolean {
  if (!preferences) return false;
  const uber = preferences.export.providers.uberEats;
  return !preferences.coverage.emailProviders.uberEats.hasData
    && !preferences.coverage.exportProviders.uberEats.hasData
    && uber.status === "not_started"
    && uber.relevance !== "not_used";
}
