# Wrapped Slideshow Improvement Plan

> Status: **Phases 1–4 complete** · Created 2026-07-20 · Phases 1–4 landed 2026-07-20
> Scope: full pass — correctness fixes, design overhaul, Reanimated port, new creative slides, share pipeline.

Source review covered:
- Player: `components/wrapped/WrappedShareJourney.tsx`
- Slides: `components/wrapped/buildWrappedSlides.tsx`
- Effects: `components/wrapped/WrappedSlideEffects.tsx`
- Theme/styles: `components/wrapped/wrappedTheme.ts`, `components/wrapped/wrappedStyles.ts`
- Archetypes: `utils/wrappedArchetype.ts` · Roasts: `utils/wrappedMessages.ts`
- Entry/loader: `app/(tabs)/wrapped-journey.tsx`, `components/wrapped/WrappedJourneyLoader.tsx`

## Decisions (locked)

| Question | Decision |
|---|---|
| Mascot artwork | Stay on `MascotPlaceholder` pose system for now; design layouts around it so final art (dumpling, green hoodie — see design-system.md) drops in later |
| Display font | **Yes** — **Fredoka** via `expo-font`, for hero numbers + archetype names |
| Profanity in roasts | **Tone down** — rewrite explicit lines ("fuck you", "oh fuck", …) keeping the bite; brand-safe shares, lower age rating |
| Scope | **Everything** — bugs + design + Reanimated port + new slides + share pipeline |
| Deck length | **Max 12 slides** — rank optional slides by signal intensity (reuse `wrappedArchetype.ts` scoring), drop the rest |
| Ambient audio | **Yes, in scope** — Wrapped-style background music + mute toggle |
| "All Time Stats" slide | **Cut** — duplicates The Damage + summary |

## Open questions

None outstanding — all resolved above.

---

## Phase 1 — Correctness & share pipeline

The share capture is the product's viral loop; it must never produce a broken image.

- [x] **Fix mid-animation share captures.** Entrance transforms/opacity live inside the live ViewShot (`WrappedShareJourney.tsx` ~line 340, 432). Always capture a second, *non-animated* off-screen render of the target slide (the hidden `shareTargetSlide` ViewShot pattern already does this for the upsell slide — generalize it to every slide).
- [x] **Story-sized export.** Captures are device-resolution today. Render the off-screen share view at fixed 1080×1920 (constants already stubbed in `wrappedTheme.ts:21-23`), so shares are crisp 9:16 on every device.
- [x] **Share pre-warming.** Capture the off-screen shot once the slide settles (~after count-up, ~1.2s) so the share sheet opens instantly.
- [x] **Surface share failures.** `handleShare`'s empty `catch {}` gives the user nothing on failure — add a toast + retry.
- [x] **Add "Save to Photos"** via `expo-media-library` alongside the share sheet.
- [x] **Fix hardcoded year.** `2025 Legend Status` in `buildWrappedSlides.tsx:587` — derive from the analytics window.
- [x] **Remove fabricated "Burgers" fave meal.** `buildWrappedSlides.tsx:571` invents data when none exists — hide the bento card instead.
- [x] **Fix defeated memoization.** Inline arrow props in `wrapped-journey.tsx:174-199` + `activeSlide` identity in the entrance `useLayoutEffect` deps re-fire animations/haptics on parent re-render. `useCallback` the handlers; key the effect on `currentSlide`/stable slide id.
- [x] **Locale consistency.** `formatDate` hardcodes `en-US` while currency respects `CurrencyContext`.
- [x] Minor cleanups: redundant mount reset of `currentSlide`; `progressAnim.setValue(0)` side effect inside `setCurrentSlide` updaters.

## Phase 2 — Color & design system overhaul

Goal: the deck reads as a **SnackTrack event skin**, not a generic template. See `docs/design-system.md` (Green Forest).

