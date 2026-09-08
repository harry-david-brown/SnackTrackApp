import { act, renderHook } from '@testing-library/react-native';
import { IMPORT_PROGRESS_MIN_STEP_MS } from '@features/import-flow/importProgressPresentation';
import { useImportProgressPacing } from '@hooks/useImportProgressPacing';

describe('useImportProgressPacing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows every step for at least the minimum interval when the operation is already complete', () => {
    const { result } = renderHook(() => useImportProgressPacing('operation-1', 4));

    expect(result.current).toEqual({ visiblePosition: 0, readyForCompletion: false });

    for (let expectedPosition = 1; expectedPosition <= 4; expectedPosition += 1) {
      act(() => { jest.advanceTimersByTime(IMPORT_PROGRESS_MIN_STEP_MS - 1); });
      expect(result.current.visiblePosition).toBe(expectedPosition - 1);

      act(() => { jest.advanceTimersByTime(1); });
      expect(result.current).toEqual({
        visiblePosition: expectedPosition,
        readyForCompletion: false,
      });
    }

    act(() => { jest.advanceTimersByTime(IMPORT_PROGRESS_MIN_STEP_MS - 1); });
    expect(result.current.readyForCompletion).toBe(false);

    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current.readyForCompletion).toBe(true);
  });
});
