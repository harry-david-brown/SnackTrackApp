# Component and screen design

For any component or screen with visible presentation changes, also read [visual-and-accessibility.md](visual-and-accessibility.md) and [mockup-pattern-library.md](mockup-pattern-library.md). Architecture determines ownership and composition; the canonical mockup determines the product's visual hierarchy. Existing screen structure is not a reason to preserve legacy presentation.

## Screen composition

Keep a screen easy to scan in this order:

1. route parameters and top-level providers;
2. one or a few domain hooks/controllers;
3. semantic event handlers for navigation or alerts;
4. loading/auth guards;
5. composed feature sections;
6. route-level styles only.

Extract a controller when the screen coordinates API mutations, timers, persistence, and several lifecycle phases. Extract visual sections when JSX has a stable purpose and meaningful props.

## Controller API

Expose domain language:

```ts
const {
  state,
  connectGmail,
  importReceipts,
  openExportInstructions,
  chooseExportFile,
} = useImportFlowController();
```

Avoid returning dozens of unrelated setters. Prefer a discriminated `state` and semantic commands.

## State resolvers

Use a pure resolver when several inputs select a single card, CTA, badge, or proposition. Return all display decisions together:

```ts
type CardState =
  | { id: 'loading'; passive: true; title: string }
  | { id: 'reconnect'; action: 'reconnect'; title: string }
  | { id: 'active'; passive: true; title: string };
```

Do not independently calculate title, badge, completion, button action, and icon in separate JSX expressions. That permits contradictory combinations.

## Effects

- Use effects to synchronize with external systems, not to calculate renderable values.
- Derive values during render or with a pure function.
- Use callbacks for user actions.
- Include complete dependencies. If a dependency would cause unwanted reruns, correct ownership or stabilize the dependency rather than immediately suppressing the rule.
- Document and test any intentional once-per-operation behavior.
- Clean up subscriptions, animations, timers, and pending callbacks.

## Forms and user actions

- Prevent duplicate submission in the UI and rely on server idempotency/locking for correctness.
- Keep pending labels specific to the active action.
- Preserve user input after recoverable failures.
- Route errors through the standard branded modal or an intentional inline error component.
- Provide an actionable recovery path rather than only reporting failure.

## Component contracts

- Prefer typed semantic props over broad objects when the component does not need the full object.
- Use `keyof` or explicit icon types instead of `any` casts.
- Keep transport response types out of low-level UI primitives.
- Avoid callbacks named only `onPress` when the semantic event is more informative at the feature boundary.
- Make interactive components expose accessibility role, label, state, disabled state, and adequate hit area.

## Navigation

- Follow the canonical policy in [architecture-patterns.md](architecture-patterns.md#navigation-policy). Use typed destination builders and `useAppNavigation()`; never introduce a second imperative router owner in a screen, component, or hook.
- Parse route parameters once into typed domain inputs.
- Make navigation an outcome of a successful action, not an implicit effect of unrelated state changes.
- Give every back action an explicit safe fallback through `backOr()`, chosen for direct deep-link entry as well as normal stack entry.
- Send asynchronous or externally initiated movement through `dispatchExternalNavigation()` and register critical upload/save ownership with `useExternalNavigationBlocker()`.
- Avoid route parameters as a long-lived substitute for server or flow state.

## Legacy extraction approach

For a large existing screen:

1. Add characterization tests for the behavior being touched.
2. Extract pure state derivation first.
3. Extract one cohesive visual section.
4. Extract the multi-step controller.
5. Migrate server state only across the selected resource boundary.
6. Remove obsolete styles, refs, and effects.

Keep every step independently working and reviewable.
