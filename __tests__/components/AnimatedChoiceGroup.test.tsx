import { fireEvent, render } from '@testing-library/react-native';
import { AnimatedChoiceGroup } from '@components/ui/AnimatedChoiceGroup';

const options = [{ value: 'uber', label: 'Uber Eats' }, { value: 'doordash', label: 'DoorDash' }] as const;

it('keeps choices immediately usable and selected states truthful with reduced motion', () => {
  // Without a provider, the shared policy defaults to reduced motion.
  const onChange = jest.fn();
  const screen = render(<AnimatedChoiceGroup options={options} value="uber" onChange={onChange} />);
  fireEvent.press(screen.getByRole('button', { name: 'Filter: Uber Eats' }));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Filter: DoorDash' }));
  expect(onChange).toHaveBeenLastCalledWith('doordash');
  screen.rerender(<AnimatedChoiceGroup options={options} value="doordash" onChange={onChange} />);
  expect(screen.getByRole('button', { name: 'Filter: DoorDash' }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole('button', { name: 'Filter: Uber Eats' }).props.accessibilityState.selected).toBe(false);
  fireEvent.press(screen.getByRole('button', { name: 'Filter: Uber Eats' }));
  expect(onChange).toHaveBeenLastCalledWith('uber');
  screen.unmount();
});
