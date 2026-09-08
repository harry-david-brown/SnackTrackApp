import { useEffect, useState } from 'react';
import type { ImportTimeEstimate } from '@features/import-flow/contracts';
import { stabilizeImportTimeEstimate } from '@features/import-flow/importTimeEstimate';

interface EstimateState {
  readonly operationId: string | null;
  readonly estimate: ImportTimeEstimate | null;
}

export function useStableImportTimeEstimate(
  operationId: string | undefined,
  incoming: ImportTimeEstimate | null | undefined,
): ImportTimeEstimate | null {
  const normalizedId = operationId ?? null;
  const normalizedEstimate = incoming ?? null;
  const [state, setState] = useState<EstimateState>({ operationId: normalizedId, estimate: normalizedEstimate });
  const current = state.operationId === normalizedId ? state.estimate : normalizedEstimate;

  useEffect(() => {
    setState(previous => previous.operationId === normalizedId
      ? { operationId: normalizedId, estimate: stabilizeImportTimeEstimate(previous.estimate, normalizedEstimate) }
      : { operationId: normalizedId, estimate: normalizedEstimate });
  }, [normalizedEstimate, normalizedId]);

  return current;
}
