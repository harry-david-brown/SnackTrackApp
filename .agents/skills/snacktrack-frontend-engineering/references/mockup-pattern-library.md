# SnackTrack mockup pattern library

Read this reference for any visual implementation or review. It translates the canonical `snacktrack-ux-revision.html` into reusable React Native patterns. Values are target proportions, not instructions to clip content.

## Core primitives

### Full-screen journey

- Warm canvas; safe-area-aware column; approximately 18pt horizontal padding.
- Optional 44pt top-row actions, then progress, illustration, eyebrow, title, and supporting copy.
- Let primary content scroll if necessary while the action group follows it or rests toward the bottom through flexible space.
- No tab bar during mandatory setup, imports, provider guidance, or Wrapped.
- Use this for setup, email review, provider selection/instructions, import progress, delayed state, failures, and zero/small-history recovery.

### Ordinary tab page

- Warm canvas behind page content.
- Eyebrow, 28pt title, short muted description when the page needs orientation.
- Put a hero or the primary data object before management controls.
- Group related rows into one surface; introduce groups with restrained uppercase section labels.
- Four-tab bar: 1pt top divider, surface background, roughly 46pt minimum tab content, 18pt icon over 10pt label. Active state is green; inactive is muted.

### Progress

- Setup progress uses three 5pt pill segments with 6pt gaps. Completed/current segments are green; future segments use a quiet track.
- Wrapped uses five 3pt story bars with 4pt gaps and translucent inactive tracks.
- Do not use progress decoration if the product cannot explain what it represents.

### Import stage ring

- 132pt outer conic/animated progress treatment; 112pt pale-green core; 96pt thinking mascot.
- The visual may be indeterminate, but checklist completion must come from durable API milestones.
- Checklist is a simple list on the page, not another heavy white card. Use copy plus icon/state: pending muted, current ink/500, complete green.

### Hero cards

- Spend/Summary heroes use a green gradient from primary/action green toward dark forest, white text, 24pt radius, and about 16–17pt padding.
- Use a small uppercase or muted label, a 31pt medium-weight value, then compact metadata.
- Summary may place sunglasses mascot art on the trailing side; preserve copy width and avoid clipping the art.

### Grouped rows

- Use one 24pt surface for a related set.
- Rows have generous touch behavior but compact visible density.
- Use dividers only between rows; do not box every row.
- Leading icon wells use pale green, 10–14pt rounding, and green icons.
- Keep trailing chevrons/actions visually quiet and at least 44pt tappable.

## Page recipes

### Quick Setup: recommended path first

Composition:

1. Receipt mascot as the visual anchor.
2. `QUICK SETUP` eyebrow.
3. “Let’s build your first SnackTrack.”
4. One-sentence explanation.
5. Three-segment progress.
6. Stronger green-tinted recommended email choice with “Recommended · usually takes 2–3 minutes.”
7. Muted `ANOTHER OPTION` label.
8. Quieter neutral history-download choice.
9. Plain-language access/privacy footnote.

Do not present both paths with equal weight. Do not add a deferral action. Do not use provider names until needed.

### Mail provider choice

- Reuse the setup composition rather than opening a small modal.
- Keep Gmail and Outlook as two clear choice rows with provider identity contained to the icon/label.
- Retain a visible back action and setup progress.

### Email review

Composition:

1. Back action and step label.
2. Setup progress.
3. Compact receipt mascot.
4. Provider-connected eyebrow.
5. “Ready to find your orders?”
6. “One-time receipt scan” surface containing three review rows: find supported receipts, build your stats, stay in control.
7. “Find my orders” primary action.
8. “Choose another method” secondary action.

The screen is a consent/review moment, not a technical status page. Avoid “Review your email scan” and “Scan Gmail.”

### Detailed-history value path

Use separate full pages for:

1. “Get the full picture” value explanation.
2. “Where do most of your orders live?” provider choice.
3. Provider-specific guided steps.

Provider chooser rows belong together in one surface. The guide uses one surface with numbered rows: request history, wait for the ready message, bring it back to SnackTrack. Show provider terminology only after selection. Preserve file selection, request recording, notifications, screenshots, and recovery without turning the page into a task dashboard.

### Building your history

- Center the import ring and thinking mascot in the upper-middle of the page.
- Use `BUILDING YOUR HISTORY`, a direct stage headline, and the 2–3 minute reassurance.
- Place the live checklist below with comfortable spacing.
- Put a quiet security/reassurance note near the bottom.
- No modal chrome, close action, navigation distractions, ads, fake percentage, or tab bar.

### Delayed import

- Keep a centered mascot-led composition.
- Use `STILL WORKING` and “This is taking longer than usual.”
- Add one 18pt-radius amber reassurance surface.
- Bottom actions: notification opt-in as primary, “Explore SnackTrack” as secondary.
- Never show an exact estimate without validated confidence.

### Recap-ready opening

- Fill the screen with the lagoon gradient; ordinary canvas and card chrome disappear.
- Story bars sit at the top.
- Use `YOUR HISTORY IS READY`, a dynamic medium-weight Fredoka headline such as “47 orders. One honest recap.”, concise white supporting copy, and a large celebration mascot.
- Bottom area contains a quiet “Tap through your personalized recap” hint and white “Start my recap” button.
- Do not start timers, music, or auto-advance before the CTA.

