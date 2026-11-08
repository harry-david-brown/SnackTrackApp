# SnackTrack architecture map

Use this map to choose a starting point. Confirm names with `rg --files` because the codebase will continue to evolve.

## Workspace shape

- `SnackTrackApp/`: Expo Router React Native application.
- `SnackTrackAPI/`: Express/TypeScript API plus worker and scheduler processes, backed by PostgreSQL, Redis/BullMQ, and import object storage.
- `SnackTrackAdmin/`: Vite/React administrator console.
- The directories are separate repositories or worktrees. Run Git and package commands from the repository being changed; the workspace root itself is not a Git repository.

## Mobile app

### Entry points and screens

- `app/_layout.tsx`: root providers and navigation setup.
- `app/(tabs)/index.tsx`: dashboard.
- `app/(tabs)/upload.tsx`: mailbox and export import checklist.
- `app/(tabs)/wrapped-journey.tsx`: summary/slideshow journey.
- `app/(tabs)/profile.tsx`: profile and account controls.
- `app/receipts.tsx`: receipt history/details entry point.

### Feature code

- `components/dashboard/`: dashboard cards, tracking state, and “What we noticed.”
- `components/gmail/`: Gmail connection UI.
- `components/import/` and `components/upload/`: durable import-operation status, mailbox imports, export upload, and setup UX.
- `components/upload/`: export request and upload UI.
- `components/wrapped/`: slideshow and post-summary propositions.
- `components/ui/`: shared controls and standard modal/alert presentation.
- `contexts/UserContext.tsx`, `contexts/userTypes.ts`, and reducer files: signed-in user state.
- `hooks/`: orchestration and server-state hooks such as `useImportPreferences.ts`, `useGmailImport.ts`, `useOutlookImport.ts`, and `useImportOperation.ts`.

### API boundary and styling

- `services/api/client.ts` and `services/api.ts`: HTTP client behavior.
- `services/authApi.ts`, `services/analyticsApi.ts`, `services/gmailApi.ts`, `services/outlookApi.ts`, and `services/importOperationsApi.ts`: domain requests and response normalization.
- `types/api.ts`: manually maintained transport types.
- `constants/theme.ts`: canonical colors, spacing, typography, and shared tokens.
- `constants/motion.ts`, `contexts/MotionContext.tsx`: motion tokens and shared reduced-motion/inactivity policy.
- `components/ui/AppButton.tsx`, `AnimatedChoiceGroup.tsx`, `AnimatedDisclosure.tsx`: press feedback, measured choice highlights, and expanding details.
- `app/(tabs)/_layout.tsx`, `app/_layout.tsx`: tab and stack transition presentation.
- `docs/design-system.md`: design intent; verify implementation against `constants/theme.ts`.
- `components/ui/AppAlertProvider.tsx`, `utils/appAlert.ts`, `utils/platformAlert.ts`: standard app modal/alert path.

## API

### Entry points and transport

- `src/index.ts`: Express setup and route registration.
- `src/routes/`: HTTP contracts for auth, Gmail, Outlook, durable imports/exports, users, receipts, monitoring, admin, and database/debug surfaces.
- `src/services/core/ServiceContainer.ts`: dependency wiring and service ownership.

### Persistence and domain

- `src/services/ports/`: provider-neutral database, authentication, receipt, projection, import, mailbox, cache, and lock capabilities consumed by application services.
- `src/services/data/PostgresService.ts`: PostgreSQL pool, typed query/transaction execution, statistics, and lifecycle only.
- `src/services/data/MigrationRunner.ts` and `src/services/data/migrations/`: immutable checksum-recorded schema changes, indexes, constraints, and backfills.
- `src/services/data/ImportLifecycleRepository.ts`, `ImportPreferencesQueryRepository.ts`, `GmailSyncRunRepository.ts`, `ImportEventRepository.ts`, and `ImportSourceCoverageRepository.ts`: split import persistence responsibilities.
- `src/services/data/MailboxConnectionRepository.ts`, `MailboxSyncRunRepository.ts`, and `MailboxSecurityPolicyRepository.ts`: provider-aware mailbox credentials, sync history, and mailbox policy.
- `src/services/data/ImportJobRepository.ts`: durable import operations and transactional outbox state.
- `src/services/data/AccountResetService.ts`: fresh-account reset transaction and retention contract, when present.
- `src/models/Receipt.ts` and `src/models/User.ts`: core domain shapes.

### Important services

- `src/services/analytics/WrappedAnalyticsService.ts`: slideshow and summary metrics.
- `src/services/user/GetDashboardInsightsService.ts` plus `src/services/analytics/dashboard/`: dashboard query orchestration and pure insight assembly.
- `src/services/import/CsvImportService.ts` and `CsvImportUseCase.ts`: export parsing and transactional writer/lifecycle orchestration.
- `src/services/import/GmailImportService.ts` and `OutlookImportService.ts` plus their acquisition/extraction/persistence/lifecycle collaborators: mailbox import orchestration over provider-neutral ports.
- `src/services/import/ImportJobService.ts` and `ImportJobProcessor.ts`: durable operation creation, upload intents, and worker execution.
- `src/services/queue/ImportQueues.ts`: BullMQ publication, outbox dispatch, worker construction, and queue operations; PostgreSQL remains the durable authority.
- `src/services/import/OngoingTrackingService.ts`: scheduled ongoing receipt checks.
- `src/services/import/ImportLockService.ts`: import concurrency protection.
- `src/services/extraction/ReceiptDataExtractor.ts` and `src/services/extraction/ReceiptExtractor.ts`: receipt extraction/parsing.

For any destructive mutation, search all `user_id` foreign keys, provider credential columns, Redis prefixes, TanStack query keys, and AsyncStorage/SecureStore keys rather than assuming this map is exhaustive.

### Runtime processes

- `src/index.ts`: API lifecycle and HTTP server.
- `src/worker.ts`: mailbox/export/notification consumers and lock-dependent worker recovery.
- `src/scheduler.ts`: scheduled durable operation creation and cleanup.
- `src/config/redis.ts`: process-owned Redis lifecycle plus distinct cache, lock, and refresh-token capabilities.

## Admin console

- `src/App.tsx`: router, role gates, and shared application shell.
- `src/api.ts` and `src/contracts.ts`: admin HTTP boundary and runtime contracts.
- `src/pages/`: Home, People, user timeline/detail, Imports, Growth, Journey, and System pages.
- Keep role authorization authoritative in the API; frontend route/navigation gating is defense in depth and presentation only.

## Tests

- App tests live beside features and under test directories; find focused coverage with `rg --files SnackTrackApp | rg 'test|spec'`.
- API regression coverage lives under `SnackTrackAPI/test/`; its `README.md` maps responsibility layers and `test/fakes/` contains deterministic ports.
- Admin coverage lives beside the Vite source (for example `SnackTrackAdmin/src/*.test.ts`).
- When a resolver encodes UI precedence, test the resolver directly in addition to rendering coverage.
