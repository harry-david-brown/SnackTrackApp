# Dashboard Insights Daily Edition — Implementation Tracker

Status: implemented and automatically verified  
Last updated: 2026-08-13  
Scope: SnackTrack API and mobile app  
Primary surface: Dashboard → What we noticed

## Objective

Turn **What we noticed** from a passive weekly stat carousel into a fresh,
funny, swipeable daily edition. The API will generate a broad catalogue of
eligible observations from receipt history, select up to seven strong and
varied cards each local day, and return a typed presentation contract for the
app to render.

The experience should:

- reveal patterns users are unlikely to notice themselves;
- mix recent changes, lifetime habits, records, restaurant stories, item
  obsessions, delivery behaviour, and playful counterfactuals;
- remain stable throughout a user's local calendar day;
- refresh after new Gmail or export receipts arrive;
- prioritize strong observations rather than padding every edition to seven;
- use warm, contextual humour without turning every card into a guilt trip;
- preserve source limitations and suppress statistically weak claims; and
- remain accessible with or without motion or touch gestures.

## Agreed product decisions

- [x] Serve up to seven insights per daily edition.
- [x] Rotate the edition daily using the user's local date and timezone.
- [x] Keep the same deterministic edition throughout the day unless receipt
  data changes.
- [x] Do not permanently pin Top Restaurants as the opening card.
- [x] Prefer fewer strong cards over padding a sparse account to seven.
- [x] Allow at most one locked/export teaser in an edition.
- [x] Make the experience swipeable and show visible position/progress.
- [x] Stop or pause autoplay after direct user interaction.
- [x] Keep analytics and card selection server-owned.
- [x] Use recent Gmail orders for current spending deltas.
- [x] Use export item data for item- and basket-level insights.
- [x] Accept potential duplicated Uber item rows for the first release.
- [x] Prefer entertaining physical quantities such as cookies, hash browns,
  nuggets, or sauces over "appeared in X orders."
- [x] Keep the Uber flattened-item reconstruction problem deferred and
  documented separately.
- [x] Use a hypothetical fixed annual return for investment cards rather than
  live market-price comparisons in the first release.

## Explicitly deferred or out of scope

- [ ] Reconstruct Uber item instances split across customization rows.
- [ ] Preserve raw Uber customization groups in the receipt schema.
- [ ] Reprocess previously imported Uber item rows after reconstruction.
- [ ] Add live stock, ETF, cryptocurrency, or other market-price feeds.
- [ ] Add multi-currency receipt conversion or historical exchange rates.
- [ ] Add user-selected humour levels such as Friendly, Playful, or Roast Me.
- [ ] Add reactions such as Accurate, Called Out, or Not Interesting.
- [ ] Persist seen/new state across devices.
- [ ] Generate shareable dashboard card images.
- [x] Physical iOS Simulator and Android Emulator QA is user-owned and is not
  part of this implementation task or its definition of done.

See `SnackTrackAPI/docs/UBER_EXPORT_ITEM_RECONSTRUCTION.md` for the deferred
Uber item issue.

## Implementation baseline (before this task)

- [x] The API currently builds dashboard cards from receipts in
  `SnackTrackAPI/src/services/analytics/DashboardInsightService.ts`.
- [x] The user-summary route currently embeds `dashboardInsights` in
  `SnackTrackAPI/src/routes/users.ts`.
- [x] The app currently fetches the user summary through TanStack Query.
- [x] The app currently renders insights in
  `SnackTrackApp/components/dashboard/WhatWeNoticedCarousel.tsx`.
- [x] Existing receipt mutations invalidate API analytics caches and app query
  keys.
- [x] Existing cards rotate deterministically by week and return at most six.
- [x] Top Restaurants is currently pinned first.
- [x] The current carousel uses a timed fade rather than native swiping.
- [x] The current client performs only shallow validation of insight objects.

## Continuation context after conversation compaction

This is the durable handoff for the discussion that produced this plan. The
implementation described below is now complete. The separate Uber item
reconstruction issue is documented in
`SnackTrackAPI/docs/UBER_EXPORT_ITEM_RECONSTRUCTION.md`.

### Decisions already made

- Serve **up to seven** eligible insights per daily edition. Do not pad with
  weak cards when fewer than seven qualify.
