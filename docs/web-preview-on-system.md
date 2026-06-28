# Sandbox vibe loop — keep it on-system

> Companion checklist for the rule
> `.claude/rules/web-preview-on-system-required.md`. The rule says *why*; this doc
> says *how*. Read it before editing UI that the designer will vibe on the web
> preview ("sandbox").

## The loop (and the trap)

The designer vibes by chatting with Claude Code directly — "Sửa Home: card to
hơn, bo góc nhiều hơn, tên in đậm" → **"sandbox đi"** → a URL → they look
(`docs/designer-quickstart.md`). It's fast and **ungated** — no Figma extraction,
no qa-ui Compare, no step-6.5 designer gate.

The trap: it's tempting to satisfy the *look* fast with raw values
(`backgroundColor: '#FF6B6B'`, a `TouchableOpacity` "button", `duration: 300`).
That UI vibes fine, gets approved — then fails the gates at PR and gets rebuilt.
**A vibe-edit is not a mock. Build it on-system the first time** so the approved
sandbox == the PR.

## On-system checklist (do this every vibe-edit)

- [ ] **Colors** → `ds.color` / `src/theme/theme.ts`. No raw hex. (`design-system/color-rules.md`)
- [ ] **Spacing / radius / shadow / z-index** → tokens, 4px grid. No magic numbers. (`design-system/design-system.md`)
- [ ] **Controls** → an `M*` primitive from `src/components/design-system/lib`. No hand-rolled `Pressable`/`TextInput`/`Switch`/`Modal` when an `M*` exists. (`.claude/rules/design-system-primitives-required.md`)
- [ ] **Motion** → a `motion.ts` token; open/close asymmetry; reduce-motion fallback. No literal durations. (`design-system/motion-rules.md`)
- [ ] **Header / footer / safe-area** → canonical components, not hand-rolled. (`design-system/header-footer-rules.md`)
- [ ] **Cross-screen** → match sibling screens; no one-off card/pill/CTA.
- [ ] **Honest vibe** → it renders on `react-native-web`; if you used a native-only effect that won't show on web, tell the designer.

## Common vibe requests → the on-system way

| Designer says | Off-system (don't) | On-system (do) |
|---|---|---|
| "card to hơn / thưa ra" | hardcode `padding: 22`, `margin: 13` | spacing tokens on the 4px grid |
| "bo góc nhiều hơn" | `borderRadius: 18` | a radius token from `theme.ts` |
| "đổi màu nút / nền" | `'#FF6B6B'`, `'#222'` | `ds.color.*` semantic token |
| "thêm nút / ô nhập / switch" | `TouchableOpacity` / raw `TextInput` / raw `Switch` | `MButton` / `MInput` / `MSwitch` from the lib |
| "popup / sheet xác nhận" | bespoke `Modal` | `MDialog` / `MBottomSheet` |
| "chip / badge / tag" | hand-styled `View` + `Text` | `MChip` / `MBadge` |
| "cho nó mượt / có animation" | `duration: 300` inline | a `motion.ts` token (+ reduce-motion) |
| "tên outfit in đậm" | inline `fontWeight: '700'` + raw font | a typography token / `theme.ts` family |
| "header / nút dưới cùng" | hand-rolled bar | canonical `Header` / sticky-CTA + safe-area |

If no `M*` or token fits the ask, that's a real signal — add the token to
`theme.ts` (or flag the missing primitive) rather than hardcoding. When unsure
which token, check a sibling screen that already does it.

## Web-fidelity gotchas (so the vibe is honest)

`react-native-web` renders ~95% like native (`docs/web-review-architecture.md`).
These diverge — verify, and warn the designer if a change leans on them:

- **Blur** — native-only; the web stub flattens it. A frosted look won't read on web.
- **Shadow** — RN `shadow*` vs web `boxShadow` differ; check it actually shows.
- **Gestures** — swipe/long-press feel differs in a browser.
- **Fonts** — web uses `@font-face` (`web/fonts.css`); a family missing there
  falls back. Use theme families, not arbitrary ones.

Using tokens + `M*` is the safest path here too — the primitives already handle
these the same way on both targets.

## Before "sandbox đi" (pre-deploy)

```bash
# from the umbrella root
./scripts/auxi-lint-tokens.sh          # hex + font drift — must be clean

cd auxi
./scripts/auxi-lint-ds-primitives.sh   # raw-control usage (warn-mode now)
yarn web:build                         # must succeed — else the sandbox won't load
```

A clean lint + a green `web:build` means the deploy serves on-system UI on a
working preview — the designer vibes on the real thing, not drift or a blank page.

## Shipping for real

The sandbox never ships itself (`docs/designer-quickstart.md` → "đưa lên app
thật"). When the vibe is right, it still goes through a reviewed PR — where the
qa-ui Compare and the step-6.5 designer gate run. Because the vibe-edit was
on-system from the start, that's a sign-off, not a rebuild.

## See also

- `.claude/rules/web-preview-on-system-required.md` — the rule
- `docs/designer-quickstart.md` — the designer's 2-step flow
- `docs/web-review-architecture.md` — how the web preview is built
- `docs/design-system/` — color / motion / header-footer / design-system rules
- `src/components/design-system/lib/index.ts` — the `M*` barrel