- [x] **New event palette in `wrappedTheme.ts`** — 4–5 gradients max, matched saturation/value so white text always passes contrast:
  - Brand-green anchor gradient (`#0E2A1F → #1F4E3A → #2E7D4F` family) for **intro + finale** slides (mascot on brand green = recognizable share).
  - Hot tones for *shame* section, cool tones for *flex*, warm for *patterns* — color carries narrative meaning.
  - Kill the pastels (`mango`, `mint`, `cotton`) or pair them with a per-gradient `ink` (dark text) token.
  - [x] Removed `hellofresh`; upsell now wears the brand `forest` gradient (competitor's brand green, currently on the upsell slide of all places).
- [x] **Vary gradient structure** — not every slide `[0, 0.52, 1]` on the same diagonal; vary angle, add radial glow behind hero numbers on key slides.
- [x] **Retheme the nebula background** (`WrappedSlideEffects.tsx:159+`): replace pure `#FF00CC/#00FFFF/#FFD700` with event-palette hues.
- [x] **Replace orphan hexes in bento cards** (`#FF9E6E #FEE140 #4FACFE #FF7F6A`, `buildWrappedSlides.tsx:535-580`) with event palette.
- [x] **Theme the confetti** — pass `colors` to `ConfettiCannon` (currently library-default rainbow).
- [x] **Fredoka display font** via `expo-font`: hero numbers, archetype name, slide titles. Add `fontVariant: ['tabular-nums']` to `bigNumber` (fixes count-up horizontal jitter).
- [x] **Reduce text-shadow dependence** — once backgrounds guarantee contrast, drop most shadows (muddy halo on light tones).
- [x] **Distinct roast style** — the punchline gets its own voice (italic / tilted sticker / bubble), not another bold white block.
- [x] **Mascot on (nearly) every slide** — placeholder poses per slide theme; demote 92px emoji to small accents. Layouts sized so final artwork drops in unchanged.
- [x] **Composition variety** — shipped as: oversized tilted "bleed" numbers on small-integer stats (3am Regret, Serial Orderer), the rotated roast sticker on every stat slide, radial hero glow on climactic slides, and emoji demoted to a mascot hip-badge. (A left-aligned layout variant was considered and skipped — the above already breaks the monotony.)
- [x] **Branded watermark** — small logo lockup + `@snacktrack`, not plain text.

## Phase 3 — UX & narrative

- [x] **Trim the deck** (currently up to 19 slides ≈ 2min+) to a hard **cap of 12**. Rank optional slides by signal intensity (reuse the scoring in `utils/wrappedArchetype.ts`), drop the lowest-signal ones once always-shown slides + top-ranked optional slides hit 12.
- [x] **Fix narrative order**: intro → stats (escalating) → "That's Your Year" → **archetype climax** → summary → upsell. **Cut "All Time Stats"** entirely (duplicates The Damage + summary); confetti reserved for the climax (not 3 consecutive slides).
- [x] **Archetype drumroll** — two-beat reveal: kicker holds ~1s, then name slams in with confetti + heavy haptic.
- [x] **Explicit "Share this card" button** on archetype + summary slides (top-right icon alone buries the CTA).
- [x] **Per-slide durations** — intro ~3s, dense slides (Waiting Time) longer, default 5–6.5s.
- [x] **Staged in-slide reveals** — title → number (count-up) → roast fades in ~400ms later.
- [x] **Tap zones**: right zone 65% (stories convention), kill the 30% center dead zone.
- [x] **Haptics on user navigation + celebration only** — not every auto-advance.
- [x] **Reduced-motion support** — `AccessibilityInfo.isReduceMotionEnabled()`: crossfade-only transitions, no confetti/nebula/spin.
- [x] **Screen-reader pass** — `accessibilityLabel`/`role` on tap zones, close/share buttons; announce slide content on change.
- [x] **Loader transition** — fade to the first slide's gradient (or brand green) instead of the white flash; kill/shorten the fixed 1.5s fake delay (`WrappedJourneyLoader.tsx`).

## Phase 4 — Performance (Reanimated port)

Reanimated 4 + gesture-handler are already installed but unused here.

- [x] **Port drag-to-dismiss** from PanResponder + `Animated.setValue` (JS thread, stutters under load) to gesture-handler + Reanimated worklets. (`GestureHandlerRootView` added at the app root in `app/_layout.tsx`.)
- [x] **Port entrance/progress animations** to Reanimated (shared values, UI-thread).
- [x] **Drop `key={currentSlide}` on the slide container** — the key moved from the full slide tree down to the inner content view, so gradient/glow/watermark shells stay mounted across transitions while per-slide effects (count-ups, staged reveals) still restart.
- [ ] *(manual QA)* Profile the nebula slide on low-end Android after retheme; don't add more `backgroundType: 'animated'` slides without checking overdraw.

## Phase 5 — Creative additions

- [ ] **Top 5 restaurants slide** (ranked list — the iconic Wrapped format; data exists in `analytics.topRestaurants`).
- [ ] **Personalized share cards** — first name + year + logo on the archetype card.
- [ ] **Month-by-month mini chart or spending heatmap slide** (follow `dataviz` conventions; one visual slide breaks the stat monotony).
- [ ] **Archetype rarity flavor** — "1 of N food personalities" collection framing.
- [ ] **Percentile framing** ("top 8% of night owls") — *needs backend aggregate support; check API feasibility first.*
- [ ] **Ambient audio** — Wrapped-style background music bed synced to slide progression, with a mute toggle in the chrome (persist preference). Needs `expo-av`/`expo-audio`; must respect device silent mode and pause on background/close. Source or license music.

## Phase 6 — Copy pass

- [ ] **De-profanity `utils/wrappedMessages.ts`** — rewrite explicit lines keeping tone ("You think you're better than me, fuck you." → equally bitter, swear-free). Full sweep of all tiers.
- [ ] Intro copy: "Your SnackTrack" → "Your SnackTrack Wrapped" (or year-branded title).
- [ ] Review roast tiers against updated deck order so escalation still lands.
- [ ] Update `__tests__/utils/wrappedMessages.test.ts` for rewritten strings.

## QA checklist (after each phase)

- [ ] Share capture correct: mid-entrance, mid-count-up, on every slide type, both platforms.
- [ ] Contrast: white text ≥ 4.5:1 on every gradient (or ink token applied).
- [ ] Small device (SE-class) + large device layout; text never clips.
- [ ] Reduced-motion mode plays cleanly.
- [ ] Deck with sparse data (few optional slides) still has a coherent arc.
- [ ] `wrappedMessages` + archetype tests green.
