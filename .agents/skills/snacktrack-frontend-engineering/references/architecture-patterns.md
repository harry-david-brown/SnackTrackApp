# Frontend architecture patterns

## Desired dependency direction

Use this direction for new and migrated features:

```text
Expo route/screen
  -> feature components
  -> domain controller hook or pure resolver
  -> query/mutation hook
  -> domain API service and transport validation
  -> shared API client
```

Dependencies may point downward, not back into screens. Keep shared UI primitives independent of feature services.

## Import paths and public boundaries

- Use configured aliases for every cross-directory application import: `@components/*`, `@hooks/*`, `@services/*`, `@utils/*`, `@contexts/*`, `@config/*`, `@constants/*`, `@features/*`, and `@lib/*`. Use `@/*` only for root modules without a narrower alias, including `@/types/*`. Do not create an `@types/*` alias because TypeScript reserves that namespace for declaration packages.
- Prefer a module's public barrel when it exposes the required contract. Import API services from `@services/api`, not internal files such as `@services/api/userApi`.
- Keep `./` relative imports for files within the same local module or feature folder.
- Do not use parent traversal imports such as `../` or `../../` for TypeScript/JavaScript modules. Static asset `require()` paths may remain relative because Metro must resolve them at build time.
- Add a public barrel export deliberately. Do not expose private implementation helpers merely to avoid an internal import in a focused test.

Aliases improve readability and refactor safety; public barrels define ownership boundaries. Do not justify bypassing a barrel with assumed tree-shaking benefits—Expo production builds tree-shake unused ESM exports. Measure bundle output before introducing an optimization-specific exception.

## Responsibility boundaries

### Route or screen

- Read navigation parameters.
- Select the feature controller.
- Compose sections and modals.
- Handle route-level layout and navigation outcomes.
- Avoid direct API calls, persistence writes, large state matrices, and business precedence.

### Domain controller hook

- Coordinate a cohesive multi-step user flow.
- Expose semantic state and actions rather than setters.
- Own timers, cancellation, and effect cleanup required by the flow.
- Delegate durable server state to query/mutation hooks.
- Prefer a reducer when several events can move the flow among multiple phases.

### Pure resolver or view model

- Convert domain state into one renderable UI state.
- Encode precedence explicitly.
- Remain deterministic and free of React, networking, storage, and navigation.
- Use discriminated unions so invalid combinations are difficult to represent.
- Cover combinations with table-driven tests.

### Component

- Render supplied state and emit semantic events.
- Avoid fetching data when its parent/controller already owns the resource.
- Avoid interpreting durable lifecycle state from unrelated booleans.
- Keep reusable components independent of route parameters.

### Navigation policy

`SnackTrackApp/features/navigation/` is the canonical owner for imperative navigation:

- `NavigationPolicyProvider.tsx` owns calls to Expo Router's imperative `router` API and exposes `useAppNavigation()`.
- `appDestinations.ts` owns typed destinations and parameter builders.
- `navigationPolicy.ts` owns route-group normalization and semantic current-destination comparison.
- `app/_layout.tsx` owns authenticated route registration through the root `Stack.Protected` tree.

Production screens, components, and hooks must not import `router` or `useRouter` directly. Declarative `Redirect`, route-parameter hooks, and navigator components remain valid at route boundaries. Use:

- `open(destination)` for reuse-style forward navigation;
- `replace(destination)` when the current history entry must be replaced;
- `backOr(fallback)` for every back action that can be reached by a deep link;
- `setParams(params)` for deliberate updates to the current route;
- `dispatchExternalNavigation(intent)` for notifications, background completion, and delayed alert actions.

Build parameterized destinations as structured typed values rather than raw query strings. Current-route checks must normalize route groups and compare canonical flow parameters, including operation/provider identity and meaningful boolean flags. A genuinely different flow state may open; the same semantic destination must not stack or replace itself.

Navigation is serialized until the observed route changes, with a bounded failure release. Do not add component-local double-tap locks or another navigation queue.

Every new asynchronous navigation source must define and test:

- whether authentication is required;
- which current routes permit automatic movement;
- how identical pending requests are deduplicated;
- which critical flows block it;
- whether a blocked request is discarded or deferred;
- what return destination the user receives.

Current policy discards blocked external actions rather than queueing them. Background import completion may replace only the actual Home tab. Notification taps may navigate from any authenticated, unblocked route. Export-ready actions must evaluate the live route and blocker state when the user taps, not when the alert was first displayed. The current import result for the same operation is always a no-op.

### API service

- Own endpoint paths and transport normalization.
- Convert untrusted response data into a domain model.
- Preserve stable machine-readable error codes.
- Avoid UI copy, alerts, navigation, and component state.

## State categories

Classify state before choosing an owner:

| Category | Examples | Preferred owner |
| --- | --- | --- |
| Authentication identity | signed-in user, session readiness | authentication context/provider |
| Server state | summary, receipts, Gmail health, import preferences | query cache and domain query hooks |
| Flow state | selected file, OAuth phase, active tutorial step | domain controller/reducer |
| Presentation state | expanded card, current carousel card, modal visibility | local component state |
| Derived state | next dashboard CTA, completion badge, availability | pure selector/resolver |
| Durable offline state | queued upload explicitly supported offline | documented persistence adapter |

Do not mirror a value into another category merely for convenient access.

## Refactor boundaries

- Refactor by resource or feature slice, not by individual `useState` occurrence.
- Preserve API behavior and user-visible outcomes unless the task changes them.
- Add characterization tests before moving fragile legacy behavior.
- Delete superseded cache, listener, ref, and compatibility code in the same migration when safe.
- Avoid generic abstraction until two or more stable consumers demonstrate the shared shape.

## Size and complexity signals

File length is a signal, not a hard rule. Extract when a screen combines several of these:

- more than one server resource;
- multi-step effects and timers;
- navigation and persistence decisions;
- several modals;
- business-state precedence;
- a large local stylesheet;
- difficult test setup.

Prefer cohesive feature files over arbitrary line-count splitting.
