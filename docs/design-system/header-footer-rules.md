# Header / footer / layout rules

> Canonical chrome patterns for the Auxi RN app: the top `Header`, the app-level
> push-drawer, and the footer / sticky-CTA conventions. Grounded in the real
> components — `auxi/src/components/layout/Header.tsx`, `RootDrawer.tsx`,
> `SidebarMenu.tsx`, `Sidebar.tsx`. The `designer` agent checks this at
> design-review lens 4.

---

## 1. Header — `Header.tsx` (canonical)

Every standard screen header is `components/layout/Header.tsx`. Do not hand-roll
a one-off header bar.

| Spec | Value (from `Header.tsx`) |
|---|---|
| Height | **76px** (`styles.container.height: 76`) |
| Layout | `flexDirection: row` · `space-between` · `alignItems: center` |
| Horizontal padding | `paddingHorizontal: 22` *(legacy off-grid literal — known, don't copy into new code)* |
| Background | `theme.colors.figmaBackground` (`#f2efec` = `ds.color.cream`) — matches screen bg |
| Left slot | `width: 45`, flex-start — back/hamburger via `TopIconButton`; default glyph is a 3-line hamburger (24×18, lines 2px `figmaButton`) |
| Center slot | `flex: 1`, centered — title in `playfairDisplaySection` (Playfair Medium 24/32), color `figmaAction` |
| Right slot | `width: 45`, flex-end — `rightComponent` or default `Icons.User` (24×24) in a 32×32 hit target |

Rules for a new screen:
- Reuse `<Header>`; pass `title` / `showBack` / `leftIcon` / `rightComponent`.
  Don't fork the file or inline a custom bar.
- The header sits at z-index tier `sticky` (100) when it overlays scroll content.
- Title is **center**, left is nav (back/menu), right is the user/contextual
  action. A header that puts the title left, or stacks two right-side icons
  where the pattern is one, is a MAJOR consistency finding.

---

## 2. Drawer — the push pattern (`RootDrawer` + `SidebarMenu`)

The app uses an **app-level PUSH drawer**, not an overlay drawer. `RootDrawer`
is the host; the entire app content is **pushed right** to *reveal* the dark
menu behind it. **There is no dim scrim** — content stays bright (per Figma
`2852:26393` and `docs/Z_INDEX_LAYERING.md` §4.1: overlays live at one root
host, not per-screen).

| Spec | Value | Source |
|---|---|---|
| Menu width | **317px** (`SIDEBAR_WIDTH`) | `SidebarMenu.tsx:18`, `RootDrawer.tsx:20` |
| Push distance | `min(317, SCREEN_W − 88)` — leaves an 88px tappable peek of content | `RootDrawer.tsx:22` |
| **Open** | `motion.duration.medium` (350) + `motion.easing.enter` | `RootDrawer.tsx:40-42` |
| **Close** | `motion.duration.normal` (250) + `motion.easing.exit` | `RootDrawer.tsx:40-42` |
| Open chrome | content gets `borderRadius: 18`, shadow (offset `-4,0`, opacity 0.2, radius 16, elevation 12) | `RootDrawer.tsx:111-119` |
| Tap-to-close | full-bleed `Pressable` catcher over content while revealed | `RootDrawer.tsx:79-86` |
| Menu bg | `uacBackgroundBase` `#1d1f23` (dark) | `SidebarMenu.tsx:177` |
| Menu layout | `justify: space-between` — "See my outfits" pill on top, menu rows anchored bottom; rows 48px tall, active row = white pill, dark text | `SidebarMenu.tsx` |
| Menu divider | `figmaDividerOnDark` `rgba(242,239,236,0.1)` (cream@10%, Black/10% is invisible on dark) | `SidebarMenu.tsx:207` |

> `Sidebar.tsx` is the **legacy overlay drawer** (slide-in panel + 0.5 dim
> backdrop, same 317px width, open `medium`+`enter` / close `normal`+`exit`).
> The current app chrome is the `RootDrawer` push pattern. New work targets the
> push pattern; don't reintroduce a per-screen overlay drawer.

The open/close timing here is the same house asymmetry as `motion-rules.md` §2 —
a new drawer/sheet must follow it.

---

## 3. Footer — there is no bottom tab-bar today

The app is **native-stack** (`@react-navigation/native-stack`), navigated via
the push-drawer menu — **there is no persistent bottom tab-bar.** Don't add one
speculatively. Today "footer" means two things:

### 3a. Bottom safe-area
Any screen with scroll content or a bottom-anchored control must respect the
bottom safe-area inset (`useSafeAreaInsets().bottom`) so content/CTAs clear the
home indicator. `SidebarMenu.tsx:85` is the worked example
(`paddingBottom: insets.bottom + 24`). A new bottom-anchored control that
hardcodes a bottom pad and collides with the home indicator is a MAJOR finding.

### 3b. Sticky-CTA pattern
A bottom-pinned primary action (the common "footer") sits at z-index tier
`sticky` (100), above scroll content, clearing the bottom safe-area. Where it
overlays scrolling content, the house treatment is a **backdrop blur** —
`@react-native-community/blur` `BlurView blurType="light" blurAmount={8}` under a
`figmaBlurTintWhite80` (`rgba(255,255,255,0.8)`) tint — with
`figmaItemDetailHeaderBg` (`rgba(255,255,255,0.9)`) as the reduced-transparency
a11y fallback. The CTA itself uses the primary-button tokens (`ds.color.ink`
fill, `ds.radius.md` 16, label `cream`/`white`).

### 3c. Rules a FUTURE bottom nav MUST follow
If the CEO ever introduces a bottom tab-bar, it must:
- Sit at z-index tier `sticky` (100) — never `modal`/`toast`.
- Clear the bottom safe-area inset (no hardcoded bottom pad).
- Use the active-pill treatment already established for the drawer rows
  (active = filled pill, e.g. `figmaFooterActivePill` `#eee6df`; inactive =
  transparent), so it reads consistently with existing chrome.
- Animate selection with `motion` tokens (`scale.select` 1.03 / `fast` 120),
  not ad-hoc timings.
- Be defined once at a root host (like `RootDrawer`), not re-mounted per screen.

Until that ticket exists, **a new bottom tab-bar in a PR is out-of-pattern** →
escalate to CEO (taste/scope call), don't silently approve.

---

## 4. Severity at design-review (lens 4)

| Finding | Severity |
|---|---|
| Hand-rolled header instead of `<Header>` | MAJOR |
| Drawer/sheet open=close timing, or wrong enter/exit easing | MAJOR |
| Bottom control ignores safe-area inset (collides with home indicator) | MAJOR |
| Sticky CTA missing the blur/tint treatment where it overlays scroll | MINOR–MAJOR (per visual weight) |
| Off-pattern bottom tab-bar introduced without a ticket | ESCALATE → CEO |
| Header right-slot icon count / title alignment drift vs siblings | MAJOR (consistency) |
