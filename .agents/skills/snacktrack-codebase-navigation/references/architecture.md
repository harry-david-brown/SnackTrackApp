# SnackTrack architecture map

Use this map to choose a starting point. Confirm names with `rg --files` because the codebase will continue to evolve.

## Workspace shape

- `SnackTrackApp/`: Expo Router React Native application.
- `SnackTrackAPI/`: Express/TypeScript API backed by PostgreSQL.
- The two directories are separate Git repositories. Run Git and package commands from the repository being changed.

## Mobile app

### Entry points and screens

- `app/_layout.tsx`: root providers and navigation setup.
- `app/(tabs)/index.tsx`: dashboard.
- `app/(tabs)/upload.tsx`: Gmail and export import checklist.
- `app/(tabs)/wrapped-journey.tsx`: summary/slideshow journey.
- `app/(tabs)/profile.tsx`: profile and account controls.
- `app/receipts.tsx`: receipt history/details entry point.

### Feature code

- `components/dashboard/`: dashboard cards, tracking state, and “What we noticed.”
- `components/gmail/`: Gmail connection/import UI.
- `components/upload/`: export request and upload UI.
- `components/wrapped/`: slideshow and post-summary propositions.
- `components/ui/`: shared controls and standard modal/alert presentation.
- `contexts/UserContext.tsx`, `contexts/userTypes.ts`, and reducer files: signed-in user state.
- `hooks/`: orchestration and server-state hooks such as `useImportPreferences.ts` and `useGmailImport.ts`.

### API boundary and styling

- `services/api/client.ts` and `services/api.ts`: HTTP client behavior.
- `services/authApi.ts`, `services/analyticsApi.ts`, `services/gmailApi.ts`: domain request and response normalization.
- `types/api.ts`: manually maintained transport types.
- `constants/theme.ts`: canonical colors, spacing, typography, and shared tokens.
- `docs/design-system.md`: design intent; verify implementation against `constants/theme.ts`.
- `components/ui/AppAlertProvider.tsx`, `utils/appAlert.ts`, `utils/platformAlert.ts`: standard app modal/alert path.

## API

### Entry points and transport

- `src/index.ts`: Express setup and route registration.
- `src/routes/`: HTTP contracts for auth, Gmail, CSV/export, users, receipts, monitoring, and database/debug surfaces.
- `src/services/core/ServiceContainer.ts`: dependency wiring and service ownership.

### Persistence and domain

- `src/services/data/PostgresService.ts`: schema initialization and startup migrations.
- `src/services/data/database-optimizations.ts`: indexes, triggers, and additional optimizations.
- `src/services/data/ImportPreferencesRepository.ts` and neighboring data services: persistence queries and state repositories.
- `src/services/data/AccountResetService.ts`: fresh-account reset transaction and retention contract, when present.
- `src/models/Receipt.ts` and `src/models/User.ts`: core domain shapes.

### Important services

- `src/services/analytics/WrappedAnalyticsService.ts`: slideshow and summary metrics.
- `src/services/analytics/DashboardInsightService.ts`: dashboard insight cards.
- `src/services/import/CsvImportService.ts`: uploaded export parsing and replacement rules.
- `src/services/import/GmailImportService.ts`: Gmail import orchestration.
- `src/services/import/OngoingTrackingService.ts`: scheduled ongoing receipt checks.
- `src/services/import/ImportLockService.ts`: import concurrency protection.
- `src/services/extraction/ReceiptDataExtractor.ts` and `src/services/extraction/ReceiptExtractor.ts`: receipt extraction/parsing.

For any destructive mutation, search all `user_id` foreign keys, provider credential columns, Redis prefixes, TanStack query keys, and AsyncStorage/SecureStore keys rather than assuming this map is exhaustive.

## Tests

- App tests live beside features and under test directories; find focused coverage with `rg --files SnackTrackApp | rg 'test|spec'`.
- API regression coverage lives under `SnackTrackAPI/tests/`; inspect `package.json` for current task aliases.
- When a resolver encodes UI precedence, test the resolver directly in addition to rendering coverage.
