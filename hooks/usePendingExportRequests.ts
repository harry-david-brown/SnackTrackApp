import { useEffect, useState } from 'react';
import type { ExportProvider, ImportPreferencesResponse } from '@features/import-flow/contracts';
import { getPendingExportRequest, type PendingExportRequest } from '@utils/exportDownloadHandoff';

export function usePendingExportRequests(userId: string | undefined, preferences: ImportPreferencesResponse | null) {
  const [pending, setPending] = useState<Partial<Record<ExportProvider, PendingExportRequest>>>({});
  const statuses = preferences?.export.providers;
  useEffect(() => {
    let current = true;
    setPending({});
    if (userId && statuses) void Promise.all((['uber_eats', 'doordash'] as const).map(async provider => [provider, await getPendingExportRequest(userId, provider, (provider === 'uber_eats' ? statuses.uberEats : statuses.doorDash).updatedAt)] as const)).then(entries => {
      if (current) setPending(Object.fromEntries(entries.filter(([, request]) => request !== null)));
    });
    return () => { current = false; };
  }, [userId, statuses]);
  return pending;
}
