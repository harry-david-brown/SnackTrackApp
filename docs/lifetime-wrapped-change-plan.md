# Lifetime Wrapped Change Plan

> Status: **In progress — first implementation slice landed locally 2026-07-21**
> Created: 2026-07-21
> Product direction: Launch a deliberately provocative, lifetime-first Wrapped experience. Add a separate yearly experience later.

## Goal

Turn the existing slideshow into a clearly labeled **lifetime delivery audit** that:

- uses all receipt data currently available to SnackTrack;
- **states its actual data coverage rather than implying total omniscience**;
- tells a coherent story from lifetime totals to habits to personality;
- feels specific, audacious, and polarizing enough to prompt conversation and sharing;
- keeps the archetype reveal as the emotional and shareable climax;
- distinguishes behavioral roasting from attacks involving health, poverty, appearance, or identity; and
- establishes a scope-aware foundation so yearly Wrapped can be added without another slideshow rewrite.

## Decisions (locked 2026-07-21)

| Question | Decision |
|---|---|
| Data-coverage framing | **State the real window.** Cold open names actual coverage ("312 imported orders. March 2023–July 2026."). Copy always describes the data in SnackTrack; an export expands the stated coverage but never upgrades it to a claim of completeness. |
| Feature name | **"The Lifetime Damage"**, but the displayed title is **tiered by lifetime spend** (see Phase 1). Baseline/product name stays "The Lifetime Damage". |
| Category taxonomy | **Split** `extreme-moment` and `pattern` into separate categories → **10-slide deck**. Within each category, pick the candidate that is *most shocking for that user's data*. |
| Percentiles | **Keep and expand them, but gate them conservatively.** Never display a percentile until its qualifying production cohort contains at least 100 users. Preserve the system for future restaurant, menu-item, timing, and behavioral comparisons. |
| Tone targets | **Add a `tone` tag** to messages so the 45/25/20/10 distribution is measurable and CI-enforceable. |
| Archetype exit | **"Done" button that doubles as the post-deck offer transition** — the promo becomes a user choice, not an interruption. |
| Repeat value | **Track repeat-view metrics**; keep yearly deferred. Known tradeoff, measured before committing to yearly. |

## Success criteria

- [x] No visible copy implies that the lifetime deck covers only the current year.
- [x] No visible copy claims that SnackTrack's data is exhaustive or extends beyond the stated imported coverage window.
- [x] Every statistic in the deck is either lifetime-scoped or explicitly labeled otherwise.
- [x] A rich-data deck contains no more than **10** slides before any post-deck promotion.
- [x] Optional slides are selected by editorial category, not by one global intensity ranking.
- [x] Within each category, the selected slide is the strongest candidate for that user's data.
- [x] Closely related slides cannot appear together in the same deck.
- [x] The archetype is the final slideshow segment, does not auto-advance, and offers an explicit exit.
- [x] Share images clearly identify themselves as lifetime results.
- [x] Sparse-data and rich-data users both receive a complete narrative arc.
- [x] The message tone distribution is measurable and within target.
- [ ] Existing share, save, navigation, reduced-motion, and accessibility behavior remains functional.
- [ ] The deck passes the tone, layout, unit, and device QA checklists in this document.

## Non-goals for this release

- [ ] Do not add a yearly Wrapped deck yet.
- [ ] Do not mix yearly and lifetime statistics in the lifetime deck.
- [ ] Do not redesign the core player, gesture system, share renderer, or animation engine unless required by the new order.
- [ ] Do not replace the mascot placeholder artwork as part of this change.
- [ ] Do not add a second yearly archetype yet.

## Target narrative

```text
what we actually reviewed
  -> scale of spending
  -> financial perspective
  -> behaviour over time
  -> favourite places
  -> signature habit
  -> recurring pattern
  -> most extreme moment
  -> evidence reviewed
  -> lifetime personality
```