- Rotate once per **user-local calendar day**, with a stable seed such as
  `userId:localDate:metricVersion`.
- Do not permanently anchor Top Restaurants. Prefer category variety, suppress
  near-duplicates, avoid yesterday's opener when practical, and allow at most
  one locked/export teaser.
- Use a swipeable paged carousel with visible progress. If autoplay remains,
  use roughly six seconds and stop/pause it after interaction. Respect reduced
  motion.
- Keep facts, eligibility, selection, and final copy server-owned; keep display
  variants, interaction, accessibility, and resilient UI states app-owned.
- Item-obsession cards should show physical units (cookies, hash browns,
  nuggets, etc.), not merely order appearances. Treat calculated totals as
  canonical truth, retain the tracked-order sample size, and let punchlines
  commit to the bit without uncertainty language or evidentiary qualifiers.
- Accept possible Uber item duplicates in v1; do not introduce timestamp-based
  deduplication.
- Never commit the two personal Uber archives or identifying raw rows. Use only
  anonymized derived/synthetic fixtures.

### Candidate insight families discussed

- Exact basket/menu soulmate; consecutive restaurant tunnel vision.
- Accumulated delivery time; restaurant median speed and reliability.
- Restaurant eras/crown changes, former favourites, and comebacks after a gap.
- Explorer-versus-loyalist diversity and concentration.
- Estimated physical item obsessions.
- Longest/current order streak and longest delivery detox.
- Latest-ever order, late-night and weekend personality, and multi-order days.
- Foodflation for a specific identical meal or repeated item, showing its
  earlier price, recent price, and price movement over time.
- Month-to-date versus the same elapsed days last month, plus latest 30 days
  versus the preceding 30; explain whether frequency, basket size, or an
  outlier drove the change.
- A hypothetical “invested instead” scenario, using each order amount as a
  contribution on its order date and an illustrative fixed 7% annual return.

### Metric definitions and guardrails

- Streaks count **unique local order dates**, not raw rows.
- Exact baskets compare normalized restaurant plus a normalized item multiset;
  item order must not affect the signature.
- Valid delivery durations are positive and no more than 720 minutes. Use
  medians. Require at least three samples for restaurant comparisons and
  consider five for stronger claims.
- Percentage spending deltas require at least three orders in each period and
  must avoid sensational copy when the baseline is tiny.
- Month-to-date compares the same number of elapsed local-calendar days in the
  previous month. Rolling comparison is the latest 30 local days against the
  immediately preceding 30.
- Recency-sensitive copy must pass freshness checks; do not describe an old
  dataset as “current.”
- Investment output must include contributions, hypothetical value and gain,
  the 7% assumption, and as-of date, with a clear illustration/not-financial-
  advice disclaimer.
- Time-window definitions currently drift: the dashboard uses 10 PM–4 AM,
  while Wrapped contains both 10 PM+ and midnight–6 AM concepts. Choose one
  canonical local-time definition and shared helper before implementation.
- Classify merchants because Uber exports can put grocery, alcohol, and
  pharmacy merchants in the restaurant field.
- Receipts do not persist source currency, so mixed-currency histories can be
  presented inaccurately. Do not overstate currency precision; a full fix is a
  separate persistence/migration decision.

### Evidence from two anonymized sample exports

These discovery results show that the metrics tell meaningfully different
stories. They are not permission to commit the source archives.

- Sample A: 1,148 positive completed orders, about CAD 27,077, roughly 49
  normalized brands, top three at 52.2%, a 15-day streak, about 514 accumulated
  valid delivery hours, an exact Subway basket repeated 31 times, and six
  consecutive orders from one brand. Its crown shifted from McDonald's
  (2019–2023) to Subway (2024–2025).
- Sample B: 869 positive completed orders, about CAD 23,616, roughly 140 brands
  with 65 one-offs, McDonald's at 30.8%, a 13-day streak, about 482 accumulated
  valid delivery hours, an exact Quarter Pounder basket repeated 16 times, and
  12 consecutive orders from one brand. Its crown also changed after 2023.

### Known Uber item-count limitation

- Uber's consumer CSV can flatten one configured item into several same-named
  rows carrying different customization groups.
- Shared order/delivery timestamps only establish the containing order; every
  genuine item also shares them, so timestamps cannot deduplicate items.
