# 🚀 Snack Track Launch TODO

The list below captures every change we still need before shipping the production build in ~2–3 weeks. Items are grouped by priority; assume they are blocking unless explicitly marked as stretch.

---

## 🔴 Critical Blockers

- [x] **Fix Redis analytics invalidation (backend)**  
  Backend team fixed cache invalidation. After uploading a new CSV file, the Wrapped journey and dashboard now properly show updated data immediately. Tested and verified working.

- [x] **Ship password reset + email verification UX**  
  Until users can recover accounts or confirm ownership, we can’t submit to the stores. Frontend needs a new multi-step flow in `components/LoginScreen.tsx` + API hooks in `services/authApi.ts` once endpoints land. Include rate-limited OTP inputs, success screens, and edge-state coverage.

- [x] **Move auth tokens to secure storage**  
  Migrated sensitive tokens (access & refresh) from AsyncStorage to Expo SecureStore/Keychain for encrypted storage. Non-sensitive data (user data, user ID, expiry) remains in AsyncStorage. Updated all token operations and tests in `__tests__/tokenManager.test.ts`.

- [x] **Hard-stop on missing env configuration**  
  Implemented environment validation in `config/env.ts` that:  
  - Fails `expo start` if `EXPO_PUBLIC_API_URL` is absent or invalid (via `scripts/validate-env.js`)  
  - Validates URL format and required variables before app starts  
  - Supports dev/staging/prod environments via `EXPO_PUBLIC_APP_ENV`  
  - Updated `scripts/verify-setup.js` to validate env vars  
  - Updated `services/api.ts` to use validated config module


- [x] **Observability + incident response**  
  Integrated Sentry for JS errors, native crashes, and performance tracing. Features:
  - Error tracking in ErrorBoundary and API error handler
  - User context tracking (set on login, cleared on logout)
  - Release tracking tied to app version and build number
  - Performance monitoring (10% sample rate in production)
  - Optional DSN configuration via `EXPO_PUBLIC_SENTRY_DSN` (app works without it)
  - Configured in `utils/sentry.ts` and initialized in `app/_layout.tsx`

---

## 🟠 High Priority

- [x] **CI/CD essentials**  
  - [x] Add dependency audit job to CI workflow
  - [x] Fix all lint warnings - production code quality

- [ ] **Performance + bundle budget**  
  Capture baseline bundle size (`expo export --platform ios,android`), enforce a budget via CI, and profile slow renders (`components/WrappedJourneyLoader.tsx`, `components/InsightsPanel.tsx`). Document remediation plan (code splitting, memoization, image optimization). **Critical for viral success** - prevents crashes and slow performance during traffic spikes.

- [x] **Network/offline UX polish**  
  Implemented comprehensive network/offline handling:
  - Real-time network status detection with immediate UI updates (~1s delay acceptable)
  - Check network status before upload attempts (prevents wasted API calls)
  - Better error messages (network errors, rate limits, server errors, file validation)
  - Disable upload button during upload and when offline
  - Offline analytics viewing with cache fallback
  - Dashboard refresh includes wrapped analytics
  - Modal cannot be dismissed during active upload
  - Comprehensive test suite (57 tests) covering all network/offline scenarios
  **Critical for viral success** - prevents user frustration and wasted backend resources during traffic spikes.

---

## 🟡 Nice-to-Have Before Launch

- [ ] **Marketing/share QA**  
  Lock final share image specs (`components/ShareableGraphics.tsx`, `components/WrappedShareJourney.tsx`), test across iOS/Android + Instagram/TikTok targets, and version share copy in a config file for experimentation.

- [ ] **In-app announcements + support links**  
  Add a lightweight “What’s new / Contact support” drawer so we can communicate outages or backend maintenance without shipping a new build.

- [ ] **Analytics + growth hooks**  
  Instrument key funnels (signup, upload start, upload success, share tap) via Segment/Amplitude. Tie them to the auth onboarding to track drop-off before investing in paid acquisition.

---

### References
- Authentication flows: `components/LoginScreen.tsx`, `contexts/UserContext.tsx`, `services/authApi.ts`
- Upload & analytics refresh: `components/UberDataUpload.tsx`, `app/(tabs)/upload.tsx`, `services/analyticsApi.ts`
- Token storage & caching: `utils/tokenManager.ts`, `utils/offlineCache.ts`
- Existing CI tasks: `README.md` (Production Enhancements), `package.json` scripts, `scripts/verify-setup.js`

This checklist should live beside the README so we can track and assign owners. Update items as work completes.