Habit → pattern → extreme escalates deliberately, so the wildest single moment lands immediately before the reveal setup.

### Target slide order

| Position | Slide | Category | Scope and behavior |
|---|---|---|---|
| 1 | Cold Open | `headline` | Establish what SnackTrack actually reviewed: order count + coverage window. |
| 2 | The Lifetime Damage | `headline` | Lifetime spend, lifetime orders, percentile when the pool is credible. Title tiered by spend. |
| 3 | Financial Perspective | `perspective` | One of Could Have Bought, Missed Investment, Delivery Tax. |
| 4 | The Damage Over Time | `trend` | Recent monthly trend against the lifetime total; requires sufficient monthly data. |
| 5 | Your Top 5 Spots | `places` | Lifetime restaurant ranking; requires ≥3 restaurants. Positive/reset beat. |
| 6 | Signature Habit | `habit` | One of The Caffeine Economy, Chain Dependency, Single-Item Orders. |
| 7 | Signature Pattern | `pattern` | One of Peak Hunger Hour, Weekend/Weekday Warrior. |
| 8 | Most Unhinged Moment | `extreme-moment` | One of 3am Regret, Laziest Day, Longest Streak, Bougie Moment. |
| 9 | The Case Is Closed | `transition` | Short reveal setup; **no repeated totals** or dense details. |
| 10 | All-Time Food Personality | `identity` | Final archetype, traits, lifetime headline, confetti, share CTA, Done button. |

Slides 3–8 are conditional. A sparse deck should collapse cleanly without displaying empty or low-confidence material.

## Product decisions

- [x] Launch with lifetime scope only.
- [x] Keep a provocative, roast-forward product voice.
- [x] Keep the archetype based on lifetime data.
- [x] Keep the archetype as the primary shareable artifact.
- [x] Defer yearly statistics to a later, separately scoped deck.
- [x] Feature name: **The Lifetime Damage** (displayed title tiered by spend).
- [ ] Approve the spend-tier title copy (draft table in Phase 1).
- [ ] Approve the final cold-open copy.
- [ ] Approve the final transition and reveal-setup copy.

## Phase 1 — Make lifetime scope explicit and honest

### Coverage-aware framing

The export upsell exists because Gmail imports miss older orders. Neither Gmail nor an uploaded provider export proves that SnackTrack contains every delivery order the user has ever made.

- [x] Derive a **coverage descriptor** from the receipt set: earliest receipt date and total order count.
- [x] Cold open states real coverage — e.g. `312 imported orders. March 2023–July 2026.` — rather than claiming an exhaustive history.
- [x] Use "what you've imported" phrasing wherever scope is described.
- [x] When an export has been uploaded, acknowledge the stronger source without claiming completeness — e.g. `Includes your uploaded Uber export.`
- [x] Treat `hasCompletedExport` as an export/upsell state only, not as proof that the user's historical coverage is exhaustive.
- [x] Expose the coverage state so copy, a11y, and share images all agree.
- [ ] Re-check the deck after an import completes so the framing updates rather than going stale.

### Dynamic title (tiered by lifetime spend)

Deterministic, derived from lifetime spend, reusing the tier thresholds already in `utils/wrappedMessages.ts`.

| Lifetime spend | Draft title | Needs approval |
|---|---|---|
| `< $1,500` | The Lifetime Receipt | [ ] |
| `$1,500 – $4,999` | The Lifetime Damage | [ ] |
| `$5,000 – $19,999` | The Lifetime Damage | [ ] |
| `$20,000+` | The Lifetime Catastrophe | [ ] |

- [ ] Implement the tier resolver as a pure, unit-testable function.
- [ ] Use the resolved title consistently across intro, share card, and a11y announcements.
- [ ] Keep "The Lifetime Damage" as the product/store-facing name regardless of displayed tier.

### Slide copy

