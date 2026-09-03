# SnackTrack Design System — Green Forest Theme (v1.0)

The mascot (buff dumpling) is the centerpiece of the brand; the UI supports it
rather than competes with it. Tokens live in `constants/theme.ts` — import from
there instead of hardcoding hex values in new code.

## Testing a palette

All application color values live in the `Palette` object in
`constants/theme.ts`. Change that object to test a new palette; screens,
components, charts, provider treatments, and Wrapped gradients consume those
values through semantic `Colors` tokens.

Run `npm run check:theme` after styling changes. The check fails when a raw hex,
RGB/RGBA, `white`, `black`, or `transparent` color is introduced outside the
central theme.

## Brand colors

| Token | Hex | Use |
|---|---|---|
| Primary | `#356F4C` | Navigation, headers, active icons, primary buttons, logo, graph highlights |
| Primary hover | `#3E7954` | Primary button hover |
| Primary pressed | `#2A5F41` | Primary button pressed |
| Secondary | `#438158` | Hover states, secondary buttons, icons, progress bars, graphs |
| Accent | `#73B84A` | CTAs, budget remaining, highlights, streaks — avoid overusing |
| Success | `#58C26D` | Success states ONLY (messages, checkmarks, goals achieved) |

## Semantic color roles

Color roles describe meaning as well as palette membership. Forest green and
warm neutrals should dominate normal app surfaces; saturated status colors
should usually remain accents.

- **Primary green**: safe forward actions, including connect, reconnect, retry,
  continue, and save actions.
- **Warning orange**: attention states, normally expressed through labels,
  icons, borders, and pale warning surfaces.
- **Error red**: failures and destructive consequences. Reserve red-filled
  buttons for actions that are themselves destructive or dangerous.
- **Success green**: completed and healthy states, not a general-purpose CTA
  substitute.
- **Provider colors**: provider identity only, where that identity is useful to
  the interaction or instructions.

The surrounding card's status does not automatically determine its button
color. A warning or error card can keep its semantic accents while a safe
recovery action uses the standard primary button. When overriding a component
color, keep its foreground, border, pressed, disabled, pending, and shadow
treatment coherent. Avoid large saturated status fills when a smaller accent
communicates the state clearly.

## Mascot colors (artwork only)

| Token | Hex | Use |
|---|---|---|
| Dumpling highlight | `#FFE8C6` | Mascot skin only |
| Dumpling shadow | `#F6D9A8` | Mascot shadows only |
| Outline | `#333333` | Mascot outlines; sparingly for illustrations |

## Neutrals

| Token | Hex | Use |
|---|---|---|
| Background | `#FAF8F4` | Default app background |
| Surface | `#FFFFFF` | Cards, sheets, dialogs |
| Divider | `#EAE8E2` | Borders, separators, table lines |
| Primary text | `#222222` | Headings, dollar amounts, nav labels |
| Secondary text | `#6F756E` | Labels, captions, dates, metadata |

## Chart palette (highest → neutral)

`#356F4C` → `#438158` → `#5EA15D` → `#88C34A` → `#D8E2D7` (unused portions)

## Components

- **Primary button**: bg `#356F4C`, white text. Hover `#3E7954`, pressed `#2A5F41`.
- **Secondary button**: white bg, `#438158` border, `#356F4C` text.
- **Chips**: active `#E9F5E2` bg / `#356F4C` text; inactive `#F3F3F3` / `#666666`.
- **Progress**: fill `#438158`, track `#E5E5E5`.
- **Toggles**: on `#58C26D`, off `#D5D5D5`, white knob. Checkbox checked `#438158`.
- **Alerts**: success `#F1FAEF` bg / `#58C26D` border+icon; info `#F7FAF7` / `#438158`.

## Corner radius

Cards 24 · Buttons 16 · Inputs 14 · Charts 24 · FAB 999

## Shadows

- Cards: `0 6px 18px rgba(0,0,0,0.06)`
- Buttons: `0 3px 10px rgba(31,78,58,0.18)`
- FAB: `0 8px 24px rgba(31,78,58,0.22)`

## Mascot usage

The mascot should celebrate milestones, react to budgets, comment on spending,
congratulate streaks, and appear in onboarding. Avoid placing it on every
screen — it is a reward and guide, not persistent decoration.

While final art is in production, `components/mascot/MascotPlaceholder.tsx`
marks every mascot position with its required pose. The `MascotPose` type in
that file is the canonical list of poses to commission. Current placements:

| Surface | Pose | Variant |
|---|---|---|
| Onboarding hero | `flex` | outline (on gradient) |
| Login header (logo) | `neutral` | filled |
| Dashboard header (logo) | `neutral` | filled, no label |
| Dashboard export-upsell card | `prop-receipt` | filled |
| Empty states (`EmptyState`, wrapped empty) | `pointing` | filled |
| Gmail import modal — importing | `thinking` | filled |
| Gmail import modal — success | `celebrate` | filled |
| Wrapped loader | `thinking` | outline |
| Wrapped: opening slide | `wave` | outline |
| Wrapped: The Damage | `shocked` | outline |
| Wrapped: 3am Regret | `sleepy` | outline |
| Wrapped: Serial Orderer | `sheepish` | outline |
| Wrapped: Coffee Addiction | `prop-coffee` | outline |
| Wrapped: Investment You Didn't Make | `prop-piggy-bank` | outline |
| Wrapped: closing slide | `celebrate` | outline |
| Wrapped: All Time Stats | `flex` | outline |
| Wrapped: archetype reveal | `sunglasses` | outline |
| Crash screen (`ErrorBoundary`) | `sad` | filled |
| Share graphic header | `sunglasses` | outline, no label |

Third-party brand colors (Uber `#06C167`, DoorDash `#FF3000`) are intentionally
kept for provider-specific buttons and tutorials.

## Overall feel

Combine the cleanliness of Apple Wallet, Headspace, Duolingo, Spotify Wrapped,
and Monarch Money while remaining unmistakably SnackTrack: greens, warm
neutrals, and the dumpling. Wrapped slide gradients intentionally stay vivid
and multi-colored for share appeal — the mascot outline variant carries the
brand there.
