# Feature tracing patterns

## Cross-stack response field

Trace in this order:

1. PostgreSQL column or derived query.
2. Repository method.
3. Domain service calculation.
4. Express route response.
5. App transport type.
6. App service normalization.
7. Hook or context state.
8. State resolver or view model.
9. Component rendering and action.
10. Focused tests on both sides.

Search the exact JSON field name first. Then search the corresponding camelCase/snake_case variants and enum values.

## Dashboard behavior

Start with:

- `SnackTrackApp/app/(tabs)/index.tsx`
- `SnackTrackApp/components/dashboard/`
- `SnackTrackAPI/src/routes/users.ts`
- `SnackTrackAPI/src/services/user/GetDashboardInsightsService.ts`
- `SnackTrackAPI/src/services/analytics/dashboard/`

Check whether the dashboard uses a shared server preference, locally cached receipt data, or a pure state resolver. Behavior bugs often come from two sources disagreeing rather than from the card component itself.

## Wrapped/slideshow metric

Start with:

- `SnackTrackAPI/src/services/analytics/WrappedAnalyticsService.ts`
- the summary route in `SnackTrackAPI/src/routes/`
- `SnackTrackApp/services/analyticsApi.ts`
- `SnackTrackApp/app/(tabs)/wrapped-journey.tsx`
- `SnackTrackApp/components/wrapped/`

Verify source coverage, null/empty handling, money units, timestamp interpretation, user timezone, and cache versioning.

## Database field or migration

Start with `SnackTrackAPI/src/services/data/migrations/` and `MigrationRunner.ts`, then trace row decoders, repositories, constraints, triggers, and integration tests. `PostgresService.ts` owns the pool and transaction adapter, not schema mutation. When altering a triggered column, account for dependent triggers/functions explicitly rather than assuming PostgreSQL can rebuild them.

## Durable import operation or queue behavior

Trace in this order:

1. route and `ImportJobService` operation creation;
2. `ImportJobRepository` transaction, active-job/idempotency policy, and outbox write;
3. `ImportQueues.ts` publication and queue selection;
4. `worker.ts` lifecycle and `ImportJobProcessor` execution/checkpointing;
5. terminal durable status and notification publication;
6. `importOperationsApi.ts`, runtime normalizer, `useImportOperation`, and status UI;
7. admin queue diagnostics/cancellation when operational behavior changes.

PostgreSQL is authoritative. Redis/BullMQ unavailability may delay dispatch, but must not erase an accepted operation. Distinguish upload intent, waiting for queue, queued, running, retrying, and terminal states.

## Mailbox provider connection or import

Load `snacktrack-mailbox-integrations`, then trace the Gmail or Microsoft OAuth/health/client adapter into the provider-neutral mailbox ports, shared extraction pipeline, provider-aware persistence, import-preferences projection, app normalizer, and provider controller. Keep identity-login OAuth separate from mailbox OAuth.

## Admin console behavior

Start with the matching `SnackTrackAdmin/src/pages/` page, then `src/api.ts` and `src/contracts.ts`, the `/admin/v1` route in `SnackTrackAPI/src/routes/admin.ts`, and its admin service/repository owner. Verify both API role enforcement and frontend navigation gating. User timelines should remain structured API data; the admin frontend owns human-readable narrative.

## Account reset or data deletion

Load `snacktrack-account-data-lifecycle`, then trace:

1. requested preserve/delete contract;
2. every user-owned table and provider credential column;
3. every background/manual writer, durable import job/outbox state, import generation, and shared lock;
4. the atomic server service and route;
5. server projection and mailbox-health caches;
6. app query keys and device storage;
7. post-reset navigation and empty/readiness resolvers;
8. race, rollback, cache, and idempotency tests.

When data reappears, compare reset, sync completion, and row creation timestamps before attributing the symptom to caching.

## UI styling

Start with `SnackTrackApp/constants/theme.ts` and an existing nearby component with the desired card/modal pattern. Reuse shared primitives. Run the theme check after introducing or changing visual tokens.

## Error presentation

Use the app’s standard modal/alert path. Search `AppAlertProvider`, `appAlert`, and `platformAlert` before adding a new presentation. Preserve machine-readable API error codes so the app can select the correct recovery state.
