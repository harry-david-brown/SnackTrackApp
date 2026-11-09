import {
  importSelectionReducer,
  type ImportSelectionState,
} from './importSelectionState';
const initial: ImportSelectionState = {
  selection: { intent: 'choose', provider: null, mailbox: null, step: null },
  history: [],
};
test('back restores the actual previous selection after sequential choices', () => {
  const provider = importSelectionReducer(initial, {
    type: 'navigate',
    patch: { provider: 'doordash', intent: 'provider' },
  });
  const upload = importSelectionReducer(provider, {
    type: 'navigate',
    patch: { step: 'upload' },
  });
  expect(importSelectionReducer(upload, { type: 'back' })).toEqual(provider);
  expect(importSelectionReducer(provider, { type: 'back' })).toEqual(initial);
});
test('reset drops the previous journey history', () => {
  const provider = importSelectionReducer(initial, {
    type: 'navigate',
    patch: { provider: 'uber_eats' },
  });
  expect(
    importSelectionReducer(provider, {
      type: 'reset',
      selection: initial.selection,
    }),
  ).toEqual(initial);
});
