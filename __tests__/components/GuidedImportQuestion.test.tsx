import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostOnboardingImportScreen } from '@components/import/PostOnboardingImportScreen';
import { createImportPreferencesFixture } from '@/__tests__/fixtures/importPreferences';
const mockStep = jest.fn();
const mockFile = jest.fn();
const mockPreferences = createImportPreferencesFixture();
jest.mock('@contexts/AppearanceContext', () => ({ useAppTheme: () => jest.requireActual('@constants/theme').LightTheme }));
jest.mock('@components/upload/UberDataTutorial', () => () => null);
jest.mock('@components/upload/UberDataUpload', () => ({ ExportDataUpload: () => null }));
jest.mock('@hooks/usePostOnboardingImportController', () => ({ usePostOnboardingImportController: () => ({
  state: { kind: 'provider_intro', provider: { provider: 'uber_eats', name: 'Uber Eats', receiptCount: 0, imported: false, status: 'not_started' } },
  importPreferences: mockPreferences, setStep: mockStep, requestHistory: mockStep, chooseDownloadedFile: mockFile,
}) }));
test('offers the recommended unsure path before file and waiting shortcuts without choosing for the user', () => {
  const screen = render(<PostOnboardingImportScreen route={{ intent: 'provider', provider: 'uber_eats', operationId: null, downloadedVersion: null }} />);
  expect(screen.getByText('Recommended')).toBeTruthy();
  expect(mockStep).not.toHaveBeenCalled();
  expect(mockFile).not.toHaveBeenCalled();
  const labels = screen.getAllByRole('button').map(button => button.props.accessibilityLabel);
  expect(labels.indexOf('No / I’m not sure')).toBeLessThan(labels.indexOf('Yes, I have the file'));
  fireEvent.press(screen.getByText('No / I’m not sure'));
  expect(mockStep).toHaveBeenCalledTimes(1);
});