- In the inspected Starbucks example, a cookie and three same-named Mocha
  Frappuccino rows had different customizations. Three drinks plus the cookie
  exceeded the final total; one drink plus cookie/customizations left plausible
  taxes and fees. Duplication is likely, but omitted promotion detail means
  price reconciliation is not proof.
- The explicit product decision is to tolerate this in v1 and revisit item
  reconstruction later.

### Recommended API and app contract

- Add `GET /users/:id/dashboard-insights` instead of expanding the general
  summary. Return local edition date, metric version, generated/as-of time, next
  refresh boundary, and a discriminated union of typed cards.
- Normalize the receipt set once per calculation: local dates/times, merchants
  and branches, merchant class, item names/quantities, basket signatures, valid
  waits, and comparison windows.
- Use a dedicated cache key containing user, local date, timezone, and metric
  version, expiring at next local midnight. Invalidate it after receipt changes,
  completed/replacement imports, resets/clears, and timezone changes.
- Fetch through TanStack Query with local edition date in the key, retain the
  prior edition while refreshing, and refresh after foregrounding into a new
  day or crossing local midnight.
- Strictly validate each insight variant at the client boundary. Do not mirror
  query state in context or persistent storage.
- Use typed hero/comparison/ranking/order/timeline/locked cards, with explicit
  loading, empty, stale-error, and fresh resolution. Announce “Insight X of Y,”
  support font scaling, and make controls/progress accessible.

### Canonical implementation owners

- API: `SnackTrackAPI/src/services/analytics/DashboardInsightService.ts`,
  `SnackTrackAPI/src/routes/users.ts`,
  `SnackTrackAPI/src/services/core/CacheService.ts`,
  `SnackTrackAPI/src/services/data/ReceiptRepository.ts`, and
  `SnackTrackAPI/src/models/Receipt.ts`.
- Potential shared logic: `SnackTrackAPI/src/services/analytics/WrappedAnalyticsService.ts`.
- Recommended new server root: `SnackTrackAPI/src/services/analytics/dashboard/`.
- App: `SnackTrackApp/app/(tabs)/index.tsx`,
  `SnackTrackApp/components/dashboard/WhatWeNoticedCarousel.tsx`,
  `SnackTrackApp/services/analyticsApi.ts`, `SnackTrackApp/types/api.ts`,
  `SnackTrackApp/hooks/queries/useAnalyticsQueries.ts`,
  `SnackTrackApp/lib/queryKeys.ts`, and
  `SnackTrackApp/lib/queryInvalidation.ts`.
- Test starting points: `SnackTrackAPI/test/metric-regressions.test.js` and
  `SnackTrackApp/__tests__/components/WhatWeNoticedCarousel.test.tsx`.

### Safe starting sequence and worktree caution

1. Build normalization/metric modules with anonymized synthetic fixtures and
   explicit eligibility/reason codes.
2. Implement the deterministic daily selector and diversity rules.
3. Add the typed endpoint, cache boundary, midnight expiry, and invalidations.
4. Add strict frontend types/query/state resolution.
5. Replace the carousel and add interaction/accessibility behavior.
6. Cover metrics, selection, route, query, UI, timezone/DST, sparse/stale data,
   and copy snapshots before rollout.

Both repositories already contain unrelated user changes and untracked files.
Inspect status before edits, preserve everything unrelated, and never reset or
overwrite those changes. Keep this tracker's checkboxes current.

## Target data path

```text
Persisted receipts
  -> normalized dashboard analytics dataset
  -> eligible insight candidate builders
  -> value-sensitive copy and punchline selection
  -> daily category-balanced selector
  -> typed dashboard-insight edition endpoint
  -> TanStack Query dashboard-insight resource
  -> swipeable presentation-specific cards
```

## Phase 1 — Backend analytics foundation

### Service structure

- [x] Move the growing dashboard insight implementation into a focused module
  directory under `SnackTrackAPI/src/services/analytics/dashboard/`.
- [x] Define canonical backend types for the daily edition, candidates,
  categories, presentations, actions, comparisons, freshness, and supporting
  metadata.
- [x] Keep calculation and eligibility independent from final daily selection.
- [x] Keep UI-specific navigation out of calculation code; expose semantic
  actions such as `open_export`.
