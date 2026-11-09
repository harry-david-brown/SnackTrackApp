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
- durable import acceptance, background polling, completion invalidation, queue delay, retry, and administrator cancellation;
- clearing receipts and resetting source coverage.
- fresh-account reset during active Gmail sync/export upload, including removal of stale query and device caches.

### Navigation tests

When navigation behavior changes, cover the narrowest relevant policy and controller boundaries:

- route-group normalization and canonical parameter matching;
- suppression of current-route and repeated pending transitions;
- genuinely different operation/provider/flow parameters;
- authenticated, hydrating, and signed-out protected-route states;
- direct deep links with and without back history;
- notification and delayed alert actions against the live route;
- Home-only background completion and the same-operation result no-op;
- critical upload/save blockers, including the rule that blocked external actions are discarded and do not mutate handoff state.

### Motion regression coverage

When changing motion lifecycle or selection behavior, cover interruption by a newer selection, live reduced-motion changes, stale initial preference reads, background/foreground handling, and subscription/animation cleanup as relevant. Assert that the latest state stays usable and collapsed content stays inaccessible. Do not add tests merely to freeze timing numbers or duplicate style implementation.

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

## Verification

For ordinary code changes, run only:

```sh
npm run type-check
```

Do not run focused tests, the full test suite, lint, theme validation, or `npm run ci` unless the user explicitly requests those checks. Adding regression coverage does not imply running it. Documentation-only skill edits do not require an app TypeScript check.

Device and emulator verification belongs to the user by default, as specified in `SnackTrackApp/AGENTS.md`. Do not launch or control iOS Simulator or Android Emulator unless explicitly requested. Their absence is not incomplete code verification. State what was checked and provide a short, change-specific device handoff without claiming unobserved visual results.

For motion changes, the relevant device checks are rapid provider changes (including empty/error results), tab switches in both directions with shadowed cards, opening and closing details, interrupted transitions, reduced motion, and background/foreground restoration. Include larger text or rotation when measuring control geometry. Browser mockups and static screenshots cannot confirm native compositing quality.

## Definition of done

- [ ] For user-facing changes, the touched journey was reviewed using [user-comprehension.md](user-comprehension.md): choices make sense with the user's current knowledge, necessary effort is explained, and labels match actual actions and destinations.
- [ ] Relevant correction, decline, leave/resume, and recovery paths remain understandable; related entry points use consistent concepts and capability claims.
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
- [ ] Production screens, components, and hooks contain no direct imperative Expo Router imports; typed destinations and `useAppNavigation()` are used instead.
- [ ] Authenticated routes remain under the root `Stack.Protected` owner, including hydration and logout behavior.
- [ ] Back actions have explicit deep-link-safe fallbacks, and asynchronous navigation sources define auth, route, deduplication, blocker, discard/defer, and return behavior.
- [ ] Focused regression tests cover the decision point.
- [ ] Relevant journey integration coverage was considered.
- [ ] The app TypeScript check passes for code changes.
- [ ] For motion changes, the device handoff covers relevant transitions and shadow compositing; observed results are distinguished from code checks.
- [ ] Tests, lint, theme validation, or CI were run only when the user explicitly requested them.
- [ ] Obsolete state, styles, imports, flags, and compatibility code were removed when safe.
- [ ] Destructive reset tests prove authentication is preserved while imported data and all affected caches are removed.
