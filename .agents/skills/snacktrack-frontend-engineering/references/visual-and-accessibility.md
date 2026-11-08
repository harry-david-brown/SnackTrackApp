# SnackTrack product visual language and accessibility

## Authority and intent

The canonical product reference is the root-level `snacktrack-ux-revision.html`. Review the relevant mobile screens and their scoped `.st-*` CSS before designing or changing UI. Ignore the surrounding Codex visualization viewer chrome.

The original mockup remains the visual foundation. Later explicit user decisions override it only within their stated scope. Record durable interaction decisions here so future work does not depend on a chat-only prototype. A prototype approval about motion does not approve its sample data, simplified screens, tab order, or other layout differences. Do not treat the latest implementation as proof that a design change was approved.

This reference defines the intended product language. `SnackTrackApp/constants/theme.ts`, `SnackTrackApp/docs/design-system.md`, and existing primitives may lag behind it. When they conflict:

1. preserve accessibility and platform correctness;
2. preserve the mockup's hierarchy and visual character;
3. update shared tokens or primitives so subsequent screens inherit the correction;
4. do not pull the new screen back toward the legacy UI merely to avoid changing a primitive.

The goal is warm, calm, clear, and lightly playful: a polished financial-history product with a friendly mascot, not a generic settings app or a loud gamified interface.

## Non-negotiable visual principles

- Give every page one dominant purpose and one obvious primary action.
- Create hierarchy with scale, spacing, grouping, and restrained color—not heavy bolding everywhere.
- Use warm canvas around crisp white surfaces. Let the interface breathe.
- Prefer one grouped surface with dividers over stacks of individually elevated cards.
- Reserve saturated or theatrical treatments for major heroes, Wrapped, and the deeper-stats finale.
- Use the mascot as a guide, reaction, or reward at deliberate hierarchy points. It is not persistent decoration.
- Keep operational terminology behind user-benefit language. Provider names appear when the user must choose or act on a provider.
- A match in colors alone is not visual fidelity. Typography, density, radii, surface grouping, imagery, and action placement must also match.

## Typography

### Families

- Use Inter for ordinary product UI. If it is unavailable on a platform, use the closest clean system sans while preserving metrics and hierarchy.
- Use Fredoka for expressive Wrapped and finale headlines. It is the React Native equivalent of the rounded display face used in the mockup.
- Do not use the display face for settings, body copy, buttons, data rows, or ordinary page headings.

### Weight

- `500` is the default emphasis weight: page headings, row titles, values, button labels, and active states.
- Use `400` for body and supporting copy.
- Use `600` sparingly when a loaded font needs slightly more presence in an expressive story headline.
- Avoid `700`, `800`, and `900` on ordinary screens. Dense extra-bold type is a legacy-app trait and changes the intended tone.
- Do not simulate hierarchy by making every label bold.

### Scale and rhythm

Use these as the target mobile metrics, allowing font scaling and content-driven height:

| Role | Size | Line height | Weight | Notes |
|---|---:|---:|---:|---|
| Eyebrow | 12 | 15 | 500 | Uppercase, `.09em` tracking, green; gold on the finale |
| Page title | 28 | 31 | 500 | `-.025em` tracking; usually one or two lines |
| Page body | 15 | 22 | 400 | Muted; roughly 9pt below title and 18pt below paragraph |
| Surface title | 16 | 20 | 500 | Compact, never oversized |
| Surface body | 13 | 18 | 400 | Muted |
| Row title | 14 | 18 | 500 | One strong label per row |
| Row metadata | 11–12 | 15–16 | 400 | Muted, 3pt below title |
| Section label | 12 | 15 | 500 | Uppercase, `.06em` tracking |
| Home greeting | 22 | 26 | 500 | Beside the mascot |
| Hero value | 31 | 34 | 500 | `-.03em` tracking |
| Wrapped headline | 34 | 36 | 500–600 | Fredoka; high contrast |
| Wrapped amount | 48 | 48 | 500 | `-.04em` tracking |
| Finale headline | 33 | 35 | 500–600 | Fredoka |
| Button label | 14 | 18 | 500 | Never all caps |
| Tab label | 10 | 13 | 500 | Icon above label |

