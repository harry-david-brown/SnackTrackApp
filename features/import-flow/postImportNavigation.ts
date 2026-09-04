import type { ExperienceState } from '@features/experience/contracts';

export type PostImportDestination =
  | 'recovery'
  | 'quick_setup'
  | 'automatic_recap'
  | 'small_history'
  | 'data_tracking';

export function resolvePostImportDestination(input: {
  experience: ExperienceState;
  outcome?: 'succeeded' | 'failed' | 'cancelled';
  routineCheck?: boolean;
}): PostImportDestination {
  if (input.outcome === 'failed' || input.outcome === 'cancelled') return 'recovery';
  if (input.experience.setup.state === 'required') return 'quick_setup';
  if (!input.routineCheck && input.experience.firstRecap.state === 'ready') return 'automatic_recap';
  if (input.experience.receiptCount < input.experience.firstRecap.minimumOrderCount) return 'small_history';
  return 'data_tracking';
}
