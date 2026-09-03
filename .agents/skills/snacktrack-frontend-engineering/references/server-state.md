# Server state and synchronization

## Target ownership

Use TanStack Query as the authoritative cache for migrated ordinary server resources because `QueryClientProvider` is configured in `SnackTrackApp/app/_layout.tsx`. Receipt lists, analytics/dashboard reads, import preferences including Gmail/Outlook connection status, and durable import operations already use this boundary. Inspect the owner before changing any other resource.

Create domain query keys through a key factory, for example:

```ts
export const importPreferenceKeys = {
  all: ['import-preferences'] as const,
  current: () => [...importPreferenceKeys.all, 'current'] as const,
};
```

Keep the actual service request in `services/` and wrap it in a feature query hook.

## Query rules

- Include every input affecting the result in the query key.
- Let the query cache deduplicate concurrent reads.
- Choose `staleTime` based on the resource, not a global convenience default.
- Disable queries until authentication identity is ready.
- Distinguish first-load state from background refetch state.
- Do not clear valid rendered data merely because a background refetch starts.
- Handle session expiration centrally in the API/auth boundary.

## Mutation rules

For each mutation, define before implementation:

1. authoritative response returned by the API;
2. optimistic update, if any;
3. rollback behavior;
4. query keys to update or invalidate;
5. dependent analytics/receipt resources to refresh;
6. user-visible pending, success, and failure states.

Prefer writing the authoritative mutation response directly into its query cache, then invalidate broader derived resources when needed.

For destructive fresh-account or deletion mutations, use the contract in `snacktrack-account-data-lifecycle`:

- invoke one authoritative server operation rather than sequencing partial client mutations;
- preserve authentication/session storage unless the contract deletes the account;
- remove affected analytics, wrapped, receipt, import-preference, mailbox-status, and import-operation queries after success;
- clear feature-local device caches such as analytics, export handoff/ready notifications, and upsell history;
- clear the onboarding completion marker last and route to the initial authenticated experience;
- retain existing state and provide retry when the server operation fails.

## Avoid duplicate machinery

Do not add new instances of these patterns for ordinary server state:

- module-level listener sets for cache synchronization;
- component refs used as request mutexes;
- separate custom request-deduplication wrappers;
- focus effects that unconditionally refetch every resource;
- context mirrors of query data;
- AsyncStorage copies without an offline product requirement;
- local success booleans that override persisted server lifecycle indefinitely.

A provider-specific import lock may still be necessary on the API. Frontend request prevention is a UX guard, not the durable concurrency guarantee.

## Offline persistence

Use offline storage only when the user experience explicitly supports it. Document:

- what is stored;
- whether it is sensitive;
- maximum age;
- user identity binding;
- invalidation events;
- reconciliation after reconnect;
- whether queued mutations are idempotent.

Never allow a stale offline completion marker to outrank current server truth.

## Background work

- Make effects safe when mounted twice or focused repeatedly.
- Key one-time transitions with durable operation identifiers when available.
- Cancel timers and subscriptions during cleanup.
- Stop polling or timers while the app is inactive.
- Respect reduced motion for visual timers, but not data correctness timers.
- Surface durable failures such as reconnect-required instead of silently turning them into empty success.
- Treat a lock timeout during reset as retryable conflict state, not partial success.
- Poll durable import operations only while the app is active and the operation is nonterminal. Stop on `succeeded`, `failed`, `expired`, `superseded`, or `cancelled`; use terminal success to invalidate receipt-derived/import state and terminal failure/cancellation to expose the correct recovery.
- Treat `pending_dispatch`/waiting-for-queue as accepted delayed work. Preserve the operation identifier across refetches instead of submitting a duplicate request.

## Migration strategy

When migrating an existing resource:

1. Document its current readers, writers, cache, deduplication, and invalidation paths.
2. Add the query hook and a one-way compatibility adapter if required.
3. Move every consumer in the selected domain boundary.
4. Move mutations and invalidation.
5. Remove the old owner and cache path.
6. Test remount, focus, mutation, logout, and stale-cache behavior.

Do not leave both systems writable.
