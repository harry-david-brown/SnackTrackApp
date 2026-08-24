import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppState, Linking } from 'react-native';
import UberDataTutorial from '@components/upload/UberDataTutorial';

describe('UberDataTutorial', () => {
  it('shows the Uber website link only on the final instruction and keeps manual confirmation available', () => {
    const onRequestConfirmed = jest.fn();
    const screen = render(
      <UberDataTutorial onRequestConfirmed={onRequestConfirmed} onClose={jest.fn()} />
    );

    fireEvent.press(screen.getByLabelText('Choose Uber Eats'));
    expect(screen.getByText('Have you requested your data yet?')).toBeTruthy();
    fireEvent.press(screen.getByText('No, help me request it'));
    expect(screen.getByText('Sign in on Uber’s website')).toBeTruthy();
    expect(screen.queryByText('Open Uber Data Page')).toBeNull();

    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Find Additional data')).toBeTruthy();
    fireEvent.press(screen.getByText('Previous'));
    expect(screen.getByText('Sign in on Uber’s website')).toBeTruthy();
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Open Uber Data Page')).toBeTruthy();
    fireEvent.press(screen.getByText('I’ve already requested it'));

    expect(screen.getByText('What happened after you requested it?')).toBeTruthy();
    expect(onRequestConfirmed).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('I’m still waiting'));
    expect(onRequestConfirmed).toHaveBeenCalledWith('uber');
  });

  it('closes without recording a request when the user chooses to do it later', () => {
    const onClose = jest.fn();
    const onRequestConfirmed = jest.fn();
    const screen = render(
      <UberDataTutorial onRequestConfirmed={onRequestConfirmed} onClose={onClose} />
    );

    fireEvent.press(screen.getByLabelText('Choose Uber Eats'));
    fireEvent.press(screen.getByText('No, help me request it'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('I’ll do this later'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRequestConfirmed).not.toHaveBeenCalled();
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

    fireEvent.press(screen.getByLabelText('Choose Uber Eats'));
    fireEvent.press(screen.getByText('No, help me request it'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Open Uber Data Page'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalled());

    act(() => {
      appStateListener?.('background');
      appStateListener?.('active');
    });
    expect(screen.getByText('Did you submit the request?')).toBeTruthy();
    fireEvent.press(screen.getByText('Yes, I Requested It'));
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

    expect(screen.getByText('Open the notification')).toBeTruthy();
    expect(screen.getByText(/DOWNLOAD AND IMPORT/)).toBeTruthy();
  });

  it('uses the two-step DoorDash website request guide', () => {
    const screen = render(
      <UberDataTutorial
        initialPlatform="doordash"
        onRequestConfirmed={jest.fn()}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('No, help me request it'));
    expect(screen.getByText('Sign in on DoorDash’s website')).toBeTruthy();
    expect(screen.getByText(/1\/2/)).toBeTruthy();

    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Request your archive')).toBeTruthy();
    expect(screen.getByText(/2\/2/)).toBeTruthy();
    expect(screen.getByText('Open DoorDash Website')).toBeTruthy();
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

    fireEvent.press(screen.getByLabelText('Choose Uber Eats'));
    fireEvent.press(screen.getByText('Yes, I already requested it'));
    fireEvent.press(screen.getByText('The ZIP is downloaded'));

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

    fireEvent.press(screen.getByLabelText('Choose Uber Eats'));
    fireEvent.press(screen.getByText('Yes, I already requested it'));
    fireEvent.press(screen.getByText('They said it’s ready'));

    expect(screen.getByText('Open the notification')).toBeTruthy();
    expect(screen.getByText(/DOWNLOAD AND IMPORT/)).toBeTruthy();
  });

  it('reports the still-waiting outcome separately from request confirmation', () => {
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

    fireEvent.press(screen.getByText('Yes, I already requested it'));
    fireEvent.press(screen.getByText('I’m still waiting'));

    expect(onStillWaiting).toHaveBeenCalledWith('doordash');
    expect(onRequestConfirmed).not.toHaveBeenCalled();
  });
});
