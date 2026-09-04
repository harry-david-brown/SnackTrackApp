import type { ImportOperation } from './contracts';

export type ImportProgressStepState = 'pending' | 'active' | 'complete';

export interface ImportProgressViewModel {
  eyebrow: string;
  title: string;
  body: string;
  steps: readonly [ImportProgressStepState, ImportProgressStepState, ImportProgressStepState, ImportProgressStepState];
}

const stageIndex = (operation: ImportOperation): number => {
  if (operation.status === 'succeeded') return 4;
  switch (operation.presentation?.stage) {
    case 'preparing_recap': return 3;
    case 'building_history': return 2;
    case 'discovering': return 1;
    default: return 0;
  }
};

export function resolveImportProgressPresentation(operation: ImportOperation): ImportProgressViewModel {
  const current = stageIndex(operation);
  const found = (operation.presentation?.discoveredOrderCount ?? 0) > 0 || current >= 2;
  const stateAt = (index: number): ImportProgressStepState => current > index ? 'complete' : current === index ? 'active' : 'pending';
  const steps: ImportProgressViewModel['steps'] = [stateAt(0), stateAt(1), stateAt(2), stateAt(3)];
  return {
    eyebrow: 'BUILDING YOUR HISTORY',
    title: found ? 'We found your receipts' : 'Finding your receipts',
    body: found
      ? 'Turning them into your first SnackTrack now. This usually takes 2–3 minutes.'
      : 'We’re securely looking for supported delivery receipts. This usually takes 2–3 minutes.',
    steps,
  };
}