Copy should wrap naturally. Do not impose fixed text heights. Test long names, currencies, localization-length copy, and the largest supported font sizes.

## Color system

### Ordinary light surfaces

| Role | Value |
|---|---|
| Canvas | `#FAF8F4` |
| Surface | `#FFFFFF` |
| Primary ink | `#222222` |
| Muted ink | `#6F756E` |
| Primary forest | `#356F4C` |
| Secondary/action green | `#438158` |
| Dark forest hero | `#173F30` |
| Selected/icon tint | `#E9F5E2` |
| Success/info tint | `#F1FAEF` / `#F7FAF7` |
| Divider | `#EAE8E2` |
| Strong choice border | `#D0D7DE` |

### Ordinary dark surfaces

| Role | Value |
|---|---|
| Canvas | `#101812` |
| Surface | `#17231D` |
| Primary ink | `#F8F6F1` |
| Muted ink | `#ABB8AF` |
| Primary text/accent green | `#A8D8B5` |
| Primary control green | `#75BB89` |
| Selected/icon tint | `#21392B` |
| Divider | `#2C3932` |
| Strong choice border | `#3C4B43` |
| Progress track | `#304139` |

### Special experiences

- Recap lagoon: `#0C333B` → `#146068` at about 55% → `#1F8E8A`. Dark alternative: `#081D22` → `#0E4248` → `#176B69`.
- Deeper-stats finale: `#100E2B` → `#28205C` at about 58% → `#8A6420`. Dark alternative: `#0B0A1F` → `#211A50` → `#6E4E15`.
- Finale gold: `#E6C26D`.
- Delayed/warning surface: `#FFF3E0` with `#8B4519`; dark: `#352719` with `#FFD5A5`.

Choose colors by role. Primary green is for safe forward action. Orange calls attention. Red is for failure or destructive consequence and should fill a button only when the action itself is destructive. Provider brand colors are identity accents only; they do not replace SnackTrack's action hierarchy.

Every custom treatment needs coherent normal, pressed, disabled, pending, and focus states. Preserve meaning without color alone.

## Spacing, width, and page rhythm

- Design against the 390pt reference width, then verify smaller and larger phones.
- Ordinary pages use about 18pt horizontal padding and 14pt top padding; use 14pt horizontal padding on narrow devices.
- Use the 4/8/10/12/14/16/18/20/24 spacing family. Avoid arbitrary 1–3pt differences except typography optical adjustments and dividers.
- A top row has a minimum 44pt interaction height even when its visible content is smaller. Leave about 8pt before the next element.
- Page titles generally follow: eyebrow → 5pt → title → 9pt → body → 18pt → content.
- Separate sibling surfaces by about 12pt. Use 19pt above section labels and 8pt below them.
- On full-screen journeys, let the content establish the story and anchor the action group toward the bottom with flexible space. Do not trap actions at a fixed coordinate that breaks with large text.
- Keep bottom-tab content clear of the safe area and tab bar.

## Shape and depth

Use a small, intentional radius ladder:

| Element | Radius |
|---|---:|
| Major surface, hero, coverage card | 24 |
| Compact stat / insight preview | 20 |
| Status card / delayed notice | 18 |
| Button / choice row | 16 |
| Back or icon action | 15 |
| Input / note / picker | 14 |
| Icon well | 10–14 |
| Profile hero | 22 |
| Chip, progress track, toggle | Full pill |

Main surfaces use a 1pt divider-colored border and a restrained shadow equivalent to `0 6 18 rgba(0,0,0,.05)` in light mode and `.18` in dark mode. Primary actions may use `0 3 10 rgba(31,78,58,.18)`. Translate these carefully to iOS shadow properties and Android elevation.

Do not elevate every row. Do not mix many radius sizes within one component. Do not use sharp rectangles inside otherwise soft layouts.

## Mascot system

### Role and pose

