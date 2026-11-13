import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { AppText } from '@components/ui/AppText';
import { androidTextSize, useSystemFontScale } from '@hooks/useSystemFontScale';

jest.mock('@hooks/useSystemFontScale', () => ({
  androidTextSize: { toDp: jest.fn() },
  useSystemFontScale: jest.fn(),
}));

it('refreshes measured sizes on live changes and respects an explicit text-size cap', () => {
  const scale = jest.mocked(useSystemFontScale);
  const native = jest.mocked(androidTextSize!.toDp);
  scale.mockReturnValue(1);
  native.mockImplementation(sp => sp);
  const screen = render(<AppText>November</AppText>);
  const measured = () => StyleSheet.flatten(screen.getByText('November').props.style);
  expect(measured()).toMatchObject({ fontSize: 15, lineHeight: 22 });

  scale.mockReturnValue(2);
  native.mockImplementation(sp => sp === 15 ? 29 : 35);
  screen.rerender(<AppText>November</AppText>);
  expect(measured()).toMatchObject({ fontSize: 29, lineHeight: 35 });
  screen.rerender(<AppText maxFontSizeMultiplier={1.5}>November</AppText>);
  expect(measured()).toMatchObject({ fontSize: 22.5, lineHeight: 33 });

  scale.mockReturnValue(1);
  native.mockImplementation(sp => sp);
  screen.rerender(<AppText>November</AppText>);
  expect(measured()).toMatchObject({ fontSize: 15, lineHeight: 22 });
});
