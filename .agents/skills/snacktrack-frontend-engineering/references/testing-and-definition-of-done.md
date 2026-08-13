# Testing and definition of done

## Test at the narrowest durable boundary

### Pure resolver tests

Use table-driven tests for:

- precedence among lifecycle states;
- badge, title, copy, icon, and action consistency;
- sparse, empty, partial, complete, reconnect, and error combinations;
- source-of-truth disagreements during migration.

### Hook/controller tests

Cover:

- user actions and pending-state prevention;
- mutation success and failure;
- cache update/invalidation;
- timer and subscription cleanup;
- remount and refocus behavior;
- durable versus retryable errors;
- navigation outcomes.

### Component tests

Assert user-visible behavior rather than implementation details:

- correct content and action;
- accessibility role, label, and state;
- disabled and busy behavior;
- modal opening/closing;
- reduced-motion or pause behavior where applicable.

### Journey integration tests

Add or update integration coverage when a change crosses multiple steps, especially:

- authentication into initial data load;
- Gmail connection and receipt import;
- export request, ready detection, download handoff, and upload;
- upload completion into wrapped/slideshow;
- ongoing tracking and reconnect recovery;
- clearing receipts and resetting source coverage.
- fresh-account reset during active Gmail sync/export upload, including removal of stale query and device caches.

## Test hygiene

- Wrap asynchronous state updates in the test framework’s required `act` flow.
- Mock expected logger/error output so passing tests remain quiet.
- Avoid duplicate test files covering the same component without a distinct purpose.
- Use fake timers deliberately and restore them after each test.
- Fail tests on unexpected console errors where practical.
- Mock third-party SDK adapters globally when importing the real SDK starts
  background timers or subscriptions; test the app adapter contract and keep
  the suite free of SDK-owned open handles.
- Do not rely only on snapshots for behavioral state machines.

## Required checks

Run from `SnackTrackApp/`:

```sh
npm run type-check
npm run lint
npm run check:theme
npm test -- --watchAll=false --runInBand --no-watchman
```

Run focused tests during development, then run the full relevant checks before handoff. If a check cannot run, report the exact reason and what remains unverified.

## Definition of done

- [ ] One authoritative owner exists for each changed value.
- [ ] Transport data is typed and normalized or validated at the boundary.
- [ ] Loading, empty, success, failure, reconnect, and retry states are intentional.
- [ ] Mutations define cache update and invalidation behavior.
- [ ] Effects are idempotent and clean up timers, subscriptions, and animations.
- [ ] Screens remain composition-focused or the retained legacy boundary is documented.
- [ ] Repeated visual patterns use canonical tokens/primitives.
- [ ] Interactive controls include accessibility semantics and sufficient touch targets.
- [ ] No raw sensitive data or avoidable debug logging was introduced.
- [ ] Cross-directory imports use configured aliases and public module barrels; no parent-traversal module imports remain.
- [ ] Focused regression tests cover the decision point.
- [ ] Relevant journey integration coverage was considered.
- [ ] Type-check, lint, theme check, and tests pass.
- [ ] Obsolete state, styles, imports, flags, and compatibility code were removed when safe.
- [ ] Destructive reset tests prove authentication is preserved while imported data and all affected caches are removed.
