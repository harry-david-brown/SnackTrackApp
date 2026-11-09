import {
  rememberImportSelection,
  type GuidedImportSelection,
} from './postOnboardingImportJourney';
export interface ImportSelectionState {
  selection: GuidedImportSelection;
  history: GuidedImportSelection[];
}
type Event =
  | { type: 'navigate'; patch: Partial<GuidedImportSelection> }
  | {
      type: 'replace';
      value:
        | GuidedImportSelection
        | ((current: GuidedImportSelection) => GuidedImportSelection);
    }
  | { type: 'reset'; selection: GuidedImportSelection }
  | { type: 'back' };
export function importSelectionReducer(
  state: ImportSelectionState,
  event: Event,
): ImportSelectionState {
  switch (event.type) {
    case 'reset':
      return { selection: event.selection, history: [] };
    case 'navigate':
      return {
        selection: { ...state.selection, ...event.patch },
        history: rememberImportSelection(state.history, state.selection),
      };
    case 'replace':
      return {
        ...state,
        selection:
          typeof event.value === 'function'
            ? event.value(state.selection)
            : event.value,
      };
    case 'back':
      return {
        selection: state.history[state.history.length - 1] ?? {
          intent: 'choose',
          provider: null,
          mailbox: null,
          step: null,
        },
        history: state.history.slice(0, -1),
      };
  }
}
