---
name: snacktrack-frontend-engineering
description: Build and refactor the SnackTrack Expo/React Native frontend with consistent architecture, server-state ownership, typed API boundaries, component composition, design-system primitives, accessibility, and regression coverage. Use for any SnackTrackApp feature, screen, component, hook, state-management change, frontend API integration, UX implementation, or frontend refactor. Load snacktrack-import-flow for Gmail/exports/tracking and snacktrack-account-data-lifecycle for reset, clear, delete, or fresh-account behavior.
---

# SnackTrack Frontend Engineering

Build frontend changes that move SnackTrack toward one predictable architecture while preserving working behavior during the transition.

## Required workflow

1. Use `snacktrack-codebase-navigation` to locate the current owner and affected paths.
2. Read the references relevant to the change:
   - architecture and migration decisions: [references/architecture-patterns.md](references/architecture-patterns.md)
   - queries, mutations, caching, and synchronization: [references/server-state.md](references/server-state.md)
   - screens, hooks, components, and state resolvers: [references/component-and-screen-design.md](references/component-and-screen-design.md)
   - UI consistency, interaction, and accessibility: [references/visual-and-accessibility.md](references/visual-and-accessibility.md)
   - verification requirements: [references/testing-and-definition-of-done.md](references/testing-and-definition-of-done.md)
3. Identify the authoritative owner for every value before editing.
4. Define the complete user-state matrix, including loading, empty, success, failure, reconnect, and retry states.
5. For destructive account-data mutations, load `snacktrack-account-data-lifecycle` and inventory every query/device cache while preserving authentication storage.
6. Implement the narrowest cohesive change. Improve touched legacy boundaries without expanding into an unrelated rewrite.
7. Add regression coverage at the pure decision point and integration boundary.
8. Run the app TypeScript check, inspect the diff for duplicate state, stale code, raw styling, and suppressed errors, and run no tests or other checks unless the user explicitly requests them.

## Core rules

- Keep route files and screens as composition layers. Move network orchestration and multi-step state transitions into domain hooks/controllers.
- Keep authentication identity in context; treat remotely fetched analytics, receipts, Gmail status, and import preferences as server state.
- Use one authoritative cached representation of each server resource. Do not add new module listeners, promise locks, focus-refresh flags, or AsyncStorage mirrors without a documented offline requirement.
- Derive complicated UI states with typed pure resolvers. Do not spread the same precedence rules across JSX branches and effects.
- Validate or explicitly normalize transport data before exposing typed domain objects to components.
- Use configured path aliases for cross-directory imports and consume public module barrels where available; follow [references/architecture-patterns.md](references/architecture-patterns.md) for the import-boundary convention.
- Use shared theme tokens and UI primitives. Do not recreate card, button, badge, or modal styling when a canonical primitive exists.
- Preserve explicit consent boundaries and machine-readable recovery states.
- After a destructive reset succeeds, remove affected query and device caches; do not leave stale data visible while merely invalidating/refetching.
- Keep background effects idempotent, cancellable where appropriate, and safe under remounts or repeated focus.
- Never silence a dependency warning until the lifecycle reasoning is documented and covered by a test.
- Do not make unrelated architectural rewrites merely to satisfy an ideal pattern.

## Transition policy

SnackTrack currently mixes context state, handwritten fetching hooks, custom deduplication, AsyncStorage caches, and a configured TanStack Query provider. Treat TanStack Query as the target owner for ordinary server state, but migrate by domain boundary rather than call site.

- For a new server resource, use the target query/mutation pattern.
- For a meaningful change to an existing domain, migrate the whole affected resource when it is safe and testable.
- For a small fix inside legacy code, preserve the existing owner and avoid adding another source of truth.
- Do not run legacy and target caches as equal authorities. During migration, designate one owner and make any compatibility adapter one-way.
- Keep offline persistence only where the product explicitly requires offline behavior; document freshness and invalidation semantics.

## Expected handoff

Summarize:

- the authoritative state owner;
- the screen/controller/component split;
- every user-visible state handled;
- cache invalidation or refetch behavior;
- accessibility considerations;
- the TypeScript check result and any user-requested verification;
- any intentionally retained legacy boundary.
