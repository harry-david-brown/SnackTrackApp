import { resolvePostImportDestination } from './postImportNavigation';
import type { ExperienceState } from '@features/experience/contracts';

const experience = (overrides: Partial<ExperienceState> = {}): ExperienceState => ({
  setup: { state: 'complete', completedAt: '2026-09-03T00:00:00.000Z', completionMethod: 'email_receipts', activeOperationId: null },
  firstRecap: { state: 'ready', minimumOrderCount: 3, version: 'lifetime-v1', seenAt: null },
  receiptCount: 3,
  ...overrides,
});

describe('post-import navigation', () => {
  it('sends an eligible unseen first recap straight to Wrapped', () => {
    expect(resolvePostImportDestination({ experience: experience() })).toBe('automatic_recap');
  });

  it('keeps zero-result setup mandatory and treats small history separately', () => {
    expect(resolvePostImportDestination({ experience: experience({
      setup: { state: 'required', completedAt: null, completionMethod: null, activeOperationId: null }, receiptCount: 0,
    }) })).toBe('quick_setup');
    expect(resolvePostImportDestination({ experience: experience({
      firstRecap: { state: 'ineligible', minimumOrderCount: 3, version: 'lifetime-v1', seenAt: null }, receiptCount: 2,
    }) })).toBe('small_history');
  });

  it('does not replay a seen recap', () => {
    expect(resolvePostImportDestination({ experience: experience({
      firstRecap: { state: 'seen', minimumOrderCount: 3, version: 'lifetime-v1', seenAt: '2026-09-03T00:00:00.000Z' },
    }) })).toBe('data_tracking');
  });
});
