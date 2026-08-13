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
