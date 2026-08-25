# Bottom sheets

One rule above all others:

> **A bottom sheet is always as wide as the screen.**
> Edge-to-edge panel, docked to the bottom edge, top corners rounded only.
> No side gutters, no `maxWidth`, no centred card.

A sheet inset from the screen edges reads as a *different component* sitting
next to the app's other sheets — which is exactly what the informational
limit sheets ("See on me" / wardrobe items / enhance photo) looked like while
they rode the design-system floating card (8px gutter per side; flagged in
`docs/qa-findings/2026-08-14-figma-audit-au-442-paywall-mvp.md`).

## Which shell to use

| Shell | Use it for | Notes |
| --- | --- | --- |
| `components/features/ContextualBottomSheet` | **Everything on a real screen** — confirms, pickers, informational sheets, paywall/limit sheets | The canonical shell: RN `Modal`, scrim, "Refine suggestions" reveal motion (page behind scales via `BackgroundScaleContext`), swipe-to-dismiss, reduce-motion, home-indicator inset, `${testID}-backdrop` |
| `components/design-system/lib/MBottomSheet` | Inline / in-container overlays (the design-system gallery stages) | Same width contract; renders into the nearest positioned parent instead of a `Modal`, with the DS spring motion |

Everything else — `OutfitLimitSheet`, `ContextChipsModal`, `MoodFeedbackSheet`,
`TemperatureOverrideSheet`, `FeedbackSheet`, `PinConfirmModal` — predates the
shared shell but already honours the width contract. New sheets should not add
to that list: build on `ContextualBottomSheet`.

## Writing a sheet

```tsx
export const MySheet: React.FC<Props> = ({ visible, onDismiss }) => (
  <ContextualBottomSheet visible={visible} onDismiss={onDismiss} testID="my-sheet">
    <Text style={styles.title}>{t('my.title')}</Text>
    <MButton variant="primary" onPress={onDismiss} testID="my-sheet-dismiss">
      {t('common.gotIt')}
    </MButton>
  </ContextualBottomSheet>
);
```

- The shell owns the panel: width, radius, scrim, motion, safe-area, horizontal
  padding (16) and top padding. Your file supplies **content only**.
- Don't re-pad horizontally in the content — you'd inset it twice.
- Every interactive element still needs a `testID` (and an `accessibilityLabel`
  where the label isn't visible text) — see `CLAUDE.md`.
- Navigating away on dismiss? Let the close animation settle first
  (`motion.duration.normal` for this shell) — see
  `useUsageLimitGate.dismissThenNavigate`.

## The guard

`src/components/__tests__/bottom-sheet-full-width.test.ts` statically scans
every `StyleSheet.create` under `src/`, picks out the bottom-sheet panel styles
(sheet-ish name, or a bottom-docked top-rounded surface) and fails the build if
one declares `width` other than `'100%'`, a `maxWidth`, a horizontal margin, or
`alignSelf: 'center'`.

If it fires on a sheet you just wrote: **don't narrow the panel** — move the
padding onto the content. If it fires on a style that isn't a sheet panel, the
name heuristic caught a false positive; rename the style rather than loosening
the check.
