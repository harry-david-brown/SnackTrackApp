import { useEffect, useState } from 'react';
import {
  IMPORT_PROGRESS_ANIMATION_MS,
  IMPORT_PROGRESS_COMPLETE_HOLD_MS,
  IMPORT_PROGRESS_COMPLETION_STEP_MS,
  IMPORT_PROGRESS_MIN_STEP_MS,
} from '@features/import-flow/importProgressPresentation';

interface ImportProgressPacingState {
  readonly operationId: string | null;
  readonly visiblePosition: number;
  readonly visibleProgress: number;
  readonly readyForCompletion: boolean;
}

const initialState = (operationId: string | null): ImportProgressPacingState => ({
  operationId,
  visiblePosition: 0,
  visibleProgress: 0,
  readyForCompletion: false,
});

/**
 * Lets durable import progress move the visual target forward without allowing
 * any checklist step, or the final completed checklist, to be skipped.
 */
export function useImportProgressPacing(
  operationId: string | undefined,
  targetPosition: number,
  targetProgress = 0,
): { visiblePosition: number; visibleProgress: number; readyForCompletion: boolean } {
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
    if (!normalizedOperationId) return;
    const normalizedTarget = Math.max(0, Math.min(100, Math.round(targetProgress)));
    if (currentState.visibleProgress >= normalizedTarget) return;
    const completionMilestones = [90, 95, 100];
    const nextProgress = normalizedTarget < 100
      ? normalizedTarget
      : completionMilestones.find(milestone => milestone > currentState.visibleProgress) ?? 100;
    const delay = normalizedTarget < 100 ? 0 : IMPORT_PROGRESS_COMPLETION_STEP_MS;
    const timer = setTimeout(() => {
      setState(previous => previous.operationId === normalizedOperationId
        ? { ...previous, visibleProgress: Math.max(previous.visibleProgress, nextProgress) }
        : previous);
    }, delay);
    return () => clearTimeout(timer);
  }, [currentState.visibleProgress, normalizedOperationId, targetProgress]);

  useEffect(() => {
    if (
      !normalizedOperationId
      || targetPosition < 4
      || currentState.visiblePosition < 4
      || currentState.visibleProgress < 100
      || currentState.readyForCompletion
    ) return;
    const timer = setTimeout(() => {
      setState(previous => previous.operationId === normalizedOperationId
        ? { ...previous, readyForCompletion: true }
        : previous);
    }, IMPORT_PROGRESS_ANIMATION_MS + IMPORT_PROGRESS_COMPLETE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [
    currentState.readyForCompletion,
    currentState.visibleProgress,
    currentState.visiblePosition,
    normalizedOperationId,
    targetPosition,
  ]);

  return {
    visiblePosition: currentState.visiblePosition,
    visibleProgress: currentState.visibleProgress,
    readyForCompletion: currentState.readyForCompletion,
  };
}
