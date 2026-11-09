# Canonical sources and verification

## Source-of-truth hierarchy

- Route registration: `SnackTrackAPI/src/index.ts`.
- HTTP behavior: the matching file in `SnackTrackAPI/src/routes/` plus its called service.
- Database shape and migration order: `SnackTrackAPI/src/services/data/migrations/` plus `MigrationRunner.ts`; typed execution comes from `services/ports/DatabasePort.ts` and the `PostgresService` adapter.
- Persistence semantics: the matching repository.
- Cross-table destructive mutations: a dedicated domain service using one transaction.
- API dependency ownership: `SnackTrackAPI/src/services/core/ServiceContainer.ts`.
- Durable import operations: `SnackTrackAPI/src/services/data/ImportJobRepository.ts`, `services/import/ImportJobService.ts`, `ImportJobProcessor.ts`, and `services/queue/ImportQueues.ts`.
- Redis behavior: `SnackTrackAPI/src/config/redis.ts`; distinguish cache, distributed-lock, refresh-token, and BullMQ connection semantics.
- App request normalization: the matching file in `SnackTrackApp/services/`.
- App transport/domain contracts: `SnackTrackApp/types/api.ts`, `features/auth/contracts.ts`, `features/import-flow/contracts.ts`, and the matching runtime normalizer.
- UI state precedence: the closest pure resolver in `SnackTrackApp/components/` or `hooks/`.
- App navigation: `SnackTrackApp/features/navigation/` owns imperative navigation, typed destinations, route normalization, external intents, and critical-flow blockers; `SnackTrackApp/app/_layout.tsx` owns the root protected route tree and authenticated global-controller lifetime.
- Theme: `SnackTrackApp/constants/theme.ts`.
- Motion: `SnackTrackApp/constants/motion.ts` owns shared motion tokens; `contexts/MotionContext.tsx` owns runtime motion preference and inactivity handling. `components/ui/AppButton.tsx`, `AnimatedChoiceGroup.tsx`, and `AnimatedDisclosure.tsx` own their reusable interactions. Paths after the first are relative to `SnackTrackApp/`.
- Transition presentation: `SnackTrackApp/app/(tabs)/_layout.tsx` and `app/_layout.tsx`; route decisions remain in `features/navigation`. See the frontend skill’s motion reference before selecting presets or fading elevated surfaces.
- Admin transport and rendering: `SnackTrackAdmin/src/api.ts`, `src/contracts.ts`, and the matching file in `src/pages/`; API role enforcement remains canonical.
- Expected regressions: focused tests nearest the behavior.

README and planning documents explain intent but can lag implementation. If they conflict with executable source and tests, establish whether the source is wrong before updating documentation.

## Verification commands

For ordinary code changes, run the relevant TypeScript and lint commands from each affected repository. Run one final verification pass after implementation is complete: the relevant TypeScript check and lint coverage for changed/staged code and tests. Do not run routine checks between edits or repeatedly during implementation. Avoid duplicate lint runs when the repository-wide check already covers those files. If a final check fails, fix the issue and re-run only the affected check; once checks pass, stop unless subsequent code changes invalidate the result. Fix changed-file errors and warnings without suppressing rules or bypassing commit hooks; report unrelated pre-existing failures explicitly.

Check all changed and staged JavaScript/TypeScript files with the local ESLint binary and `--max-warnings=0`, including tests that a repository-wide lint script may omit. Inspect file lists with `git diff --name-only`, `git diff --cached --name-only`, and `git ls-files --others --exclude-standard`; exclude deleted files. Review autofixes and re-run lint on the final file contents. Do not run mutating lint-staged or stage unrelated work merely to verify a commit.

Do not run focused tests, full suites, theme validation, or CI unless the user explicitly requests those specific checks. Documentation-only edits need a diff review, not code checks.

### App

```sh
npm run type-check
npm run lint -- --max-warnings=0
```

### API

```sh
npm run build
npm run lint
```

### Admin

```sh
npm run type-check
```

The admin repository currently has no lint script; report that limitation rather than inventing a command. Treat `npm run build` as the API TypeScript check. Tests remain available for user-requested verification but are not part of the default handoff.

## Cache checklist

- Does the mutation invalidate every affected API projection cache?
- Is a versioned summary/dashboard cache key involved?
- Does the app retain an offline snapshot or deduplicate requests?
- Will navigation focus/refetch behavior reveal the new state without restarting?
- Are stale server preference rows reconciled with actual receipt-source coverage?
- Does a destructive mutation remove query/device caches so old data cannot remain renderable?
- Can any in-flight or scheduled writer repopulate data after cache invalidation?
- Does a durable import job, unpublished outbox event, or queued worker still reference the old generation/state?

## Safe live-data diagnosis

- Prefer local/test databases; ask before querying production or another external environment.
- Select credential-presence booleans, never credential values.
- Scope queries to the relevant user ID and aggregate receipt/source counts.
- Compare lifecycle, sync-run, event, and row timestamps to reconstruct ordering.
- Do not mutate data while diagnosing unless the user separately authorizes a fix.
