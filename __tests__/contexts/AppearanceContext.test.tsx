import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { AppearanceProvider, appearanceStorageKeyForTests, useAppearance } from '@contexts/AppearanceContext';

function Harness() {
  const appearance = useAppearance();
  return <>
    <Text>{appearance.isReady ? `${appearance.preference}:${appearance.scheme}` : 'loading'}</Text>
    <Pressable onPress={() => void appearance.setPreference('dark')}><Text>Dark</Text></Pressable>
    <Pressable onPress={() => void appearance.setPreference('system')}><Text>System</Text></Pressable>
  </>;
}

describe('AppearanceContext', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hydrates a saved device-wide preference before declaring itself ready', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
    render(<AppearanceProvider><Harness /></AppearanceProvider>);
    await waitFor(() => expect(screen.getByText('dark:dark')).toBeTruthy());
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(appearanceStorageKeyForTests);
  });

  it('persists appearance changes independently of account state', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    render(<AppearanceProvider><Harness /></AppearanceProvider>);
    await waitFor(() => expect(screen.getByText('system:light')).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByText('Dark')); });
    expect(screen.getByText('dark:dark')).toBeTruthy();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(appearanceStorageKeyForTests, 'dark');
  });
});