| Context | Pose |
|---|---|
| Setup and source/provider choice | Receipt/receipt-holding mascot |
| Import processing | Thinking mascot inside the progress ring |
| History ready and milestones | Celebration mascot |
| Home, Summary, You, fun examples | Sunglasses mascot |
| Genuine failure | Sad mascot, used sparingly |

Use a semantically equivalent pose only when the preferred art is unavailable. Add the artwork to the shared mascot map rather than creating screen-local asset logic.

### Scale

- Main setup hero: about 118×118pt with artwork optically scaled to roughly `1.18`.
- Compact setup/review art: about 86×86pt.
- Import ring artwork: about 96×96pt inside a 112pt core and 132pt outer ring.
- Recap hero: about 210×210pt with optical scale near `1.22`.
- Summary hero: about 104×104pt with optical scale near `1.3`.
- Home greeting: about 48×48pt with optical scale near `1.35`.
- You profile hero: about 58×58pt with optical scale near `1.3`.
- Finale preview: about 72×72pt in a 78pt media column.

Transparent artwork often contains internal whitespace, so use optical scale intentionally. Verify that limbs and props are not clipped. The mascot should reinforce the page hierarchy without competing with the title. Avoid using it in every card, duplicating it several times on an ordinary page, or exposing placeholder pose labels.

## Buttons and action hierarchy

- A page has one primary filled action. It is full width in setup and story journeys, at least 50pt tall, 16pt radius, 14/500 label, and green with white text.
- A secondary action is full width, white/surface filled, 1pt green border, green text, and the same geometry as the primary.
- A tertiary text action is at least 44pt tall, 13pt, centered when it follows full-width actions.
- On the finale, the primary action is gold with dark indigo text; “Finish for now” is a quiet text action.
- Back and icon-only controls are visually transparent but retain a 44×44pt target and about 15pt radius.
- Keep labels concrete and benefit-led. Avoid generic “Continue” when the outcome can be named.
- Pending state must retain the control width and communicate the specific active action. Prevent duplicate submission.

## Surfaces and grouping

- Standard surface: 16pt padding, 24pt radius, 1pt divider border, subtle shadow.
- Choice row: minimum 68pt, 11×12pt padding, 42pt icon well, 11pt gap, 16pt radius, trailing arrow/check column.
- Review row: 32pt icon well, 10pt gap, 11pt vertical padding. Group review rows in one surface with 1pt dividers.
- Settings/data row: 38pt icon well, 10pt gap, 10pt vertical padding, trailing 44pt action target. Group related rows in one surface.
- Receipt history: group rows inside one white surface; use separators, not a separate floating card per order.
- Compact status: 12×14pt padding, 18pt radius, a 34pt leading status mark, concise copy, and optional trailing 44pt action.
- Stat cards: two columns when content permits, 10pt gap, 14pt padding, 20pt radius.

Detailed component and screen recipes live in [mockup-pattern-library.md](mockup-pattern-library.md).

## Motion and feedback

The current direction is calm, tactile, and lightly playful. Everyday selections and navigation should feel continuous rather than abruptly snapping. Motion explains the change; it must not delay actions or become ambient decoration.

### Shared ownership

Use these existing app owners rather than introducing screen-local timing constants, duplicate system subscriptions, or alternate navigation animation layers:

| Owner | Responsibility |
|---|---|
| `constants/motion.ts` | Shared durations, easing, travel distance, and press scale. Current defaults are 110ms press, 260ms selection, 240ms content, 300ms tab transition, and 0.98 press scale; consume the tokens rather than copying these numbers. Native stack timing follows platform behavior. |
| `contexts/MotionContext.tsx` | `MotionProvider` and `useAppReducedMotion()`: start still until the system preference is known, respect live changes, and suppress motion while inactive. A late initial preference read must not overwrite a newer event. |
| `components/ui/AppButton.tsx` | Shared press/release feedback, including disabled and pending behavior. |
| `components/ui/AnimatedChoiceGroup.tsx` | Measured selection highlight, stable choice geometry, and selected accessibility state. |
| `components/ui/AnimatedDisclosure.tsx` | Content-measured opening and closing; collapsed content is not interactive or exposed to screen readers. |
| `app/(tabs)/_layout.tsx` and `app/_layout.tsx` | Tab and native-stack transition presentation. Imperative navigation remains owned by `features/navigation`. |

