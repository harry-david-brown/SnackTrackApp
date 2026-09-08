import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppState, Dimensions, Linking } from 'react-native';
import UberDataTutorial, { ProviderRequestConfirmation } from '@components/upload/UberDataTutorial';

describe('UberDataTutorial', () => {
  it('shows the Uber website link only on the final instruction and keeps manual confirmation available', () => {
    const onRequestConfirmed = jest.fn();
    const screen = render(
      <UberDataTutorial onRequestConfirmed={onRequestConfirmed} onClose={jest.fn()} />
    );

    fireEvent.press(screen.getByLabelText(/^Choose Uber Eats/));
    expect(screen.getByText('First, ask Uber Eats for your history')).toBeTruthy();
    fireEvent.press(screen.getByText('Start the guided request'));
    expect(screen.getByText('Sign in if Uber asks')).toBeTruthy();
    expect(screen.queryByText('Open Uber’s data page')).toBeNull();

    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Find Additional data')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(screen.getByText('Sign in if Uber asks')).toBeTruthy();
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Open Uber’s data page')).toBeTruthy();
    expect(screen.getByText('I can’t find this')).toBeTruthy();
  });

  it('asks for confirmation when the user returns from the provider request page', async () => {
    let appStateListener: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    const onRequestConfirmed = jest.fn();
    const screen = render(<UberDataTutorial onRequestConfirmed={onRequestConfirmed} onClose={jest.fn()} />);

    fireEvent.press(screen.getByLabelText(/^Choose Uber Eats/));
    fireEvent.press(screen.getByText('Start the guided request'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Open Uber’s data page'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalled());

    act(() => {
      appStateListener?.('background');
      appStateListener?.('active');
    });
    expect(screen.getByText('Did Uber accept your request?')).toBeTruthy();
    fireEvent.press(screen.getByText('Yes, Uber accepted it'));
    expect(onRequestConfirmed).toHaveBeenCalledWith('uber');
  });

  it('opens requested exports directly in the contextual download guide', () => {
    const screen = render(
      <UberDataTutorial
        mode="download"
        initialPlatform="doordash"
        onRequestConfirmed={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('Open DoorDash’s ready message')).toBeTruthy();
    expect(screen.getByText(/DOWNLOAD GUIDE/)).toBeTruthy();
  });

  it('uses the two-step DoorDash website request guide', () => {
    const screen = render(
      <UberDataTutorial
        initialPlatform="doordash"
        onRequestConfirmed={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('First, ask DoorDash for your history')).toBeTruthy();
    fireEvent.press(screen.getByText('Start the guided request'));
    expect(screen.getByText('Sign in if DoorDash asks')).toBeTruthy();
    expect(screen.getByText(/STEP 1 OF 2/)).toBeTruthy();

    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Tap “Request Archive”')).toBeTruthy();
    expect(screen.getByText(/STEP 2 OF 2/)).toBeTruthy();
    expect(screen.getByText('Open DoorDash’s data page')).toBeTruthy();
  });

  it('keeps swiping, progress dots, and Next synchronized to the same carousel step', () => {
    const screen = render(
      <UberDataTutorial
        initialPlatform="uber"
        onRequestConfirmed={jest.fn()}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('Start the guided request'));
    expect(screen.getByText('1 of 3')).toBeTruthy();

    fireEvent(
      screen.getByTestId('provider-tutorial-carousel'),
      'momentumScrollEnd',
      { nativeEvent: { contentOffset: { x: Dimensions.get('window').width } } }
    );
    expect(screen.getByText('2 of 3')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Show step 1: Sign in if Uber asks'));
    expect(screen.getByText('1 of 3')).toBeTruthy();

    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('2 of 3')).toBeTruthy();
  });

  it('routes an already-downloaded archive straight to the picker handoff', () => {
    const onArchiveDownloaded = jest.fn();
    const screen = render(
      <UberDataTutorial
        onRequestConfirmed={jest.fn()}
        onArchiveDownloaded={onArchiveDownloaded}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText(/^Choose Uber Eats/));
    fireEvent.press(screen.getByText('I already requested it'));
    fireEvent.press(screen.getByText('I downloaded it'));

    expect(onArchiveDownloaded).toHaveBeenCalledWith('uber');
  });

  it('routes a ready archive into download instructions', () => {
    const screen = render(
      <UberDataTutorial
        onRequestConfirmed={jest.fn()}
        onArchiveDownloaded={jest.fn()}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText(/^Choose Uber Eats/));
    fireEvent.press(screen.getByText('I already requested it'));
    fireEvent.press(screen.getByText('Uber said it’s ready'));

    expect(screen.getByText('Open Uber’s ready message')).toBeTruthy();
    expect(screen.getByText(/DOWNLOAD GUIDE/)).toBeTruthy();
  });

  it('saves the existing request through the same confirmation action', () => {
    const onRequestConfirmed = jest.fn();
    const onStillWaiting = jest.fn();
    const screen = render(
      <UberDataTutorial
        initialPlatform="doordash"
        onRequestConfirmed={onRequestConfirmed}
        onStillWaiting={onStillWaiting}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('I already requested it'));
    fireEvent.press(screen.getByText('I’m waiting for DoorDash'));

    expect(screen.getByText('Did DoorDash accept your request?')).toBeTruthy();
    fireEvent.press(screen.getByText('Yes, DoorDash accepted it'));
    expect(onRequestConfirmed).toHaveBeenCalledWith('doordash');
    expect(onStillWaiting).not.toHaveBeenCalled();
  });

  it('awaits saving without opening a second notification-choice page', async () => {
    let appStateListener: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    const onRequestConfirmed = jest.fn();
    const screen = render(
      <UberDataTutorial
        initialPlatform="uber"
        onRequestConfirmed={onRequestConfirmed}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('Start the guided request'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Open Uber’s data page'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalled());
    act(() => {
      appStateListener?.('background');
      appStateListener?.('active');
    });
    fireEvent.press(screen.getByText('Yes, Uber accepted it'));
    await waitFor(() => expect(onRequestConfirmed).toHaveBeenCalledWith('uber'));
    expect(screen.queryByText('Want us to tell you when it’s ready?')).toBeNull();
  });
});


describe('shared provider request confirmation', () => {
  it('explains the received email and only confirms after an explicit answer', () => {
    const onConfirm = jest.fn();
    const onShowSteps = jest.fn();
    const screen = render(<ProviderRequestConfirmation platform="uber" onBack={jest.fn()} onConfirm={onConfirm} onShowSteps={onShowSteps} />);
    expect(screen.getByText('Check your inbox')).toBeTruthy();
    expect(screen.getByText('EMAIL SUBJECT')).toBeTruthy();
    expect(screen.getByText('Uber data request received')).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('No, show the last step again'));
    expect(onShowSteps).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Yes, Uber accepted it'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps Uber email instructions out of DoorDash confirmation', () => {
    const screen = render(<ProviderRequestConfirmation platform="doordash" onBack={jest.fn()} onConfirm={jest.fn()} onShowSteps={jest.fn()} />);
    expect(screen.queryByText(/Uber data request received/)).toBeNull();
    expect(screen.getByText('Did DoorDash accept your request?')).toBeTruthy();
  });
});

it('keeps confirmation visible after failed persistence and ignores duplicate taps while saving', async () => {
  let listener: ((state: string) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => { listener = callback as (state: string) => void; return { remove: jest.fn() } as never; });
  let finish!: (saved: boolean) => void;
  const save = jest.fn().mockImplementation(() => new Promise<boolean>(resolve => { finish = resolve; }));
  const openRequest = jest.fn().mockResolvedValue(undefined);
  const screen = render(<UberDataTutorial initialPlatform="uber" onOpenRequest={openRequest} onRequestConfirmed={save} onClose={jest.fn()} />);
  fireEvent.press(screen.getByText('Start the guided request'));
  fireEvent.press(screen.getByText('Next'));
  fireEvent.press(screen.getByText('Next'));
  fireEvent.press(screen.getByText('Open Uber’s data page'));
  await waitFor(() => expect(openRequest).toHaveBeenCalledWith('uber'));
  act(() => { listener?.('background'); listener?.('active'); });
  const button = screen.getByText('Yes, Uber accepted it');
  fireEvent.press(button);
  fireEvent.press(button);
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => { finish(false); });
  expect(screen.getByText('Did Uber accept your request?')).toBeTruthy();
  expect(screen.getByText('Yes, Uber accepted it')).toBeTruthy();
  expect(screen.queryByText('Want us to tell you when it’s ready?')).toBeNull();
});