- [x] Extract shared financial/time calculations from Wrapped where doing so
  prevents formula drift.

### Normalized analytics dataset

- [x] Build the receipt-derived dataset once per request rather than rescanning
  all receipts independently for every insight.
- [x] Exclude or explicitly handle zero-total/refunded receipts.
- [x] Index dated receipts by user-local date, month, year, weekday, and hour.
- [x] Sort dated receipts chronologically and preserve stable tie-breaking.
- [x] Group receipts by normalized restaurant brand.
- [x] Group export receipts by normalized item and canonical basket.
- [x] Collect valid delivery waits using the existing 0–12 hour safeguard.
- [x] Identify receipt-source coverage: email only, export only, or mixed.
- [x] Track earliest and latest covered order dates.
- [x] Provide current and previous comparison windows in the user's timezone.

### Restaurant normalization

- [x] Normalize casing, whitespace, punctuation, and common branch suffixes.
- [x] Create a stable restaurant key and representative display label.
- [x] Add aliases for known historical spelling/name variants where safe.
- [x] Distinguish restaurants from grocery, pharmacy, convenience, and alcohol
  merchants when the name provides enough evidence.
- [x] Preserve the raw restaurant name on the receipt.
- [x] Add tests ensuring distinct brands are not accidentally merged.

### Item normalization for first release

- [x] Normalize case, whitespace, trademarks, punctuation, and calorie suffixes.
- [x] Map obvious historical aliases into item families.
- [x] Preserve explicit `ReceiptItem.quantity` values.
- [x] Parse obvious physical-unit multipliers from names such as `12-Pack`,
  `10 McNuggets`, and similar count-bearing product names.
- [x] Define item personalities in one extensible registry containing detection,
  unit parsing, labels, thresholds, icons, and rotating punchlines.
- [x] Cover coffee, cookies, hash browns, fries, nuggets, fried chicken, sauces,
  burgers, pizza, tacos, burritos, sandwiches, donuts, frozen treats, bubble
  tea, soft drinks, milkshakes, and bagels.
- [x] Give frequently repeated unclassified items a generic personality card so
  new menu types can qualify before receiving a bespoke profile.
- [x] Mark item quantities internally as estimates when family/pack parsing is
  involved.
- [x] Accept possible duplication from flattened customization rows for now.
- [x] Add sanity thresholds so implausible item totals are not shown.

## Phase 2 — Insight candidate catalogue

### Existing insight families to preserve or refine

- [x] Top Restaurants ranking.
- [x] Favourite delivery weekday.
- [x] Peak hunger/order hour.
- [x] Night Owl percentage.
- [x] Busiest month.
- [x] Number-one restaurant and loyalty share.
- [x] Biggest Splurge.
- [x] Most Ordered Meal.
- [x] Worst Order.
- [x] Longest Delivery.
- [x] Existing export-powered locked previews.

### Recent spending and frequency movement

- [x] Month-to-date versus the same number of local days last month.
- [x] Latest 30 complete days versus the preceding 30 complete days.
- [x] Spending delta.
- [x] Order-count delta.
- [x] Average-order-value delta.
- [x] Explain whether frequency, average basket value, or an outlier drove the
  movement.
- [x] Suppress percent deltas when either comparison period has fewer than
  three orders.
- [x] Avoid sensational percentages caused by a tiny comparison base.
- [x] Suppress "current" movement insights when receipt coverage is stale.
- [x] Clearly distinguish partial month-to-date periods.

### Restaurant stories

- [x] Longest consecutive run of orders from the same restaurant.
- [x] Restaurant Crown Changed: top restaurant by year or meaningful period.
- [x] Former Favourite: previously dominant restaurant that has gone quiet.
- [x] Comeback Tour: return after a long restaurant-specific gap.
- [x] Restaurant Rivalry: top two separated by a small order-count margin.
- [x] Restaurant Era: sustained dominance over a bounded period.
- [x] Recent Variety Era: many different restaurants in the latest N orders.
- [x] Comfort Orderer / Explorer personality derived from concentration and
  one-off restaurant rates.
- [x] Require meaningful history and repeat visits before narrating a comeback
  or relationship.

### Item and basket stories