- [x] Remove the current-year badge from the intro.
- [x] Replace `Your SnackTrack Wrapped` with the stable baseline title pending approval of tiered variants.
- [x] Replace `Let's see your entire food delivery history...` with the coverage-stating cold open.
- [x] Remove the optional `This Year` slide from the lifetime deck.
- [x] Rename `Month by Month` to `The Damage Over Time` or the approved equivalent.
- [x] Replace `your year in spending` with lifetime-compatible language.
- [x] Rename `That's Your Year` to `The Case Is Closed` or the approved equivalent.
- [x] Remove repeated order and spending totals from the reveal-setup slide.
- [x] Replace the reveal setup with a short line such as `We reviewed the evidence. The pattern is undeniable.`
- [x] Replace `{year} Wrapped` on the archetype card with `LIFETIME` / `ALL TIME`.
  - The card currently derives its year from `spentThisYear.year`; with `This Year` cut, **no year source is needed** — the label is scope, not date.
- [x] Label the archetype as `Your all-time food personality`.
- [x] Update all screen-reader announcements to use the same lifetime framing.

### Supporting UI

- [x] Add a reusable `LIFETIME` / `ALL TIME` scope treatment for relevant live slides.
- [x] Ensure the scope treatment is included in captured share images.
- [ ] Verify the scope treatment remains legible on every story gradient.
- [x] Remove `userName + year` assumptions from the share-card header while retaining optional name personalization.

## Phase 2 — Replace global ranking with editorial selection

### Slide metadata

- [x] Give every optional slide a stable `id`.
- [x] Add an editorial category to every optional slide.
- [x] Add a scope field to the slide model, beginning with `lifetime`.
- [x] Preserve an intensity or interest score for selecting within a category.
- [x] Add a confidence value or minimum-data rule where a single weak event would produce a misleading slide.
- [ ] **Separate slide selection from React rendering** so selection rules can be unit tested without inspecting JSX. (`buildWrappedSlides` currently builds JSX inline — split into a pure `selectSlides(analytics) -> SlideSpec[]` and a renderer.)

Suggested types:

```ts
type AnalyticsScope =
  | { kind: 'lifetime' }
  | { kind: 'year'; year: number };

type SlideCategory =
  | 'headline'
  | 'perspective'
  | 'trend'
  | 'places'
  | 'habit'
  | 'pattern'          // recurring behaviour: peak hour, weekend/weekday
  | 'extreme-moment'   // one-off outliers: 3am, laziest day, streak, priciest
  | 'transition'
  | 'identity';
```

### Category selection

- [x] Always include the cold open, lifetime damage, reveal setup, and archetype.
- [x] Choose at most one financial-perspective slide.
- [x] Choose at most one signature-habit slide.
- [x] Choose at most one recurring-pattern slide.
- [x] Choose at most one extreme-moment slide.
- [x] Within every category, select the candidate **most shocking for that user's data** (highest intensity/confidence), not a fixed default.
- [x] Include the spending timeline only when at least three useful months exist.
- [x] Include Top 5 only when at least three meaningful restaurant records exist.
- [x] Cap the deck at **10** slides before promotions.
- [x] Preserve the target category order regardless of each slide's intensity.
- [x] Use intensity only to select the strongest candidate within a category.
- [ ] **Recalibrate intensity divisors per category.** Scores only need to be comparable *within* a category now, so the current hand-tuned cross-metric divisors (`count/20`, `days/14`, raw percentages) can be tightened to their own scales.

### De-duplication rules

- [x] Do not show both `3am Regret` and `Night Owl Badge`.
- [x] Do not show both `Could Have Bought` and `The Investment You Didn't Make`.
- [x] Do not show both `Delivery Tax` and `Could Have Bought` (both are "money wasted on overhead"). *Covered by the single-`perspective` rule.*
- [ ] Do not show multiple slides whose primary punchline is the same lifetime spending total.
- [ ] Avoid a Chain Dependency slide immediately followed by a Top 5 dominated by the same chain.
- [x] Avoid a Caffeine Economy slide when it is supported by too few orders to feel like a real pattern.
- [x] Avoid a percentile pill when its cohort fails the eligibility rules in Phase 7 (single source of truth for the threshold).