### Summary

Composition:

1. `YOUR SNACKTRACK` eyebrow, page title, and concise description.
2. Green all-time-spend hero with sunglasses mascot.
3. Two compact stat cards.
4. One surface inviting the user to replay the fun version.
5. Filled “Play my recap” action and outlined “View order history” action.
6. Optional eligible fee insights below the primary composition.

This page is stable and analytical; the recap is an optional expressive layer.

### Deeper-stats finale

- It is a full story slide, not a modal over the closing screen.
- Use the indigo-to-gold gradient, gold eyebrow, 33pt Fredoka headline, and muted-white body.
- Stack three glassy preview rows: about 78pt media column, 72pt mascot/example art, 12pt padding, 20pt radius, translucent white fill and border.
- Preview delivery-fee change, menu soulmate/item behavior, and delivery records with truthful evidence-aware copy.
- Anchor a gold “Unlock deeper stats” primary action near the bottom and use “Finish for now” as a text action.

### Data & tracking

Composition:

1. Back/top context, `DATA & TRACKING`, title, and short description.
2. Dark-forest coverage hero with order count, date range, and translucent status pill.
3. `HISTORY SOURCES` group with compact email and detailed-history rows.
4. `AUTOMATIC UPDATES` group with “Keep my stats current” and a 44×26pt toggle.
5. Tertiary privacy/data-use action.

Put active, delayed, failed, or reconnect status above coverage only when it needs attention. Keep disconnect, reset, notification, and provider detail in focused child screens rather than crowding this overview.

### Home

Use this fixed hierarchy:

1. 48pt sunglasses mascot beside a 22pt greeting and short context line.
2. Current-month spend hero.
3. `WHAT WE NOTICED` label and one editorial insight surface.
4. Two compact stats.
5. Eligible native ad.
6. One compact data-status card with the single best next action.

Value comes before management. Only critical import or reconnect failure may move above insights, and it suppresses advertising.

### History

Composition:

1. `YOUR ORDERS` eyebrow, “History” title, concise explanation.
2. The original reference shows compact pill filters with provider chips visible by default. The current implementation instead uses search plus an expandable filter panel and collapsed active-filter chips. This placement difference is unresolved; a motion-only task must preserve the current placement rather than silently restore the reference or declare the newer layout approved. Resolve it explicitly when History layout is in scope.
3. Orders grouped in one white 24pt surface with dividers, 44pt logo/avatar column, muted metadata, and right-aligned totals.
4. Compact coverage/status link to Data & tracking.

Use the shared animated choice group for provider/date/activity selections and measured disclosures for inline order details. The interaction prototype demonstrated motion; it did not require replacing inline details with a separate order-detail route. See [visual-and-accessibility.md](visual-and-accessibility.md#motion-and-feedback) for shared ownership and transition rules.

Insert a compact ad only after the fifth visible order in the unfiltered default list and never between a group heading and its first order.

### You

Composition:

1. `ACCOUNT` eyebrow, “You” title, concise description.
2. 22pt-radius profile hero with 58pt sunglasses mascot, identity, order count, and tracked spend.
3. `YOUR SNACKTRACK` grouped surface: Order history, Data & tracking, Currency.
4. `SUPPORT` grouped surface led by Help & privacy.
5. Lower-frequency notifications, logout, reset, and deletion below the primary hierarchy without duplicating management controls.

## Native ad treatment

- Ads borrow spacing and radius discipline so they sit cleanly in the feed, but must remain unmistakably advertising.
- Keep `Sponsored` visible and preserve AdChoices.
- Do not let the whole card masquerade as a SnackTrack insight or status surface.
- Reserve the placement-specific height while loading to prevent layout shift; collapse after definitive failure and do not retry in that session.
- Home uses the fuller card between stats and data status. History uses a compact inline treatment after the fifth visible order.
- Never place ads in setup, import, Wrapped, the finale, Summary hero, errors, empty states, filtered History, Data & tracking, or account/privacy flows.

## Common visual failure modes

Reject or revise UI that:

- uses 700–900 weight throughout ordinary pages;
- shrinks the mascot until it reads like an icon or repeats it as decoration;
- replaces full-screen setup/import journeys with generic modals;
- renders every item as its own shadowed card;
- gives recommended and secondary actions equal emphasis;
- uses too many saturated greens or provider colors;
- uses radius values inconsistently or keeps legacy squared controls;
- places actions directly after content when the reference anchors them lower on the journey;
- retains the correct copy but misses the reference spacing and typography;
- clips at large text because mockup heights were copied as fixed heights;
- invents percentages, timers, or completion checkmarks not supported by product state.

## Implementation checklist

- Identify the page archetype before composing it.
- Reuse or correct shared tokens for type, canvas, surface, border, radius, and shadow.
- Use semantic primitives for journey pages, surfaces, buttons, grouped rows, status cards, and progress.
- Choose the mascot pose and target optical size deliberately.
- Keep only one primary action in the current decision context.
- Implement loading, empty, success, failure, retry, disabled, and large-text behavior.
- Compare a screenshot against the canonical screen at approximately 390pt width.
- Explain every deliberate departure from the reference in the handoff.
