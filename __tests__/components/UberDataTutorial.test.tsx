import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import UberDataTutorial from '../../components/upload/UberDataTutorial';

describe('UberDataTutorial', () => {
  it('confirms an Uber request only after the user reaches the final request step', () => {
    const onRequestConfirmed = jest.fn();
    const screen = render(
      <UberDataTutorial onRequestConfirmed={onRequestConfirmed} onClose={jest.fn()} />
    );

    fireEvent.press(screen.getByLabelText('Choose Uber Eats'));
    expect(screen.getByText('Open your account')).toBeTruthy();

    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText("I've requested it"));

    expect(onRequestConfirmed).toHaveBeenCalledWith('uber');
  });

  it('closes without recording a request when the user chooses to do it later', () => {
    const onClose = jest.fn();
    const onRequestConfirmed = jest.fn();
    const screen = render(
      <UberDataTutorial onRequestConfirmed={onRequestConfirmed} onClose={onClose} />
    );

    fireEvent.press(screen.getByLabelText('Choose Uber Eats'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('I’ll do this later'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRequestConfirmed).not.toHaveBeenCalled();
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
});
