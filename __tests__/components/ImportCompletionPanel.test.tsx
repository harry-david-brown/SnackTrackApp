import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ImportCompletionPanel } from '@components/upload/ImportCompletionPanel';

jest.mock('@components/mascot/Mascot', () => ({ Mascot: () => null }));

it('makes starting a ready first recap the primary completion action', () => {
  const onHome = jest.fn();
  const onNext = jest.fn();
  const screen = render(
    <ImportCompletionPanel
      summary={{
        sourceName: 'Gmail',
        orderCount: 12,
        title: '12 orders added or updated',
        message: 'Gmail has finished updating your history.',
        nextAction: { kind: 'recap', label: 'Start my recap' },
      }}
      onHome={onHome}
      onNext={onNext}
      onTryAnotherEmail={jest.fn()}
    />,
  );

  expect(screen.getByText('Your history is ready')).toBeTruthy();
  const actions = screen.getAllByRole('button');
  expect(actions.map(action => action.props.accessibilityLabel)).toEqual([
    'Start my recap',
    'See my Home',
  ]);

  fireEvent.press(screen.getByRole('button', { name: 'Start my recap' }));
  expect(onNext).toHaveBeenCalledTimes(1);
  expect(onHome).not.toHaveBeenCalled();
});
