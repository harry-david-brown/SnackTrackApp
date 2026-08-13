import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { AppAlertProvider } from '@components/ui/AppAlertProvider';
import { presentAppAlert } from '@utils/appAlert';

const AlertTrigger = ({
  title,
  onConfirm,
}: {
  title: string;
  onConfirm?: () => void;
}) => (
  <TouchableOpacity
    onPress={() =>
      presentAppAlert(
        title,
        'Please try again.',
        onConfirm
          ? [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Continue', onPress: onConfirm },
            ]
          : undefined
      )
    }
  >
    <Text>Show alert</Text>
  </TouchableOpacity>
);

describe('AppAlertProvider', () => {
  it('uses the sad error treatment for save failures', async () => {
    const screen = render(
      <AppAlertProvider>
        <AlertTrigger title="Could not save your choice" />
      </AppAlertProvider>
    );

    fireEvent.press(screen.getByText('Show alert'));

    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(screen.getByLabelText('SnackTrack mascot (sad)')).toBeTruthy();
    expect(screen.getByText('Could not save your choice')).toBeTruthy();
  });

  it('runs the selected confirmation action and closes the modal', async () => {
    const onConfirm = jest.fn();
    const screen = render(
      <AppAlertProvider>
        <AlertTrigger title="Allow automatic imports?" onConfirm={onConfirm} />
      </AppAlertProvider>
    );

    fireEvent.press(screen.getByText('Show alert'));
    fireEvent.press(await screen.findByText('Continue'));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Allow automatic imports?')).toBeNull());
  });
});