### Selection tests (land with this phase, not Phase 9)

Extracting selection from JSX is only worth it if the tests arrive with it.

- [ ] Test the exact core lifetime order.
- [ ] Test a rich dataset produces no more than 10 slides.
- [ ] Test a sparse dataset still reaches the archetype without empty slides.
- [x] Test each editorial category contributes at most one optional slide.
- [x] Test all currently implemented de-duplication pairs.
- [x] Test the strongest candidate wins within its category.
- [x] Test category order does not change when candidate intensity changes.
- [ ] Test the export upsell is absent from the slideshow deck.

## Phase 3 — Reorder and retime the deck

- [x] Build the deck using the target narrative order rather than ascending global intensity.
- [x] Reduce the intro duration to approximately 2.5–3 seconds.
- [ ] Use approximately 5–6.5 seconds for simple stat slides.
- [x] Retain longer durations for the chart and Top 5 where needed.
- [x] Keep the reveal setup short enough to function as a drumroll rather than another information slide.
- [x] Keep the archetype on screen until the user shares, closes, or taps Done.
- [x] Verify that tapping backward and forward preserves the intended chapter order.
- [x] Verify the progress rail never contains more than 10 lifetime-story segments.

## Phase 4 — Move promotion outside the emotional climax

The archetype's **Done button doubles as the offer transition**, so the promo reads as a user choice.

- [x] Remove the export upsell from the slideshow's progress segments.
- [x] Stop the archetype from auto-advancing into the export upsell.
- [x] Add an explicit **Done / Continue** button to the archetype alongside the share CTA.
- [x] Tapping Continue presents the post-deck offer (sheet or post-deck screen), not another deck slide.
- [x] Users who already completed a full export get a plain Done that closes the deck — no offer.
- [x] Preserve `markSeen`, `markClicked`, `dismiss`, and completion tracking.
- [x] Ensure dismissing the post-deck offer returns the user to the expected tab.
- [x] Ensure the X and swipe-down still exit directly without the offer.

## Phase 5 — Polarizing copy pass

### Voice principles

- [ ] Prefer an exact behavior over a generic insult.
- [ ] Let the number or repeated action deliver the punchline whenever possible.
- [ ] Roast choices and receipts rather than appearance, protected identity, health, or presumed financial status.
- [ ] Balance the deck with moments of disbelief, strange admiration, and celebration.
- [x] Keep deterministic messages and their tone stable for the same underlying dataset.

### Tone tagging (makes the distribution enforceable)

- [x] Add a `tone` field to the message model: `roast | disbelief | impressive | celebration`.
- [x] Tag every existing message and expose the selected tone alongside its text.
- [x] Add a test asserting the distribution is within tolerance of target.
- [x] Add a test guard so every catalogue entry carries a supported tone.

Target tonal distribution:

- approximately 45% roast;
- approximately 25% disbelief;
- approximately 20% strangely impressive; and
- approximately 10% celebration.

### Copy inventory

- [ ] Review every `totalDamage` message tier.
- [ ] Review every late-night and habit message tier.
- [ ] Review every financial-comparison message tier.
- [x] Review every archetype name, tagline, and trait label; replace the body-coded `The Whale` with `The Delivery Magnate`.
- [ ] Review medicalized, financial-status, and body-directed lines surgically without flattening the catalogue's shock value, tone, or humor.
- [ ] Replace generic aggression with data-specific lines where the required values are available.
- [x] Verify every placeholder still interpolates correctly.
- [x] Verify deterministic selection never returns an empty message.
- [ ] Review share-card copy separately because it can leave the app's private context.

Example direction:

```text
Weaker: You have a problem.
Stronger: You paid a delivery fee for one iced coffee 14 times.

Weaker: This is financial irresponsibility.
Stronger: You turned "I don't feel like cooking" into a five-figure expense.
```

### Dead-code cleanup

Cutting `This Year`, the reveal-setup totals, and unselected slides orphans a lot of copy.

- [ ] Remove message tiers for slides no longer reachable in the lifetime deck.
- [ ] Remove archetype traits and styles left unused after the reorder.
- [ ] Confirm `utils/wrappedMessages.ts` contains no unreachable categories.

## Phase 6 — Visual and motion direction

- [ ] Keep the forest gradient as the lifetime brand anchor.
- [ ] Use deeper indigo/gold treatments to give lifetime results a `hall of fame` feeling.
- [ ] Preserve hot colors for high-impact roast slides and cool colors for flex/pattern slides.
- [ ] **Restore colour-by-category**: the narrative order now drives sequence, so gradients can once again carry section meaning (the old global intensity sort had scrambled this).
- [ ] Ensure no two adjacent slides share a gradient or mascot pose.
- [ ] Add at least one additional composition that breaks the mascot-title-number-detail-roast template.
- [ ] Consider a split comparison layout for financial perspective.
- [ ] Consider a receipt or evidence layout for the extreme-moment slide.
- [ ] Use a minimal typographic layout for `The Case Is Closed`.
- [ ] Assign entrance animations by narrative role rather than by slide index.
- [ ] Reserve the strongest slam, heavy haptic, glow, and confetti for the archetype.
- [ ] Preserve the reduced-motion equivalent for every new treatment.

## Phase 7 — Analytics and credibility

- [ ] Confirm every lifetime slide uses all applicable receipt data currently available to SnackTrack.
- [ ] Document which providers or receipt types are excluded from each metric.
- [ ] Define minimum sample sizes for coffee, chain, timing, and other inferred habits.
- [ ] Confirm Top 5 aggregation normalizes restaurant naming consistently.
- [ ] Confirm the timeline communicates that it displays recent months while the headline totals remain lifetime.
- [ ] Confirm imported historical gaps do not produce claims that imply exhaustive coverage (see Phase 1 coverage framing).

### Percentiles

Keeping percentiles because they have strong potential beyond broad spend and order counts—for example, restaurant loyalty, specific menu items, ordering times, delivery-fee behavior, and other recognizable habits. The cohort gate does the credibility work silently.

#### Display rules

- [x] Keep percentile pills in the lifetime deck.
- [x] **Never display the sample size** — surfacing "of 8 users" advertises that the comparison is meaningless.
- [x] Raise `PERCENTILE_MIN_SAMPLE` from 5 to **100 qualifying users** before displaying any percentile. *(Production-account filtering remains below.)*
- [x] Return no percentile when the current broad cohort contains fewer than 100 users.
- [ ] Gate every percentile metric independently; a sufficiently large spending cohort must not automatically enable a thin menu-item cohort.
- [ ] Add minimum occurrence rules for specific-item percentiles so one accidental purchase cannot create a ranking.
- [ ] Define stable metric identifiers and cohort rules so new restaurant, menu-item, timing, and behavioral percentiles can be added without changing slide rendering.
- [ ] Revisit the threshold and cohort definitions as the user base and available metrics grow; changing them should only hide or reveal pills, never break the deck.

#### Cohort eligibility

- [ ] Exclude seed, test, staff, and otherwise non-production accounts from percentile cohorts.
- [ ] **Add an account-type / internal flag to `users`** — no such column exists today (schema is `id, email, password, email_verified, gmail_*, timezone, created_at, updated_at`), so "exclude non-production accounts" is currently unimplementable.
- [ ] Backfill the flag for existing accounts and filter every cohort query on it.
- [ ] Continue requiring each cohort member to meet the metric's minimum data requirements.
- [ ] Remove the dev seed users (`wrapped-seed-*@example.dev`) before any coverage measurement — cleanup SQL is in `docs/wrapped-slideshow-improvements.md`.

