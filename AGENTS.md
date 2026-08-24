# SnackTrack App Agent Guidance

This repository contains the SnackTrack Expo/React Native application.

## Required skills

- Load `snacktrack-frontend-engineering` for every feature, fix, refactor, screen, component, hook, state-management change, API integration, or UX change in this repository.
- Load `snacktrack-codebase-navigation` before tracing ownership, planning cross-stack work, or editing an unfamiliar feature.
- Also load `snacktrack-import-flow` for Gmail, receipt imports, export uploads, export-ready alerts, consent, connection health, ongoing tracking, or dashboard/upload state machines.
- Also load `snacktrack-account-data-lifecycle` for clearing data, resetting onboarding, disconnecting providers as part of a reset, account deletion, or fresh-account behavior.
- For cross-stack work, inspect the sibling `SnackTrackAPI` repository and follow its `AGENTS.md` and applicable backend skills before changing API contracts.

## Repository rules

- Keep screens and route files as composition layers. Put network orchestration and multi-step state transitions in domain hooks or controllers.
- Treat remotely fetched data as server state. Use one authoritative cache for each resource and typed pure resolvers for complicated UI states.
- Use configured aliases such as `@components`, `@services`, `@hooks`, and `@utils` for cross-directory imports. Do not add deep relative imports such as `../../services/...`.
- Use public module barrels where one exists, and do not bypass intentional module boundaries.
- Use shared theme tokens, UI primitives, and the standard modal/alert system. Do not introduce raw one-off colors, duplicated card/button styling, or platform `Alert` calls.
- Preserve explicit user-consent boundaries, accessible interactions, and loading, empty, success, failure, reconnect, and retry states.
- Do not add another source of truth to legacy state. When migrating a server resource to TanStack Query, migrate a coherent domain boundary and designate one authoritative owner.
- Preserve unrelated user changes and avoid unrelated rewrites.

## Verification

- Add or update focused regression tests at the authoritative decision point and affected integration boundary.
- For ordinary code changes, run only `npm run type-check`.
- Do not run focused tests, the full test suite, lint, theme validation, or `npm run ci` unless the user explicitly requests those checks.
- iOS Simulator and Android Emulator testing are outside the scope of agent tasks. Do not launch, control, or perform manual testing in either environment unless the user explicitly requests it; the user will handle device and emulator verification.
- Do not treat the absence of Simulator or Emulator testing as incomplete verification. Clearly hand off any manual flows the user should check.
- Inspect the final diff for duplicate state, stale code, suppressed errors, raw styling, and deep relative imports.
