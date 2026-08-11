# Dashboard Tracking Status Implementation Plan

## Goal

Replace the dashboard's single generic Quick Action with a trustworthy, state-driven experience that guides users through Gmail import, Uber export, and ongoing receipt tracking. The API will become the source of truth for import progress, consent, sync health, and newly discovered orders.

## Product principles

- [x] Show one highest-priority next step or status at a time.
- [x] Never describe tracking as active unless the user explicitly consented and Gmail can be accessed.
- [x] Keep export-ready monitoring separate from ongoing order tracking consent.
- [x] Store operational timestamps in UTC and render relative dates in the user's timezone.
- [x] Use passive status visuals—not disabled-button styling—when no action is required.
- [x] Respect reduced-motion accessibility preferences.

## Phase 1 — Backend state model

- [x] Add a separate ongoing-tracking consent and lifecycle state.
- [x] Store last check attempt, last successful check, last stats update, last new order, and last error metadata.
- [x] Add a Gmail sync-run ledger with privacy-safe counts and outcomes.
- [x] Add stable receipt discovery timestamps (`first_seen_at`, `last_seen_at`).
- [x] Make all schema changes idempotent for existing databases.
- [x] Reset the relevant state correctly when receipts are cleared or Gmail is disconnected.

## Phase 2 — Reliable incremental Gmail synchronization

- [x] Replace delete-and-reinsert behavior with stable receipt upserts.
- [x] Preserve the original `first_seen_at` for existing orders.
- [x] Update changed/tip-adjusted orders without counting them as newly discovered.
- [x] Record successful, partial, and failed sync runs.
- [x] Keep export-covered historical Gmail receipts from being double-counted.
- [x] Return new/updated/unchanged counts from Gmail import responses.

## Phase 3 — Tracking API

- [x] Add an explicit endpoint for ongoing-tracking consent.
- [x] Return Gmail import status, export status, tracking capability, tracking health, and activity summaries in one response.
- [x] Expose `last checked`, `last updated`, and `orders added this week` using the user's timezone.
- [x] Add a safe authenticated endpoint for an ongoing receipt check.
- [x] Ensure cache invalidation after every receipt-changing sync.

## Phase 4 — Dashboard UX

- [x] Replace Quick Actions with a reusable state-driven card.
- [x] Support loading, first import, importing, sparse/empty Gmail results, export request, waiting, reconnect, file ready, export processing, failure, tracking consent, active tracking, paused tracking, and tracking error states.
- [x] Dynamically label the section as `Next step`, `In progress`, or `Tracking status`.
- [x] Add clear primary and secondary actions without conflicting prompts.
- [x] Add an accessible reduced-motion-aware active-status indicator.
- [x] Show trustworthy activity details when available.
- [x] Refresh status when the dashboard regains focus.

## Phase 5 — Background-ready architecture

- [x] Add a server service that can process eligible tracking users independently of an HTTP request.
- [x] Add a protected batch entry point suitable for an external scheduler/cron.
- [x] Prevent overlapping syncs with the existing import lock.
- [x] Keep user-facing copy accurate when no scheduler is configured locally.

## Phase 6 — Verification

- [x] Add backend regression tests for state resolution, sync accounting, and weekly timezone boundaries.
- [x] Add frontend tests for every dashboard state and action.
- [x] Run API build and tests.
- [x] Run app type-check, lint, and relevant tests.
- [x] Verify database migrations against the local PostgreSQL schema.
- [x] Review copy and accessibility behavior across all states.

## Completion notes

- [x] Document any deployment requirement for invoking the recurring batch endpoint.
- [x] Record any remaining limitations or follow-up work.

### Recurring synchronization deployment

The API runs eligible ongoing-tracking checks every 60 minutes in production by default. Configure `TRACKING_SYNC_INTERVAL_MINUTES` to change the cadence. Set it to `0` when using an external scheduler instead.

An external scheduler can call `POST /gmail/tracking/run-batch` with the configured `X-API-Key`. The request may include `{ "limit": 100 }`. Per-user import locks and a process-level batch guard prevent overlapping work.

In development, the server timer defaults to off. When a consented user opens the dashboard and the last successful check is more than 15 minutes old, the app initiates a check. This keeps local copy truthful without silently running a development scheduler.

### Known limitations

- Gmail receipt identity uses Uber's external order ID when available and a normalized merchant-plus-order-minute fallback otherwise. Two genuinely different undated orders cannot be tracked safely and are excluded from incremental upserts.
- “Added this week” uses an ISO Monday week boundary in the user's saved IANA timezone.
- The in-process production timer is appropriate for the current single-service deployment. A dedicated job runner or the protected scheduler endpoint is preferred if the API is scaled to many instances.