- [x] Item Obsession using physical-unit totals.
- [x] Exact-Basket Soulmate using normalized restaurant plus normalized basket.
- [x] Most Predictable Order.
- [x] Recurring Side Character.
- [x] Coffee count or favourite coffee where data qualifies.
- [x] Nugget lifetime total where explicit pack sizes qualify.
- [x] Cookie lifetime total, including obvious pack sizes.
- [x] Hash-brown lifetime total.
- [x] Dipping-sauce accumulation.
- [x] Price of Your Usual using repeated comparable baskets.
- [x] Describe price movement as a change in what the user paid, not proof of a
  menu-price increase.
- [x] Keep estimation provenance internal; user-facing item cards present the
  total directly and show only the tracked-order sample size.

### Timing and streak stories

- [x] Longest consecutive-day ordering streak.
- [x] Current or longest delivery break/detox.
- [x] Multi-order day, including a three-order-day observation.
- [x] Latest-ever local order time.
- [x] Favourite late-night restaurant.
- [x] Most common late-night item when export data qualifies.
- [x] Weekend personality using normalized per-day comparisons.
- [x] First tracked order anniversary or other meaningful anniversaries.

### Delivery stories

- [x] Accumulated valid delivery time.
- [x] Fastest personal delivery record.
- [x] Longest valid delivery record.
- [x] Fastest regular restaurant by median delivery time.
- [x] Most reliable regular restaurant.
- [x] Most unpredictable regular restaurant.
- [x] Compare restaurant median against the user's overall median.
- [x] Require sufficient samples before ranking restaurant performance.
- [x] Exclude known non-restaurant merchants from restaurant speed rankings.

### Spending, records, and alternate universes

- [x] Personal spending/order records with meaningful thresholds.
- [x] Positive progress milestones, such as fewer orders or lower spending.
- [x] Hypothetical investment value using one product-wide fixed return.
- [x] Use an illustrative 7% annual return unless product direction changes.
- [x] Treat each order amount as hypothetically invested on its order date.
- [x] Return contributions, estimated value, hypothetical gain, assumption,
  valuation date, and disclaimer metadata.
- [x] Do not represent fixed-return math as historical market performance.
- [x] Add occasional playful equivalences only when they can be calculated from
  stable, localized reference data.

## Phase 3 — Copy and humour system

- [x] Separate raw facts from display copy and punchline selection.
- [x] Define value bands for contextual humour.
- [x] Use deterministic daily copy variants.
- [x] Keep everyday dashboard humour warmer than the deliberate Wrapped roast.
- [x] Include positive and neutral observations so the edition is not uniformly
  judgemental.
- [x] Treat displayed item totals as accurate and allow the humour to riff on
  them without hedging or limiting every joke to separately provable facts.
- [x] Use definitive `ordered` or `included` language for item totals; do not
  expose `estimated`, `roughly`, `approximately`, or similar hedges.
- [x] Keep punchlines concise enough for font scaling and small devices.
- [x] Review all generated copy against both anonymized sample histories.

## Phase 4 — Daily selection engine

- [x] Replace the weekly key with a user-local daily edition key.
- [x] Seed selection with user ID, local date, and metric version.
- [x] Keep the selected set and order deterministic throughout the day.
- [x] Score timely, recently changed, record-setting, and novel candidates
  above static lifetime facts.
- [x] Select no more than seven cards.
- [x] Prefer fewer strong cards to weak padding.
- [x] Enforce category diversity.
- [x] Avoid closely related cards in the same edition.
- [x] Do not permanently anchor Top Restaurants.
- [x] Avoid repeating yesterday's opener when alternatives exist.
- [x] Include no more than one locked card.
- [x] Never let a locked card displace a stronger real insight solely to meet a
  quota.
- [x] Keep locked cards away from the opening position.
- [x] Define stable tie-breaking for equally scored candidates.

## Phase 5 — API contract and caching

### Endpoint and response

- [x] Add a dedicated authenticated dashboard-insight endpoint or explicitly
  document why the edition remains inside the summary response.
- [x] Recommended endpoint: `GET /users/:id/dashboard-insights`.
- [x] Preserve ownership validation and timezone detection.
- [x] Return edition metadata: local date, timezone, generated time, metric
  version, available candidate count, and selected insights.
- [x] Define a discriminated card union rather than a bag of optional fields.
- [x] Define presentations such as hero stat, comparison, ranking, order,
  timeline/list, and locked.
