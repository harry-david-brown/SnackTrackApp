import type { ImportOperation } from './contracts';
import { IMPORT_PROGRESS_MIN_STEP_MS, resolveImportProgressPresentation, resolveImportProgressSteps } from './importProgressPresentation';

const operation = (stage: NonNullable<ImportOperation['presentation']>['stage'], discoveredOrderCount: number | null): ImportOperation => ({
  id: 'operation-1', kind: 'gmail_historical', trigger: 'user', journeyContext: 'legacy', status: 'running', phase: 'processing', progress: 10,
  result: null, errorCode: null, errorMessage: null, attempts: 1, provider: null,
  createdAt: '2026-09-03T00:00:00.000Z', queuedAt: null, startedAt: null, completedAt: null, updatedAt: '2026-09-03T00:00:00.000Z',
  presentation: { mode: 'foreground', expectedDurationBand: 'under_5_minutes', reason: 'normal', stage, discoveredOrderCount, timeEstimate: null },
});

describe('import progress presentation', () => {
  it.each([
    ['waiting', 0, ['active', 'pending', 'pending', 'pending']],
    ['discovering', 0, ['complete', 'active', 'pending', 'pending']],
    ['building_history', 8, ['complete', 'complete', 'active', 'pending']],
    ['preparing_recap', 8, ['complete', 'complete', 'complete', 'active']],
  ] as const)('maps %s to truthful checklist state', (stage, count, expected) => {
    expect(resolveImportProgressPresentation(operation(stage, count)).steps).toEqual(expected);
  });

  it('only says receipts were found after durable discovery', () => {
    expect(resolveImportProgressPresentation(operation('discovering', 0)).title).toBe('Finding your receipts');
    expect(resolveImportProgressPresentation(operation('building_history', 3)).title).toBe('We found your receipts');
  });

  it('exposes the half-second pacing interval and subtle step sequence', () => {
    expect(IMPORT_PROGRESS_MIN_STEP_MS).toBe(500);
    expect(resolveImportProgressSteps(0)).toEqual(['active', 'pending', 'pending', 'pending']);
    expect(resolveImportProgressSteps(2)).toEqual(['complete', 'complete', 'active', 'pending']);
    expect(resolveImportProgressSteps(4)).toEqual(['complete', 'complete', 'complete', 'complete']);
  });
});


test('returning users get background progress without first-import or recap promises', () => {
  const view = resolveImportProgressPresentation({ ...operation('discovering', 0), journeyContext: 'post_onboarding' });
  expect(view.body).toContain('background');
  expect(view.body).toContain('Add orders');
  expect(view.body).not.toMatch(/first|recap/);
  expect(view.title).toBe('Looking for delivery receipts');
});
