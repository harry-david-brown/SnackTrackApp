import { renderHook } from '@testing-library/react-native';
import { useFirstImportProgress } from '@hooks/useFirstImportProgress';
import type { ImportOperation } from '@features/import-flow/contracts';
let mockExperience: { receiptCount: number } | undefined;
jest.mock('@hooks/queries/useExperienceStateQuery', () => ({ useExperienceStateQuery: () => ({ data: mockExperience }) }));
const operation = { id: 'first', journeyContext: 'post_onboarding' } as ImportOperation;

it('does not offer returning-user actions until account history is known', () => {
  mockExperience = undefined;
  const screen = renderHook(() => useFirstImportProgress('user', operation));
  expect(screen.result.current).toBeNull();
  mockExperience = { receiptCount: 0 };
  screen.rerender({});
  expect(screen.result.current).toBe(true);
  mockExperience = { receiptCount: 14 };
  screen.rerender({});
  expect(screen.result.current).toBe(true);
});

it('resolves a new operation separately and honors explicit onboarding context', () => {
  mockExperience = { receiptCount: 0 };
  const screen = renderHook(({ op }) => useFirstImportProgress('user', op), { initialProps: { op: operation } });
  expect(screen.result.current).toBe(true);
  mockExperience = { receiptCount: 14 };
  screen.rerender({ op: { ...operation, id: 'next' } });
  expect(screen.result.current).toBe(false);
  screen.rerender({ op: { ...operation, id: 'onboarding', journeyContext: 'onboarding' } });
  expect(screen.result.current).toBe(true);
});
