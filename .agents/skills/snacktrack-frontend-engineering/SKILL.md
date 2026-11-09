---
name: snacktrack-frontend-engineering
description: Build and refactor the SnackTrack Expo/React Native frontend with the approved warm, restrained, mascot-led product language, consistent architecture, server-state ownership, typed API boundaries, accessible component composition, and regression coverage. Use for every SnackTrackApp UI or UX task, visual review, screen or component change, hook or state-management change, frontend API integration, and frontend refactor. Load snacktrack-import-flow for Gmail/exports/tracking and snacktrack-account-data-lifecycle for reset, clear, delete, or fresh-account behavior.
---

# SnackTrack Frontend Engineering

Build frontend changes that move SnackTrack toward one predictable architecture while preserving working behavior during the transition.

## Required workflow

1. Use `snacktrack-codebase-navigation` to locate the current owner and affected paths.
2. Read the references relevant to the change:
   - every user-facing UI, copy, interaction, or navigation change: [references/user-comprehension.md](references/user-comprehension.md)
   - architecture and migration decisions: [references/architecture-patterns.md](references/architecture-patterns.md)
   - queries, mutations, caching, and synchronization: [references/server-state.md](references/server-state.md)
   - screens, hooks, components, and state resolvers: [references/component-and-screen-design.md](references/component-and-screen-design.md)
   - visual direction, type, color, spacing, mascot use, interaction, and accessibility: [references/visual-and-accessibility.md](references/visual-and-accessibility.md)
   - exact component proportions and page compositions for visual work: [references/mockup-pattern-library.md](references/mockup-pattern-library.md)
   - verification requirements: [references/testing-and-definition-of-done.md](references/testing-and-definition-of-done.md)
3. Identify the authoritative owner for every value before editing. For user-facing changes, first establish the user's goal, what they know on arrival, and what they expect the action to do; apply the comprehension review before choosing copy or layout.
4. Define the complete user-state matrix, including loading, empty, success, failure, reconnect, and retry states.
5. For destructive account-data mutations, load `snacktrack-account-data-lifecycle` and inventory every query/device cache while preserving authentication storage.
6. For visual work, compare the affected screen with the canonical mockup and the later interaction decisions documented in the visual reference. Record the hierarchy, page archetype, component treatments, mascot role, action order, and motion behavior that must survive the translation to React Native. Follow the verification ownership in the testing reference; device or emulator inspection is not an automatic prerequisite.
7. Implement the narrowest cohesive change. Improve touched legacy boundaries without expanding into an unrelated rewrite.
8. Add regression coverage at the pure decision point and integration boundary.
9. For any route, deep-link, back action, notification, or background-completion change, inspect the navigation ownership rules in [references/architecture-patterns.md](references/architecture-patterns.md) and the navigation checks in [references/testing-and-definition-of-done.md](references/testing-and-definition-of-done.md).
10. Run `npm run type-check` and `npm run lint -- --max-warnings=0` after the final edits. Fix lint errors and warnings in changed/staged files, including tests, and re-run affected checks. Inspect the diff for duplicate state, stale code, raw styling, suppressed errors, and navigation that bypasses the policy owner. Tests, theme validation, and CI remain opt-in.

## Core rules

- Treat user comprehension and predictable actions as acceptance criteria alongside visual fidelity and technical correctness. Review the preceding and following steps, not just the changed component. A polished screen is not complete if users must understand internal data concepts to choose an action.
- Keep route files and screens as composition layers. Move network orchestration and multi-step state transitions into domain hooks/controllers.
- Keep authentication identity in context; treat remotely fetched analytics, receipts, mailbox status, import preferences, and durable import operations as server state.
- Use one authoritative cached representation of each server resource. Do not add new module listeners, promise locks, focus-refresh flags, or AsyncStorage mirrors without a documented offline requirement.
- Derive complicated UI states with typed pure resolvers. Do not spread the same precedence rules across JSX branches and effects.
- Validate or explicitly normalize transport data before exposing typed domain objects to components.
- Use configured path aliases for cross-directory imports and consume public module barrels where available; follow [references/architecture-patterns.md](references/architecture-patterns.md) for the import-boundary convention.
- Treat the approved root-level `snacktrack-ux-revision.html` as the visual foundation. Its SnackTrack mobile screens and `.st-*` rules govern hierarchy and visual character; the visualization viewer chrome around them does not. Later explicit user decisions take precedence for their stated scope; see the authority and motion sections of the visual reference. Experimental prototypes do not silently replace page recipes or navigation.
- Treat current theme tokens and shared primitives as implementation, not immutable design authority. Reuse them when they match the approved visual language; revise or replace them deliberately when they preserve the older UI instead.
- Reuse `constants/motion.ts`, `contexts/MotionContext.tsx`, and the shared interaction primitives for motion work. Follow the motion and feedback section in [references/visual-and-accessibility.md](references/visual-and-accessibility.md#motion-and-feedback), including the shadow-compositing rule.
- Centralize approved values in theme tokens and stable primitives as they are implemented. Do not scatter raw colors or recreate card, button, badge, row, or full-screen journey styling across screens.
- Do not accept palette-only fidelity. A screen must also match the mockup's typography, weight, density, whitespace, radii, surface grouping, mascot scale, action hierarchy, and overall composition.
- Preserve explicit consent boundaries and machine-readable recovery states.
- After a destructive reset succeeds, remove affected query and device caches; do not leave stale data visible while merely invalidating/refetching.
- Keep background effects idempotent, cancellable where appropriate, and safe under remounts or repeated focus.
- Treat `features/navigation` as the sole owner of imperative Expo Router calls. Production screens, components, and hooks use `useAppNavigation()` plus typed destinations; they must not import `router` or `useRouter` directly.
- Route notification taps, background completion, and delayed external actions through `dispatchExternalNavigation()`. Register critical upload/save work with `useExternalNavigationBlocker()` so external actions are discarded while the flow cannot safely move.
- Keep authenticated route ownership in the root `Stack.Protected` tree. Do not add a competing screen- or tabs-level auth redirect.
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
- for user-facing changes, the comprehension or task-flow improvement and any remaining usability assumption; distinguish source-based review from observed user/device behavior;
- navigation ownership, external-intent behavior, and explicit back fallbacks when routes changed;
- the TypeScript check result and any user-requested verification;
- any intentionally retained legacy boundary.
- any visual deviation from the canonical mockup and the product or accessibility reason for it.