These primitives are implementation starting points, not evidence that every older screen has migrated. Reuse or improve them within the touched scope.

### Interaction decisions

- Filter selections move a highlight between measured choices. Reserve indicator space so selection does not change widths; accommodate wrapping, font scaling, and rotation. Update the selection and data request immediately, independently of animation completion.
- Result changes may use a short content reveal. Preserve list identity, selection, and scroll where appropriate; do not remount an entire screen just to replay animation. Keep loading, empty, error, and retry states truthful. Do not present old filter results as belonging to a newly selected provider.
- Expand and collapse details using measured content height, including the closing transition. Avoid fixed heights that clip larger text. Keep the expanded accessibility state aligned with the user's action.
- Keep press feedback small and immediate. Do not block another tap while a decorative animation finishes. Haptics remain a separate product choice; they are not required by this motion direction.
- For page transitions containing shadowed cards, use opaque translation rather than a whole-page crossfade. The tab implementation slides full-width opaque scenes with clipping at the page boundary; native stack pages use directional slides. Account for screen width and RTL direction.
- Never fade the entire shadowed card or an ancestor scene containing elevated surfaces: it blends outgoing and incoming shadows into halos or ghosting. Opacity is appropriate for internal content without those shadows. Read a navigator preset's actual interpolation before adopting it; a preset called “shift” can also fade.
- Avoid competing page and card entrance animations. Retarget or stop interrupted animations on quick selections, unmount, reduced-motion changes, and app inactivity. Restore final content instead of leaving it partially transparent or clipped.
- Reduced motion removes decorative movement without hiding content or changing data correctness timers. Keep touch and accessibility feedback available.
- Import progress may use the reference 2-second pulse from `1` to `1.025`; reduced motion removes the pulse without hiding state.
- Announce meaningful async stage changes, completion, and failure to screen readers.
- Do not auto-advance the recap-ready opening. Automatically changing story content must provide appropriate control.

## Accessibility and platform behavior

- Give every custom control an accessibility role, useful label, and the applicable disabled, selected, expanded, checked, or busy state.
- Maintain at least a 44×44pt target with layout or `hitSlop`.
- Respect safe areas, system font scaling, bold-text settings where applicable, screen readers, and reduced motion.
- Avoid fixed heights for copy-bearing controls; use minimum heights and content-driven growth.
- Preserve contrast for text, icons, dividers, tinted cards, gradients, and disabled states.
- Never communicate status by color or checkmark alone; pair it with text and accessibility state.
- Include iOS shadow and Android elevation in the device handoff; inspect each directly only when that verification is requested.
- Keep keyboard focus and traversal order aligned with the visible hierarchy.

## Visual review gate

For a UI change, review the matching canonical mockup and the recorded interaction decisions. Compare page padding, title wrapping, type weight, surface grouping, radii, mascot pose/scale, button order, bottom spacing, and transition treatment against the implementation. Correct shared tokens or primitives when a mismatch repeats and document intentional deviations.

Follow [testing-and-definition-of-done.md](testing-and-definition-of-done.md#verification) for verification ownership. Device and emulator checks belong to the user unless explicitly requested; do not launch them or block an ordinary implementation on screenshots. When screenshots or requested device inspection are available, compare at approximately 390pt width in light and dark modes. Include narrow phones, large text, screen readers, and reduced motion in the relevant manual handoff.

A type-check or browser prototype does not establish native animation quality. Report code verification separately from observed device behavior; shadow ghosting must be assessed during movement, not only in still screenshots.

Reject the implementation when it merely contains the same words and colors but retains legacy heavy type, dense card stacks, small mascot art, modal-first flows, inconsistent rounding, or weak action hierarchy.
