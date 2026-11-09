import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { ImportSetupJourney } from '@components/upload/ImportSetupJourney';

let mockKind = 'choose_provider';
jest.mock('@features/import-flow/initialImportJourney', () => ({ resolveInitialImportJourney: () => ({ kind: mockKind }) }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]) }));
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@contexts/MotionContext', () => ({ useAppReducedMotion: () => true }));
jest.mock('@components/mascot/Mascot', () => ({ Mascot: () => null }));
jest.mock('@services/adminAnalytics', () => ({ trackAdminEvent: jest.fn().mockResolvedValue(undefined) }));

function setup(busy = false) {
  const onChangeMethod = jest.fn();
  const onBack = jest.fn();
  const noop = jest.fn();
  const props: React.ComponentProps<typeof ImportSetupJourney> = {
    flow: {} as React.ComponentProps<typeof ImportSetupJourney>['flow'], selectedPath: 'alternative', busy,
    onBack, onChangeMethod, onChooseEmailPath: noop, onChooseEmail: noop, onChooseAlternative: noop,
    onChangeAccount: noop, onImportGmail: noop, onImportOutlook: noop, onChooseProvider: noop, onRetryOAuthConnection: noop,
  };
  let back: (() => boolean | null | undefined) | undefined;
  const remove = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => { back = handler; return { remove }; });
  return { ...render(<ImportSetupJourney {...props} />), onChangeMethod, onBack, remove, back: () => back?.() };
}
afterEach(() => { jest.restoreAllMocks(); mockKind = 'choose_provider'; });

test('screen and hardware back both return to email options', () => {
  const screen = setup();
  fireEvent.press(screen.getByRole('button', { name: 'Back to email options' }));
  expect(screen.onChangeMethod).toHaveBeenCalledTimes(1);
  act(() => { expect(screen.back()).toBe(true); });
  expect(screen.onChangeMethod).toHaveBeenCalledTimes(2);
  expect(screen.onBack).not.toHaveBeenCalled();
  expect(screen.queryByText('Try connecting email instead')).toBeNull();
  screen.unmount();
  expect(screen.remove).toHaveBeenCalled();
});

test('consumes hardware back without navigating during pending work', () => {
  const screen = setup(true);
  act(() => { expect(screen.back()).toBe(true); });
  expect(screen.onChangeMethod).not.toHaveBeenCalled();
  expect(screen.onBack).not.toHaveBeenCalled();
});

test('uses the route back fallback from the first setup step', () => {
  mockKind = 'choose_method';
  const screen = setup();
  act(() => { expect(screen.back()).toBe(true); });
  expect(screen.onBack).toHaveBeenCalledTimes(1);
  expect(screen.onChangeMethod).not.toHaveBeenCalled();
});
