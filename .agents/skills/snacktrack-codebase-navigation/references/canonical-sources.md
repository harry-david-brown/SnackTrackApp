# Canonical sources and verification

## Source-of-truth hierarchy

- Route registration: `SnackTrackAPI/src/index.ts`.
- HTTP behavior: the matching file in `SnackTrackAPI/src/routes/` plus its called service.
- Database shape and startup migration: `SnackTrackAPI/src/services/data/PostgresService.ts`.
- Persistence semantics: the matching repository.
- Cross-table destructive mutations: a dedicated domain service using one transaction.
- API dependency ownership: `SnackTrackAPI/src/services/core/ServiceContainer.ts`.
- App request normalization: the matching file in `SnackTrackApp/services/`.
- App transport contract: `SnackTrackApp/types/api.ts` and domain service types.
- UI state precedence: the closest pure resolver in `SnackTrackApp/components/` or `hooks/`.
- Theme: `SnackTrackApp/constants/theme.ts`.
- Expected regressions: focused tests nearest the behavior.

README and planning documents explain intent but can lag implementation. If they conflict with executable source and tests, establish whether the source is wrong before updating documentation.

## Common checks

Run commands from the relevant repository.

### App

```sh
npm run type-check
npm run lint
npm run check:theme
npm test -- --watchAll=false --runInBand --no-watchman
```

Prefer a focused test command first when the full suite is expensive.

### API

```sh
npm run build
npm test
```

Inspect `SnackTrackAPI/package.json` and `SnackTrackAPI/tests/` for narrower regression scripts associated with the touched domain.

## Cache checklist

- Does the mutation invalidate every affected API user cache?
- Is a versioned summary/dashboard cache key involved?
- Does the app retain an offline snapshot or deduplicate requests?
- Will navigation focus/refetch behavior reveal the new state without restarting?
- Are stale server preference rows reconciled with actual receipt-source coverage?
- Does a destructive mutation remove query/device caches so old data cannot remain renderable?
- Can any in-flight or scheduled writer repopulate data after cache invalidation?

## Safe live-data diagnosis

- Prefer local/test databases; ask before querying production or another external environment.
- Select credential-presence booleans, never credential values.
- Scope queries to the relevant user ID and aggregate receipt/source counts.
- Compare lifecycle, sync-run, event, and row timestamps to reconstruct ordering.
- Do not mutate data while diagnosing unless the user separately authorizes a fix.
