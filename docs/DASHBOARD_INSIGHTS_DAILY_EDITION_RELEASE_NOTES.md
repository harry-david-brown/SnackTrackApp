# Dashboard Insights Daily Edition — Release Notes

## What changed

- “What we noticed” now serves up to seven strong observations per user-local
  day instead of a weekly, top-restaurants-first rotation.
- Daily editions now use a best-effort cooldown: users with at least 21
  eligible observations will not see the same stat for two days, while users
  with 14–20 avoid next-day repeats. Smaller catalogues continue filling the
  edition instead of showing empty slots.
- New observations cover recent spending movement, restaurant eras and
  streaks, repeated baskets, physical item totals, delivery behaviour,
  ordering streaks, and an illustrative 7% investment counterfactual.
- “Alternate Universe” now reduces that counterfactual to a direct
  **You spent → You'd have** comparison, with the fixed-return assumption and
  playful disclaimer kept as short supporting context.
- “Your ordering personality” now earns its space with a ranked top three of
  the user's most common complete orders, including restaurant and repeat
  count, instead of leading with abstract restaurant and one-off totals.
- Single-item obsession cards now rotate family-specific punchlines, including
  caffeine devotion, nugget empires, crispy potato portfolios, and strategic
  sauce reserves.
- Sauce-heavy histories now replace the generic sauce total with a dipping-sauce
  podium. Flavours are ranked by the number of tracked orders they appeared in,
  with each flavour counted at most once per order to resist flattened Uber
  customization duplicates.
- Uber customization choices are retained on new export imports so generic
  rows such as “Dipping Sauce” can resolve to Creamy Garlic, Hot Mustard,
  Blackened Ranch, and other actual flavours. Previously imported histories
  need to be uploaded again to gain this richer ranking.
- Item personalities are powered by one extensible profile registry. It ships
  with 18 common item types and a generic fallback for frequently repeated menu
  items that do not yet have a bespoke profile.
- Item totals are treated as canonical in the experience; personality copy
  commits to the joke rather than qualifying or defending the calculation.
- Item punchlines use a shorter, edgier roast voice and avoid generic phrases
  about “economies,” “legacies,” “agendas,” and “well-documented” habits.
- The section is natively swipeable, shows position and progress, pauses after
  interaction, respects reduced motion, and exposes accessible navigation.
- Carousel slides reserve enough space for the full card shadow, preventing it
  from being clipped above the position indicator.
- A distinct, uncounted final slide closes each edition and invites users back
  tomorrow before autoplay loops to the first stat.
- Multi-order-day cards show each restaurant on its own readable row instead
  of collapsing the lineup into one comma-separated sentence, with numbered
  badges making the sequence easy to scan.
- Record and streak cards show when the pattern occurred, using a single date
  for one-day moments and a date range for runs such as tunnel vision.
- Late-night favourites and delivery-free streaks now carry the exact period
  in which they happened. Day, hour, month, weekend, and accumulated-wait
  cards add percentages, raw comparison counts, or averages where those make
  the headline number easier to interpret.
- “Foodflation” cards now name one identical order or repeated item and show
  its earlier price flowing into its recent price, plus the exact dollar change.
  Meal and item comparisons are separate candidates rather than one generic
  repeat-order claim.
- Users with at least three qualifying years get a compact taste timeline with
  every year’s champion, order count, preserved ties, and a “so far” label for
  the current year. Longer histories open newest-first in a four-row scrolling
  window with a subtle earlier-years cue. Two-year histories retain the simpler
  crown-change card.
- Insights now come from a dedicated, versioned API edition that expires at
  local midnight and is invalidated whenever receipt-derived data changes.

## Retained limitations

- Uber export customization-row reconstruction remains deferred in
  `SnackTrackAPI/docs/UBER_EXPORT_ITEM_RECONSTRUCTION.md`. Item cards present
  their totals directly and retain only the tracked-order sample size.
- Historical receipt currency is not persisted. Currency conversion and mixed-
  currency histories remain outside this release.
- The investment card uses a fixed 7% annual return from each order date. It
  is a playful counterfactual, not financial advice.
- Physical iOS Simulator and Android Emulator QA is explicitly user-owned and
  is not a completion gate for this implementation task.

## Automated verification

- API build and complete regression suite.
- App type-check, lint, theme-token validation, and complete Jest suite.
- Privacy-safe in-memory catalogue and daily-rotation review using both supplied
  Uber exports; no personal archive or identifying row was committed.

## Development testing

- Development builds show a **Dev Day Traveller** above “What we noticed.” Use
  the back, Today, and forward controls to preview up to 365 future local-day
  editions.
- Future previews are separate query entries and bypass the API's shared daily
  cache. The preview parameter is rejected when the API runs in production.
