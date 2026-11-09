---
name: snacktrack-codebase-navigation
description: Navigate the SnackTrack React Native app, web admin console, and Express/PostgreSQL API and worker processes. Use when locating feature ownership, tracing requests or durable operations across repositories, choosing canonical files, planning cross-stack changes, finding tests, safely diagnosing user-scoped data, or getting oriented before editing SnackTrack. Use snacktrack-import-flow for mailbox/export state, snacktrack-account-data-lifecycle for reset/delete contracts, and snacktrack-backend-engineering for API/database/queue mutations.
---

# SnackTrack Codebase Navigation

Orient in SnackTrack quickly and trace a feature from persistence to UI without rediscovering the repository structure.

## Start here

1. Locate `WORKSPACE_ROOT`, the directory containing `SnackTrackApp/`, `SnackTrackAPI/`, and `SnackTrackAdmin/`. When this skill is opened through `SnackTrack/.agents/skills`, that directory is already the workspace root; when opened directly from a repo-local `.agents/skills`, use the repository's parent directory.
2. Identify the affected surface:
   - Mobile app: `WORKSPACE_ROOT/SnackTrackApp/`
   - API and database: `WORKSPACE_ROOT/SnackTrackAPI/`
   - Web admin console: `WORKSPACE_ROOT/SnackTrackAdmin/`
   - Cross-stack: inspect every affected repository before editing one.
3. Read [references/architecture.md](references/architecture.md) for the relevant repository map.
4. Read [references/feature-paths.md](references/feature-paths.md) when tracing data or adding a feature.
5. Read [references/canonical-sources.md](references/canonical-sources.md) before changing contracts, state, styling, persistence, or tests.

## Navigation workflow

### Locate ownership

- Search by route, response field, state value, UI copy, or component name with `rg`.
- Prefer source code and tests over README statements when they disagree.
- Find the narrowest canonical owner before changing call sites.
- For a cross-stack field, trace database/repository -> service -> route -> client runtime decoder/type -> query/controller -> resolver/component.
- For an asynchronous import, also trace durable job/outbox creation -> queue publication -> worker processor -> terminal job update -> app polling/invalidation.

### Assess impact

- Search every use of changed fields, enum values, endpoints, and cache keys.
- Check app loading, empty, error, reconnect, and completed states.
- Check API cache invalidation and persistence migrations when data changes.
- Check API, worker, scheduler, and admin process ownership when queues, Redis, imports, or operational health change.
- For reset/delete work, inventory every user-owned table, writer, server cache, query key, and device-storage key before choosing an endpoint.
- Preserve existing user changes and avoid unrelated cleanup.

### Verify proportionally

Run verification once, after implementation is complete. Do not perform routine checks between edits. If that final pass fails, fix the issue and rerun only the affected check; avoid duplicate lint coverage.

- App-only: run `npm run type-check` and `npm run lint -- --max-warnings=0`.
- API-only: run `npm run build` and `npm run lint`.
- Cross-stack: run both repositories’ TypeScript and lint checks. Fix lint errors and warnings in changed files before finishing, including staged tests; see the canonical verification commands below. Do not run tests, theme validation, or full suites unless the user explicitly requests them.
- Admin-only: run `npm run type-check` from `SnackTrackAdmin`.
- When a cross-stack contract affects the admin console, include its type-check as well.
- Use the exact commands in [references/canonical-sources.md](references/canonical-sources.md).

## Working rules

- Keep API transport types and app domain state conceptually distinct.
- Add or update regression tests near the canonical decision point.
- Treat `constants/theme.ts` and the shared alert/modal system as UI primitives; do not introduce one-off colors or platform alerts.
- Treat mailbox/import/queue-operation work as a specialized domain and load `snacktrack-import-flow` before making those changes.
- Treat fresh-account reset and deletion as a data-lifecycle domain and load `snacktrack-account-data-lifecycle`.
- Use `snacktrack-backend-engineering` for transactions, locks, migrations, cache invalidation, or database diagnosis.
- Report the actual owner files and the full data path in handoff notes so the next task does not need to rediscover them.