- [x] Include semantic action data without frontend route paths.
- [x] Update Swagger/OpenAPI documentation.

### API cache

- [x] Add a dashboard-insight-specific cache prefix.
- [x] Include metric version, timezone, and local edition date in the key.
- [x] Expire the edition at or shortly after the next user-local midnight.
- [x] Add the new cache prefix to all-user-cache invalidation.
- [x] Invalidate after Gmail historical imports.
- [x] Invalidate after ongoing-tracking checks that add or update receipts.
- [x] Invalidate after export imports.
- [x] Invalidate after receipt deletion or onboarding/account reset.
- [x] Invalidate after timezone changes.
- [x] Verify no stale summary payload continues to override the dedicated
  dashboard edition.

## Phase 6 — Frontend data boundary

- [x] Add transport types matching the backend discriminated union.
- [x] Validate every edition and card variant at the service boundary.
- [x] Reject or safely omit malformed cards instead of casting arbitrary
  objects to `DashboardInsight`.
- [x] Add a dedicated dashboard-insight API service.
- [x] Add a dashboard-insight query-key factory entry.
- [x] Add a dedicated TanStack Query hook.
- [x] Include the local edition date in the query key.
- [x] Disable the query until authentication identity is ready.
- [x] Keep the previous edition visible during background refresh.
- [x] Refresh when the app becomes active on a different local date.
- [x] Refresh after the local-midnight boundary while the app remains open.
- [x] Reuse receipt-derived-data invalidation after imports and tracking checks.
- [x] Do not add a parallel context, module cache, or AsyncStorage mirror.

## Phase 7 — Frontend experience

### Section and state resolver

- [x] Add a pure resolver for loading, stale-success, empty, insufficient-data,
  success, and refresh-error states.
- [x] Never show `No receipts yet` merely because the first analytics request is
  still loading.
- [x] Keep a previous edition visible if a background refresh fails.
- [x] Add section copy such as `Your daily edition · 7 observations`.
- [x] Represent fewer eligible observations accurately.
- [x] Preserve the existing export navigation action for locked cards.

### Swipeable carousel

- [x] Replace the fade-only single-card stage with a horizontal paged list.
- [x] Support native swiping.
- [x] Show pagination dots and a textual position such as `2 of 7`.
- [x] Update position state from the settled visible page.
- [x] Keep card widths responsive across supported device sizes.
- [x] Preserve vertical dashboard scrolling without gesture conflict.
- [x] Consider automatic advancement at approximately six seconds.
- [x] Permanently pause autoplay for the current mount after a swipe, card tap,
  or other direct interaction.
- [x] Keep an explicit pause/resume control if autoplay remains enabled.
- [x] Stop timers while the app is inactive.
- [x] Respect system reduced-motion settings.
- [x] Clean up timers, subscriptions, and animations on unmount.

### Presentation variants

- [x] Build a shared insight-card shell using canonical theme tokens, radius,
  and shadow primitives.
- [x] Build a Hero Stat presentation for large quantities and records.
- [x] Build a Comparison presentation for deltas and direction.
- [x] Build a Ranking presentation.
- [x] Build an Order Detail presentation.
- [x] Build a Timeline/Story presentation for eras, comebacks, and crown changes.
- [x] Build a Locked presentation.
- [x] Evaluated mascot reactions; no dedicated card artwork was added because
  the existing dashboard mascot already provides personality without crowding
  the data cards.
- [x] Avoid requiring unavailable mascot assets for the first release.
- [x] Ensure long currencies, restaurant names, item names, and punchlines do
  not clip.

### Accessibility

- [x] Announce each card as `Insight X of Y` with its full meaningful content.
- [x] Give swipe-independent controls or semantics where necessary.
- [x] Ensure pause/play exposes role, label, and selected state.
- [x] Present methodology as clearly labelled, noninteractive text; no hidden
  info-only action is required.
- [x] Give locked actions descriptive labels.
- [x] Use adequate touch targets.
- [x] Do not convey comparison direction or freshness through color alone.
- [x] Support font scaling without fixed-height clipping.
- [x] Make all essential content available when motion is disabled.

## Phase 8 — Testing and verification

### Backend tests

