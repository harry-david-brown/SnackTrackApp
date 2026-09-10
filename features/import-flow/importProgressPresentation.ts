import type { ImportOperation } from './contracts';

export type ImportProgressStepState = 'pending' | 'active' | 'complete';
export const IMPORT_PROGRESS_MIN_STEP_MS = 500;
export const IMPORT_PROGRESS_COMPLETION_STEP_MS = 700;
export const IMPORT_PROGRESS_ANIMATION_MS = 700;
export const IMPORT_PROGRESS_COMPLETE_HOLD_MS = 700;
export const EXPORT_UPLOAD_PROGRESS_SHARE = 15;

export interface ImportProgressViewModel {
  eyebrow: string;
  title: string;
  body: string;
  steps: readonly [ImportProgressStepState, ImportProgressStepState, ImportProgressStepState, ImportProgressStepState];
}

export const resolveImportProgressPosition = (operation: ImportOperation): number => {
  if (operation.status === 'succeeded') return 4;
  switch (operation.presentation?.stage) {
    case 'preparing_recap': return 3;
    case 'building_history': return 2;
    case 'discovering': return 1;
    default: return 0;
  }
};

/** Treats file transfer as the opening part of one continuous export-import journey. */
export const resolveOverallImportProgress = (
  operation: ImportOperation | null | undefined,
  uploadProgress?: number,
): number => {
  if (typeof uploadProgress === 'number') {
    const normalizedUpload = Math.max(0, Math.min(1, uploadProgress));
    return Math.round(normalizedUpload * EXPORT_UPLOAD_PROGRESS_SHARE);
  }
  const operationProgress = Math.max(0, Math.min(100, Math.round(operation?.progress ?? 0)));
  if (operation?.kind !== 'export_file') return operationProgress;
  if (operation.status === 'succeeded') return 100;
  return Math.round(EXPORT_UPLOAD_PROGRESS_SHARE + (operationProgress / 100) * (100 - EXPORT_UPLOAD_PROGRESS_SHARE));
};

export const resolveImportProgressSteps = (
  position: number,
): ImportProgressViewModel['steps'] => {
  const stateAt = (index: number): ImportProgressStepState => position > index ? 'complete' : position === index ? 'active' : 'pending';
  return [stateAt(0), stateAt(1), stateAt(2), stateAt(3)];
};

export function resolveImportProgressPresentation(operation: ImportOperation): ImportProgressViewModel {
  const current = resolveImportProgressPosition(operation);
  if (operation.journeyContext === 'post_onboarding') return {
    eyebrow: operation.kind === 'export_file' ? 'ADDING YOUR ORDERS' : 'CHECKING EMAIL',
    title: current >= 2 ? 'Updating your order history' : operation.kind === 'export_file' ? 'Reading your delivery history' : 'Looking for delivery receipts',
    body: 'Your submitted import continues in the background. You can return to Add orders to check its status.',
    steps: resolveImportProgressSteps(current),
  };
  if (operation.kind === 'export_file') return {
    eyebrow: 'BUILDING YOUR HISTORY',
    title: current >= 2 ? 'Building your delivery stats' : 'Reading your delivery history',
    body: 'Your file is submitted. SnackTrack is adding supported orders and preparing your stats. Processing continues in the background.',
    steps: resolveImportProgressSteps(current),
  };
  const found = (operation.presentation?.discoveredOrderCount ?? 0) > 0 || current >= 2;
  const steps = resolveImportProgressSteps(current);
  return {
    eyebrow: 'BUILDING YOUR HISTORY',
    title: found ? 'We found your receipts' : 'Finding your receipts',
    body: found
      ? 'Turning them into your first SnackTrack now. This usually takes 2–3 minutes.'
      : 'We’re securely looking for supported delivery receipts. This usually takes 2–3 minutes.',
    steps,
  };
}
