import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { IMPORT_PREVIEW_INTERVAL_MS, ImportStatPreview } from '@components/import/ImportStatPreview';
let mockReduceMotion = false;
let mockFocused = true;
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@contexts/MotionContext', () => ({ useAppReducedMotion: () => mockReduceMotion }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
beforeEach(() => {
  jest.useFakeTimers(); mockReduceMotion = false; mockFocused = true;
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

it('cycles occasionally, can pause, and still supports manual advancement', async () => {
  const screen = render(<ImportStatPreview />);
  await act(async () => {});
  expect(screen.getByText('A clearer picture of your spending')).toBeTruthy();
  act(() => { jest.advanceTimersByTime(IMPORT_PREVIEW_INTERVAL_MS); });
  act(() => { jest.advanceTimersByTime(1_000); });
  expect(screen.getByText('Your favorite spots')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Pause previews' }));
  act(() => { jest.advanceTimersByTime(IMPORT_PREVIEW_INTERVAL_MS * 3); });
  expect(screen.getByText('Your favorite spots')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: /Your favorite spots\./ }));
  act(() => { jest.advanceTimersByTime(1_000); });
  expect(screen.getByText('Your late-night habits')).toBeTruthy();
});

it.each(['reduced motion', 'unfocused', 'complete', 'screen reader'])('does not cycle with %s', async mode => {
  mockReduceMotion = mode === 'reduced motion'; mockFocused = mode !== 'unfocused';
  jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockResolvedValue(mode === 'screen reader');
  const screen = render(<ImportStatPreview complete={mode === 'complete'} />);
  await act(async () => {});
  act(() => { jest.advanceTimersByTime(IMPORT_PREVIEW_INTERVAL_MS * 3); });
  expect(screen.getByText('A clearer picture of your spending')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: /A clearer picture/ }));
  expect(screen.getByText('Your favorite spots')).toBeTruthy();
});

it('clears a pending advance when focus is lost', async () => {
  const screen = render(<ImportStatPreview />);
  await act(async () => {});
  act(() => { jest.advanceTimersByTime(IMPORT_PREVIEW_INTERVAL_MS - 1); });
  mockFocused = false;
  screen.rerender(<ImportStatPreview />);
  act(() => { jest.advanceTimersByTime(IMPORT_PREVIEW_INTERVAL_MS); });
  expect(screen.getByText('A clearer picture of your spending')).toBeTruthy();
});

it('reveals the latest preview when reduced motion interrupts a transition', async () => {
  const screen = render(<ImportStatPreview />);
  await act(async () => {});
  fireEvent.press(screen.getByRole('button', { name: /A clearer picture/ }));
  mockReduceMotion = true;
  screen.rerender(<ImportStatPreview />);
  expect(screen.getByText('Your favorite spots')).toBeTruthy();
  act(() => { jest.advanceTimersByTime(IMPORT_PREVIEW_INTERVAL_MS); });
  expect(screen.getByText('Your favorite spots')).toBeTruthy();
});