#### Computation strategy

The expanded metric set cannot be computed per request. `calculatePercentiles` today runs a full `GROUP BY user_id` over the entire `receipts` table with window functions on **every** Wrapped request — acceptable at small scale, but restaurant-, item-, and timing-level percentiles multiply it, and item-level requires unnesting the `items` JSONB across every user's full history.

- [ ] Decide where cohort statistics are computed: materialized view, scheduled aggregation job, or summary table.
- [ ] Move percentile reads off the per-request path so the Wrapped endpoint reads precomputed stats only.
- [ ] Define refresh cadence and acceptable staleness for cohort statistics.
- [ ] Confirm cohort computation cost scales with the number of metrics, not with request volume.

#### Validation and privacy

- [ ] Provide a staging cohort or internal override so the ≥100 path can be exercised before the production base reaches 100 — its first real render should not be its first test.
- [ ] Cohort statistics are **aggregate-only**: a percentile must never expose another user's receipts, items, restaurants, or identity.

## Phase 8 — Future yearly readiness

These tasks establish boundaries now; they do not ship the yearly deck.

- [x] Introduce the `AnalyticsScope` model at the analytics/deck boundary.
- [ ] Make analytics date-window parameters explicit rather than implicit.
- [ ] Keep lifetime and yearly cache keys separate.
- [ ] Include scope in request-deduplication keys.
- [ ] Include scope in share-image cache keys and filenames.
- [x] Ensure every slide exposes its scope to copy and accessibility helpers.
- [x] Avoid embedding `new Date().getFullYear()` inside lifetime slide construction.
- [ ] Add a placeholder product note describing how a future yearly entry point will coexist with the lifetime deck.
- [ ] Decide whether `spentThisYear` should still be computed server-side while unused by the lifetime deck.

## Phase 9 — Remaining tests

*(Selection and ordering tests live in Phase 2.)*

### Copy and scope

- [ ] Test that no lifetime slide contains the current year as annual framing.
- [ ] Test that `This Year` and `That's Your Year` are absent.
- [ ] Test that the archetype announces itself as all-time/lifetime.
- [ ] Test that the share card includes lifetime scope.
- [ ] Test that all accessibility announcements match visible scope.
- [ ] Test the spend-tier title resolver at every threshold boundary.
- [ ] Test that export coverage framing acknowledges the export without ever claiming exhaustive history.
- [ ] Test that every percentile remains hidden with 99 or fewer qualifying production users and appears at 100.
- [ ] Test that percentile cohorts exclude seed/test accounts and apply metric-specific eligibility rules.
- [ ] Test that percentile reads come from precomputed cohort statistics rather than per-request aggregation.
- [x] Test the tone distribution stays within target tolerance.
- [ ] Decide whether a narrowly scoped prohibited-copy guard can preserve the approved shock-heavy voice.

### Player behavior

- [ ] Test the archetype does not auto-advance.
- [ ] Test Done presents the post-deck offer, and skips it for completed-export users.
- [ ] Test hold-to-pause and resume after the reordered deck.
- [ ] Test backward navigation from the archetype.
- [ ] Test share and save target the active lifetime slide.
- [ ] Test reduced-motion navigation through the entire deck.

## Manual QA checklist

### Narrative

- [ ] Rich-data deck feels like one story rather than a collection of unrelated stats.
- [ ] No adjacent slides repeat the same fact or punchline.
- [ ] The deck alternates pressure, recognition, and relief.
- [ ] Top 5 provides a positive/reset beat before the final roast sequence.
- [ ] Habit → pattern → extreme escalates rather than feeling repetitive.
- [ ] The reveal setup increases anticipation without repeating statistics.
- [ ] The archetype feels like the unmistakable ending.

### Devices and accessibility

