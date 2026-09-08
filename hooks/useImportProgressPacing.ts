import { useEffect, useState } from 'react';
import { IMPORT_PROGRESS_MIN_STEP_MS } from '@features/import-flow/importProgressPresentation';

interface ImportProgressPacingState {
  readonly operationId: string | null;
  readonly visiblePosition: number;
  readonly readyForCompletion: boolean;
}

const initialState = (operationId: string | null): ImportProgressPacingState => ({
  operationId,
  visiblePosition: 0,
  readyForCompletion: false,
});

/**
 * Lets durable import progress move the visual target forward without allowing
 * any checklist step, or the final completed checklist, to be skipped.
 */
export function useImportProgressPacing(
  operationId: string | undefined,
  targetPosition: number,
): { visiblePosition: number; readyForCompletion: boolean } {
  const normalizedOperationId = operationId ?? null;
  const [state, setState] = useState<ImportProgressPacingState>(() => initialState(normalizedOperationId));
  const currentState = state.operationId === normalizedOperationId
    ? state
    : initialState(normalizedOperationId);

  useEffect(() => {
    if (state.operationId === normalizedOperationId) return;
    setState(initialState(normalizedOperationId));
  }, [normalizedOperationId, state.operationId]);

  useEffect(() => {
    if (!normalizedOperationId || currentState.visiblePosition >= targetPosition) return;
    const timer = setTimeout(() => {
      setState(previous => previous.operationId === normalizedOperationId
        ? {
            ...previous,
            visiblePosition: Math.min(previous.visiblePosition + 1, targetPosition),
          }
        : previous);
    }, IMPORT_PROGRESS_MIN_STEP_MS);
    return () => clearTimeout(timer);
  }, [currentState.visiblePosition, normalizedOperationId, targetPosition]);

  useEffect(() => {
    if (
      !normalizedOperationId
      || targetPosition < 4
      || currentState.visiblePosition < 4
      || currentState.readyForCompletion
    ) return;
    const timer = setTimeout(() => {
      setState(previous => previous.operationId === normalizedOperationId
        ? { ...previous, readyForCompletion: true }
        : previous);
    }, IMPORT_PROGRESS_MIN_STEP_MS);
    return () => clearTimeout(timer);
  }, [
    currentState.readyForCompletion,
    currentState.visiblePosition,
    normalizedOperationId,
    targetPosition,
  ]);

  return {
    visiblePosition: currentState.visiblePosition,
    readyForCompletion: currentState.readyForCompletion,
  };
}