- [x] Add isolated tests for dataset normalization.
- [x] Add restaurant-normalization fixtures.
- [x] Add merchant-classification fixtures.
- [x] Add item-family and pack-multiplier fixtures.
- [x] Add one focused fixture per new insight builder.
- [x] Cover empty, sparse, partial, export-only, email-only, and mixed-source
  histories.
- [x] Cover local-midnight and daylight-saving boundaries.
- [x] Cover missing order dates, items, merchants, and delivery times.
- [x] Cover stale recent coverage and low comparison bases.
- [x] Cover daily determinism and next-day rotation.
- [x] Cover maximum seven and minimum-quality behaviour.
- [x] Cover category diversity and near-duplicate suppression.
- [x] Cover opener rotation and one-locked-card maximum.
- [x] Cover deterministic copy variants.
- [x] Cover the investment formula and disclaimer metadata.
- [x] Derive anonymized regression fixtures from both supplied Uber exports;
  do not commit the personal archives or identifying data.

### Frontend tests

- [x] Test strict edition normalization.
- [x] Test every presentation variant.
- [x] Test initial loading separately from a true empty account.
- [x] Test previous-edition retention during refresh.
- [x] Test refresh failure with stale content retained.
- [x] Test swipe and pagination behaviour.
- [x] Test autoplay advancement.
- [x] Test autoplay stopping after interaction.
- [x] Test pause and resume.
- [x] Test reduced motion.
- [x] Test app background/foreground transitions.
- [x] Test a local-date change while the app remains mounted.
- [x] Test locked-card export navigation.
- [x] Test accessibility roles, labels, positions, and states.

### Required checks

- [x] Run focused API dashboard insight tests.
- [x] Run `npm run build` in `SnackTrackAPI`.
- [x] Run the relevant API regression suite.
- [x] Run focused frontend dashboard tests.
- [x] Run `npm run type-check` in `SnackTrackApp`.
- [x] Run `npm run lint` in `SnackTrackApp`.
- [x] Run `npm run check:theme` in `SnackTrackApp`.
- [x] Run the relevant frontend Jest suite.
- [x] Inspect the final API and app diffs independently because they are
  separate repositories.

## Phase 9 — Automated product readiness and rollout

This phase covers implementation-side analysis, automated verification, and
release readiness only. The user will perform literal iOS Simulator and Android
Emulator QA separately after handoff; that work does not block completion of
this task.

- [x] Generate the full candidate catalogue for both anonymized sample users.
- [x] Review every selected and suppressed candidate for plausibility.
- [x] Review item estimates for obvious duplication-driven absurdities.
- [x] Review recent deltas for low-base or partial-period confusion.
- [x] Review humour for warmth, repetition, and accidental shaming.
- [x] Cover long copy, large currencies, and non-fixed-height wrapping with
  automated component tests; literal font-scale layout remains part of the
  user-owned Simulator/Emulator pass.
- [x] Verify receipt imports immediately refresh the edition.
- [x] Verify the daily edition changes across local midnight.
- [x] Version the metric/cache contract before release.
- [x] Considered staged rollout and a kill switch; no existing feature-flag
  boundary is available, so the versioned endpoint/cache contract is the safe
  rollback boundary for this release.
- [x] Record any intentionally retained limitations in release notes.

## Automated completion evidence

- [x] API build and complete Node regression suite pass: 33 tests.
- [x] App type-check, lint, theme-token check, and complete Jest suite pass:
  344 tests across 39 suites.
- [x] Privacy-safe in-memory QA against both supplied Uber exports produced 38
  and 41 eligible candidates, with no unsafe or non-finite rendered values.
- [x] Fourteen consecutive local dates produced fourteen distinct editions for
  both anonymized samples, with seven distinct opening cards each and no
  back-to-back opener repeats.
- [x] The sample archives were never extracted into either repository and no
  personal rows or identifying fixtures were committed.
- [x] Retained release limitations are explicit: Uber customization flattening
  can overcount physical items, receipt currency is not persisted, and literal
  iOS Simulator/Android Emulator QA belongs to the user.

## Progress log

- [x] 2026-08-12: Reviewed the existing dashboard insight catalogue and weekly
  selection behaviour.
- [x] 2026-08-12: Analyzed two real Uber Eats exports for candidate patterns.
- [x] 2026-08-12: Identified restaurant, basket, streak, delivery, item, delta,
  and investment insight families.
