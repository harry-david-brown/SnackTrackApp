export type SetupCompletionMethod =
  | 'email_receipts'
  | 'provider_history_request'
  | 'provider_archive';

export interface ExperienceState {
  setup: {
    state: 'required' | 'importing' | 'complete';
    completedAt: string | null;
    completionMethod: SetupCompletionMethod | null;
    activeOperationId: string | null;
  };
  firstRecap: {
    state: 'ineligible' | 'ready' | 'seen';
    minimumOrderCount: 3;
    version: 'lifetime-v1';
    seenAt: string | null;
  };
  receiptCount: number;
}
