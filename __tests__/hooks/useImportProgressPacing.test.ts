import { act, renderHook } from '@testing-library/react-native';
import {
  IMPORT_PROGRESS_ANIMATION_MS,
  IMPORT_PROGRESS_COMPLETE_HOLD_MS,
  IMPORT_PROGRESS_COMPLETION_STEP_MS,
  IMPORT_PROGRESS_MIN_STEP_MS,
} from '@features/import-flow/importProgressPresentation';
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

    expect(result.current).toEqual({ visiblePosition: 0, visibleProgress: 0, readyForCompletion: false });

    for (let expectedPosition = 1; expectedPosition <= 4; expectedPosition += 1) {
      act(() => { jest.advanceTimersByTime(IMPORT_PROGRESS_MIN_STEP_MS - 1); });
      expect(result.current.visiblePosition).toBe(expectedPosition - 1);

      act(() => { jest.advanceTimersByTime(1); });
      expect(result.current).toEqual({
        visiblePosition: expectedPosition,
        visibleProgress: 0,
        readyForCompletion: false,
      });
    }

    expect(result.current.readyForCompletion).toBe(false);
  });

  it('paces a completed operation through 90, 95 and 100 percent', () => {
    const { result } = renderHook(() => useImportProgressPacing('operation-1', 0, 100));

    for (const [previousProgress, expectedProgress] of [[0, 90], [90, 95], [95, 100]]) {
      act(() => { jest.advanceTimersByTime(IMPORT_PROGRESS_COMPLETION_STEP_MS - 1); });
      expect(result.current.visibleProgress).toBe(previousProgress);
      act(() => { jest.advanceTimersByTime(1); });
      expect(result.current.visibleProgress).toBe(expectedProgress);
    }
  });

  it('keeps the completed state visible before leaving', () => {
    const { result, rerender } = renderHook(
      ({ progress }) => useImportProgressPacing('operation-1', 4, progress),
      { initialProps: { progress: 99 } },
    );

    act(() => { jest.advanceTimersByTime(0); });
    expect(result.current.visibleProgress).toBe(99);
    for (let position = 1; position <= 4; position += 1) {
      act(() => { jest.advanceTimersByTime(IMPORT_PROGRESS_MIN_STEP_MS); });
      expect(result.current.visiblePosition).toBe(position);
    }

    rerender({ progress: 100 });
    act(() => { jest.advanceTimersByTime(IMPORT_PROGRESS_COMPLETION_STEP_MS - 1); });
    expect(result.current.visibleProgress).toBe(99);
    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current.visibleProgress).toBe(100);

    act(() => { jest.advanceTimersByTime(IMPORT_PROGRESS_ANIMATION_MS + IMPORT_PROGRESS_COMPLETE_HOLD_MS - 1); });
    expect(result.current.readyForCompletion).toBe(false);

    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current.readyForCompletion).toBe(true);
  });
});
