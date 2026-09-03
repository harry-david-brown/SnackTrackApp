# Visual system and accessibility

## Canonical sources

- Use `SnackTrackApp/constants/theme.ts` for colors, radii, shadows, gradients, and semantic roles.
- Consult `SnackTrackApp/docs/design-system.md` for intent, but treat implemented theme tokens and shared primitives as executable truth.
- Use `SnackTrackApp/components/ui/AppAlertProvider.tsx` through the standard alert facade for branded alerts.

## Shared primitives

Prefer or introduce a small stable primitive when the same interaction appears across features:

- screen/container;
- card;
- primary and secondary button;
- icon button;
- status badge;
- section header;
- icon surface;
- modal/sheet;
- loading, error, and empty state.

Do not create a generic component merely to avoid a few repeated lines. Extract when behavior, accessibility, and design tokens should remain consistent across consumers.

## Styling rules

- Use semantic theme tokens rather than raw color values.
- Use canonical `Radius` and `Shadows` values instead of reproducing shadow objects per component.
- Keep feature-specific palettes derived from central tokens.
- Reserve inline styles for truly dynamic values such as animation transforms, measured sizes, or computed progress.
- Remove unused styles when replacing a UI path.
- Check Android elevation and iOS shadow appearance.
- Test long currency values, translated-length copy, small screens, and font scaling.

## Color roles and hierarchy

Palette membership is necessary but does not make a color appropriate for every component. Choose color by semantic role and visual weight:

- Keep forest green and warm neutrals dominant across ordinary app surfaces. Use the standard primary green for safe forward actions, including connection recovery and retry actions.
- Let a button's color describe the consequence of the action, not merely inherit the status of its surrounding card. A warning card can use orange accents while its safe recovery button remains primary green.
- Use warning orange and error red mainly for status copy, icons, borders, and tinted surfaces. Avoid large saturated status fills when a smaller accent communicates the state.
- Reserve red-filled controls for destructive, irreversible, or genuinely dangerous actions. Do not make routine recovery resemble deletion or failure.
- Reserve success colors for completed or healthy states; do not use them as a general substitute for the primary action color.
- Use provider colors only where provider identity is itself meaningful, such as approved provider-specific controls or instructions. Do not let external brand colors replace SnackTrack interaction roles.
- Treat each interactive treatment as a set: background, foreground, border, pressed, disabled, pending, and shadow colors must remain coherent when an accent is overridden.
- Preserve contrast and meaning without relying on color alone. Labels, icons, and copy must continue to identify warning, error, and success states.

## Interaction states

Every interactive control must define:

- normal;
- pressed;
- disabled;
- pending, when asynchronous;
- error recovery, when applicable.

Do not make a passive status card appear tappable. Do not make completion depend on color alone.

## Accessibility

- Set `accessibilityRole` on every custom interactive control.
- Provide concise labels when visible text is insufficient or content changes automatically.
- Set `accessibilityState` for disabled, selected, expanded, checked, and busy states.
- Ensure touch targets are approximately 44 by 44 points or use `hitSlop`.
- Respect system font scaling and avoid fixed heights that clip text.
- Preserve sufficient contrast for text, icons, borders, and status surfaces.
- Announce meaningful asynchronous completion or failure when the visual change may not be discovered.
- Support reduced motion and stop nonessential animation when the app is inactive.
- Provide a pause control for automatically changing content.

## Motion

- Animate content, not the entire shadowed card, when full-card opacity creates dark halos.
- Prefer subtle opacity or translation with short durations.
- Avoid simultaneous competing animations.
- Clean up loops and timers on unmount.
- Keep important content available without requiring animation.

## Modals and errors

- Use the standard branded alert for general confirmations and short failures.
- Use a feature modal or sheet only when it contains meaningful workflow UI.
- Keep one user action per primary button.
- Use the sad/error mascot for genuine failures where the established pattern calls for it.
- Do not expose raw API messages, stack details, file URIs, tokens, or provider payloads.