- [ ] iPhone SE-class layout has no clipping.
- [ ] Large iPhone layout remains visually balanced.
- [ ] Small Android layout has no clipping or unsafe-area overlap.
- [ ] Large Android layout remains visually balanced.
- [ ] Archetype card fits with headline, traits, share CTA, and Done button on the smallest supported screen.
- [ ] Screen readers announce scope, statistic, and punchline in a sensible order.
- [ ] Reduced-motion mode avoids spins, confetti, and aggressive transitions.
- [ ] Text and controls maintain sufficient contrast on every gradient.

### Sharing

- [ ] Every shareable slide captures correctly before, during, and after its live entrance animation.
- [ ] Exported images are 1080x1920.
- [ ] Lifetime label appears in the exported artifact.
- [ ] Watermark and handle remain legible.
- [ ] Long restaurant, item, and archetype names do not clip.
- [ ] Share and Save failures offer actionable retry feedback.

## Rollout and measurement

- [ ] Add analytics for slideshow start, completion, slide exits, archetype reached, share tapped, share completed, save completed, and post-deck offer actions.
- [ ] Include slide id and deck position in slide-view analytics without logging sensitive receipt details.
- [ ] Record generated deck length and selected category ids.
- [ ] Record the resolved spend tier and coverage state.
- [ ] **Track repeat views per user** — the known weakness of a lifetime-only deck is that it barely changes between viewings. This is the signal that decides whether yearly gets built.
- [ ] Establish baseline completion and sharing rates before rollout.
- [ ] Decide whether the lifetime deck will launch behind a feature flag.
- [ ] Test internally with low-, medium-, and high-volume receipt histories.
- [ ] Conduct a copy review with people outside the implementation team.
- [ ] Release to a limited cohort if feature-flag infrastructure permits.
- [ ] Review completion, skip, share, complaint, and deletion signals before full rollout.

## Known tradeoffs

- **Repeat engagement.** A lifetime deck lacks the annual ritual that makes yearly Wrapped inherently re-playable. Accepted for launch; measured via repeat-view metrics above.
- **Content left on the floor.** One slide per category means several strong candidates go unused per deck. Mitigated by picking the most shocking candidate per user, so unused slides still surface for *someone*.
- **Percentiles ship invisible.** With a 100-qualifying-user gate, *no* user sees a percentile until the production base reaches 100 per metric. This is deliberate, but it means the feature is built and released without being visible — plan for it rather than treating it as a bug report.

## Definition of done

- [ ] All success criteria are checked.
- [ ] All automated tests pass.
- [ ] Manual QA passes on at least one small and one large iOS device profile.
- [ ] Manual QA passes on at least one small and one large Android device profile.
- [ ] Product approves the tiered titles, cold open, transition, archetype framing, and post-deck promotion.
- [ ] Copy review approves every message tier and archetype.
- [ ] Analytics events are verified in a non-production environment.
- [ ] No unreachable copy or styles remain from the previous deck.
- [ ] The completed change is documented in `docs/wrapped-slideshow-improvements.md` or a release note.

## Primary implementation files

- `components/wrapped/buildWrappedSlides.tsx`
- `components/wrapped/wrappedSlideSelection.ts`
- `components/wrapped/WrappedShareJourney.tsx`
- `components/wrapped/wrappedTheme.ts`
- `components/wrapped/wrappedStyles.ts`
- `components/wrapped/WrappedSlideEffects.tsx`
- `components/wrapped/MonthlySpendChart.tsx`
- `utils/wrappedMessages.ts`
- `utils/wrappedArchetype.ts`
- `types/api.ts`
- `app/(tabs)/wrapped-journey.tsx`
- `hooks/useExportUpsell.ts`
- `__tests__/utils/wrappedMessages.test.ts`
- `__tests__/utils/wrappedSlideSelection.test.ts`
- `SnackTrackAPI/src/services/analytics/WrappedAnalyticsService.ts`
- `SnackTrackAPI/src/services/analytics/WrappedAnalyticsTypes.ts`
