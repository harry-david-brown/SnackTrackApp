import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, Text } from 'react-native';
import { MotionProvider, useAppReducedMotion } from '@contexts/MotionContext';

function Preference() {
  return <Text>{useAppReducedMotion() ? 'Still' : 'Animated'}</Text>;
}

const initialAppState = AppState.currentState;
// Narrow the native overload to the event this provider subscribes to.
const motionEvents: {
  addEventListener(event: 'reduceMotionChanged', listener: (enabled: boolean) => void): { remove(): void };
} = AccessibilityInfo;
afterEach(() => {
  AppState.currentState = initialAppState;
  jest.restoreAllMocks();
});

it('does not overwrite a newer accessibility event with the initial async preference', async () => {
  AppState.currentState = 'active';
  let resolvePreference!: (value: boolean) => void;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(new Promise(resolve => { resolvePreference = resolve; }));
  let changeMotion!: (value: boolean) => void;
  const remove = jest.fn();
  jest.spyOn(motionEvents, 'addEventListener').mockImplementation((_event, listener) => {
    changeMotion = listener;
    return { remove };
  });
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  const screen = render(<MotionProvider><Preference /></MotionProvider>);
  expect(screen.getByText('Still')).toBeTruthy();
  act(() => changeMotion(true));
  await act(async () => resolvePreference(false));
  expect(screen.getByText('Still')).toBeTruthy();
  act(() => changeMotion(false));
  expect(screen.getByText('Animated')).toBeTruthy();
  screen.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

it('stops motion in the background and restores the system preference on return', async () => {
  AppState.currentState = 'active';
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(motionEvents, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  const subscription = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  const screen = render(<MotionProvider><Preference /></MotionProvider>);
  await act(async () => {});
  expect(screen.getByText('Animated')).toBeTruthy();
  const onChange = subscription.mock.calls[0][1];
  act(() => onChange('background'));
  expect(screen.getByText('Still')).toBeTruthy();
  act(() => onChange('active'));
  expect(screen.getByText('Animated')).toBeTruthy();
  screen.unmount();
});