- [x] 2026-08-12: Investigated Uber's flattened item/customization ambiguity.
- [x] 2026-08-12: Documented the deferred Uber item reconstruction issue.
- [x] 2026-08-13: Completed the frontend/backend implementation review.
- [x] 2026-08-13: Created this implementation tracker.
- [x] 2026-08-13: Implemented and automatically verified the daily dashboard
  insight edition across the API and mobile app.
- [x] 2026-08-13: Added a development-only local-day traveller for previewing
  up to 365 future editions without affecting production or shared caches.
- [x] 2026-08-13: Added rotating family-specific personality copy to every
  single-item obsession card.
- [x] 2026-08-13: Consolidated item detection, counting, eligibility, display,
  and humour into a scalable 18-profile registry with a generic fallback.
- [x] 2026-08-13: Rewrote all item personality banks with a sharper roast tone
  and retired the generic corporate-meme voice.
- [x] 2026-08-13: Added a bottom shadow gutter to every carousel slide so card
  shadows render fully, then pulled pagination into that gutter for natural
  visual spacing.
- [x] 2026-08-13: Added an uncounted daily outro slide that invites users back
  tomorrow and loops cleanly into the next carousel cycle.
- [x] 2026-08-13: Preserved multi-order restaurant names as structured data and
  rendered them as a readable lineup on the card.
- [x] 2026-08-13: Added structured occurrence dates and date ranges to record,
  streak, repeat-basket, and restaurant-run cards.
- [x] 2026-08-13: Replaced the two-point crown story with a compact year-by-year
  champions timeline when at least three qualifying years are available.
- [x] 2026-08-13: Bounded long champions timelines to four visible rows, ordered
  them newest-first, and added a manual earlier-years scroll cue that pauses the
  outer carousel during interaction.
- [x] 2026-08-13: Replaced the generic repeat-basket price card with focused
  Foodflation cards for one identical order or repeated item, using named
  subjects and explicit earlier-to-recent pricing.
- [x] 2026-08-13: Replaced qualifying generic sauce totals with a top-three
  dipping-sauce podium, retained Uber customization choices on new imports,
  and counted each flavour at most once per order.
- [x] 2026-08-13: Simplified Alternate Universe to a direct amount-spent versus
  invested-value comparison, removing the redundant third gain row and
  repeated caveats.
- [x] 2026-08-13: Rebuilt ordering personality as a top-three complete-meal
  ranking with restaurant and repeat count.
- [x] 2026-08-13: Audited the rest of the catalogue for low-cost context. Added
  useful shares to favourite-day, peak-hour, and busiest-month cards; raw
  weekday/weekend counts; exact periods for late-night favourites and quiet
  streaks; and the average wait to accumulated-delivery-time cards. Cards that
  already expose their subject, magnitude, comparison, and occurrence period
  were intentionally left uncluttered.
- [x] 2026-08-13: Added a deterministic best-effort cooldown to daily editions.
  Catalogues with at least 21 eligible cards use three balanced groups and do
  not repeat a stat for two days; catalogues with 14–20 use two groups and do
  not repeat the previous day. Smaller catalogues keep serving seven cards and
  reuse only when necessary.
- [x] Implementation started.
- [x] Backend complete.
- [x] Frontend complete.
- [x] Cross-stack verification complete.
- [x] Implementation-side product readiness complete; user-owned Simulator and
  Emulator QA excluded.

## Definition of done

- [x] The API generates a broad, tested catalogue of existing and new
  candidates from persisted receipts.
- [x] Each eligible account receives up to seven strong, varied insights per
  local day.
- [x] The edition stays deterministic during the day and refreshes after data
  changes or local midnight.
- [x] Recent spending cards correctly combine preserved export history with
  newer Gmail receipts.
- [x] Item obsession cards show playful physical quantities directly while
  retaining the tracked-order sample size.
- [x] The app validates the full transport contract.
- [x] Users can swipe, understand their position, pause motion, and access all
  content with accessibility settings enabled.
- [x] Existing import, tracking, summary, and Wrapped flows remain correct.
- [x] API and app checks pass, and known deferred limitations remain documented.
- [x] Completion does not depend on physical iOS Simulator or Android Emulator
  testing; that QA is handed off to the user.
