import { useEffect, useState } from 'react';
import { useExperienceStateQuery } from '@hooks/queries/useExperienceStateQuery';
import type { ImportOperation } from '@features/import-flow/contracts';

/** Keep the first-import presentation stable as this job begins saving orders. */
export function useFirstImportProgress(userId: string | undefined, operation: ImportOperation | null | undefined) {
  const experience = useExperienceStateQuery(userId);
  const [resolved, setResolved] = useState<{ id: string; first: boolean } | null>(null);
  const operationId = operation?.id;
  const candidate = operation?.journeyContext === 'onboarding' ? true
    : experience.data ? experience.data.receiptCount === 0 : null;
  useEffect(() => {
    if (!operationId || candidate === null) return;
    setResolved(current => current?.id === operationId ? current : { id: operationId, first: candidate });
  }, [operationId, candidate]);
  return resolved?.id === operation?.id ? resolved?.first ?? null : candidate;
}
