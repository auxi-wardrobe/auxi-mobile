# Design Review — Notification "Reset to default setting" link + undo toast (AU-316)

**Date**: 2026-06-20
**Reviewer**: designer (system-proxy hard gate, step 6.5)
**Type**: step-6.5 PR gate (HARD GATE)
**Build**: worktree `au316-notification-settings` · branch `duc2820/au-316-uac-daily-outfit-notification-settings` · HEAD `c5474692`
**Scope under review**: ONE addition in `src/screens/SettingsScreen.tsx` — a notification-scoped "Reset to default setting" text link (`testID settings-notification-reset`) under the Daily-Time time row, restoring `DEFAULT_SETTINGS.dailyNotification` with a bottom tap-to-undo snackbar. Plus i18n keys (en/vi/fr) and one schedule-change tracking event.
**Device/MCP**: iPhone 16 Pro sim booted, WDA up on :8100, mcp-doctor **exit 0**. Live render of THIS change **DEFERRED** — running sim build does not contain the AU-316 code (it was on an unrelated pin-confirm modal), and the documented cold-launch toolchain blocker (Xcode 26.5 ↔ RN 0.83.1) prevents a fresh build of this branch onto the sim. Verdict grounded in code + the four design-system docs + `theme.ts`/`motion.ts`.

---

## VERDICT: PASS

No BLOCKER, no MAJOR. Two MINORs (one token-tier nudge, one undo-confirmation polish) and one ESCALATE that is **already correctly flagged in-code and out of design scope** (the 06:15 vs 07:30 default-time discrepancy is a PM/CEO product call, not a design-system call — the code comment routes it correctly and does NOT block this gate).

The addition is on-system, calm, consistent with the screen's established row patterns, reuses the codebase-proven toast path, and ships full tri-locale i18n + a11y label. It feels like Auxi.

---

## 8-lens pass

### Lens 1 — Design-system compliance · PASS (1 MINOR)
- No raw hex, no raw `zIndex`, no motion literal, no `fontFamily` string in the added lines (grep on the diff: all NONE). Mechanical backstop clean.
- `resetLabel` uses `theme.typography.aliases.poppinsBodySm` (a real alias) + `theme.colors.figmaOnboardingStepLabel` (a real color token) — correct *tier discipline* (no hex), and the layout uses `poppinsBodySm` consistently with the screen's body-text scale.
- **MINOR (FND-1) — legacy color alias where a `ds.*` canonical token exists.** `figmaOnboardingStepLabel` (`#9e968e`) is the legacy alias that `ds.color.warm500` supersedes (per `color-rules.md §1` and `theme.ts:401`). New code should read `theme.ds.color.warm500` first (`design-system.md §1`: "new code reads from `theme.ds.*` first"). Same value, off-system tier → MINOR, does not block. **Caveat:** this is consistent with the rest of `SettingsScreen` (the existing rows use `uacTextBase`/`figmaListDivider` legacy aliases, not `ds.*`) — so swapping only this one line to `ds.*` would make it the *odd one out*. Recommend deferring to a screen-wide `ds.*` migration rather than a one-line change. Logged, not blocking.

### Lens 2 — Motion & interaction · PASS
- The only motion is the snackbar, rendered by `react-native-toast-message` (library default in/out). `motion-rules.md §2` lists toast in/out as `medium 350 enter` / `normal 250 exit` for *bespoke* toasts; a library-default toast is acceptable and is the established pattern in this same file (`showSettingsError`, line 197, uses the identical `Toast.show` shape). No hand-rolled animation was introduced, so there is no token to get wrong and no `useReducedMotion` branch owed (the library owns the animation; reduce-motion at the library level is a qa-ux concern, not a new-surface design-system miss). Not a finding.
- The reuse of `Toast.show + onPress` over the library's custom `toastConfig` render path is correct and intentional — the custom path is documented unreliable in this RN/lib version (AU-361 ItemReadySnackbar). Good call.

### Lens 3 — Visual hierarchy · PASS
- A muted-greige `poppinsBodySm` text link sitting directly under the time row is the *right weight* for this action: it is a soft, reversible "restore defaults", not a primary CTA and not a destructive delete. It reads as clearly subordinate to the time/frequency rows above it (which use `poppinsBody` + `uacTextBase`), so it does not compete for first-glance attention — correct, because the user's primary task in this group is *setting* the time, not resetting it.
- It is subordinate but not invisible: 44px tap row, left-aligned within the group it resets, distinct text. The placement (scoped inside the Daily-Time group, above the `Divider`) makes its blast radius obvious — it resets *this group*, not the account. Good scoping decision vs. dropping it on the main list.

### Lens 4 — Color & emphasis · PASS
- Greige (`warm500`/`figmaOnboardingStepLabel`) is the correct semantic for a calm secondary action. Crucially it is **not** `danger`/`#bb251a` — which is right: this is a soft, undoable reset, not a destructive operation, so it must NOT borrow destructive-red emphasis. The choice reads as "quiet, recoverable" exactly as intended. (`color-rules.md §2`: muted `warm500` on `cream` is fine for secondary text.)
- Note for the record: the existing account-wide "Delete data" row is itself *neutral* (`uacTextBase`, not red — qa-ui C2 decision, line 866). So this screen's convention is "even the scary action is visually calm." A greige reset link is fully coherent with that established restraint.

### Lens 5 — Component state coverage · PASS
- **Default**: greige link. **Disabled-while-persisting**: `styles.disabledRow` (opacity 0.5) applied via `isResettingNotifications`, and `handleResetNotifications` early-returns if already in flight — correct guard, prevents double-fire. **Pressed**: `activeOpacity={0.82}` matches every other touchable row in the file (`singleRow`, `timeRow`, etc.) — consistent press feedback, no bespoke pressed-state owed. **Error**: optimistic update is rolled back on persist failure and `persistUserMetadata` surfaces the error toast. **a11y label** present (`a11y_notification_reset`, tri-locale).
- No "selected"/"loading-spinner"/"empty" state is applicable to a fire-once text link — coverage is complete for this affordance.

### Lens 6 — Cross-screen / in-screen consistency · PASS
- The bare text link is **consistent with the screen's own established row patterns**: `resetRow` (`minHeight 44`, `paddingVertical 8`, `justifyContent center`) is structurally identical to the existing `versionRow` and `sectionLabelWrap` (both `minHeight 44` / `paddingVertical 8` / center) — i.e. the app already uses left-aligned, single-text 44px rows for subordinate/no-chevron content. The reset link slots into that exact mold. It is *intentionally* lighter than `singleRow` (which is `space-between` with a value/icon on the right) because a reset has no right-hand value — appropriate differentiation, not drift.
- Distinct from the account-wide "Delete data" row by scope and placement (inside the group vs. on the main list), which prevents the two resets from being confused. Good.

### Lens 7 — Native feel · PASS (1 MINOR)
- 44px tap target = iOS HIG minimum. Bottom snackbar + tap-to-undo is a known, native-feeling affordance and the toast body text explicitly says "Tap to undo", so the undo *is* discoverable (the gesture is labeled, not hidden). Acceptable for a low-stakes, fully-reversible, server-reconciled action.
- **MINOR (FND-2) — undo gives no confirmation feedback.** When the user taps the snackbar to undo, `undoNotificationReset` restores state + persists + fires `notifications_reset_undone`, but shows **no** confirmation. The i18n key `notification_reset_undone_title` ("Reset undone") was added but is **never rendered** — a dangling string, and a small "did my undo work?" gap. A native pattern would surface a brief confirmation (toast or the value visibly reverting) on undo. Low severity because the time value in the group visibly reverts, so there is *some* feedback; but the unused key signals intent that wasn't wired. Route to mobile-dev: either render `notification_reset_undone_title` in a short toast on undo, or remove the unused key. Does not block.

### Lens 8 — Recommendation experience · N/A
- No recommendation surface in this change (Settings notification group). Nothing to assess. Stated for completeness.

### Journey continuity · PASS
- Where was I / where am I / what next: the user stays in the Daily-Time group throughout. Reset mutates the visible time/frequency in place (immediate optimistic feedback), the snackbar narrates what happened + offers the escape hatch, and undo returns them to the prior state. The flow is self-contained and coherent with the rest of Settings — no navigation jump, no orphaned state. Continuity holds.

---

## ESCALATE (informational — does NOT block this gate)

**Default-time discrepancy: UAC says 07:30 AM, `DEFAULT_SETTINGS.time` is "06:15".** The reset restores to the `DEFAULT_SETTINGS` constant (correct engineering decision — reset == first-run default). The code comment at `handleResetNotifications` already flags this as a pending CEO/PM product decision and correctly instructs *not* to change `DEFAULT_SETTINGS` unilaterally. This is a **product/content** decision (what *is* the default time), not a design-system or craft call — so it is **out of my scope** and does NOT affect the design-review verdict. Routing it to PM/CEO for confirmation, but it is not a designer gate blocker. The in-code handling is correct.

---

## Findings summary

| ID | Severity | Lens | Finding | Route |
|---|---|---|---|---|
| FND-1 | MINOR | 1 design-system | `figmaOnboardingStepLabel` legacy alias where `ds.color.warm500` exists; consistent w/ rest of screen → defer to screen-wide `ds.*` migration | mobile-dev (low pri / batch) |
| FND-2 | MINOR | 7 native-feel | Undo path renders no confirmation; `notification_reset_undone_title` key added but never used (dangling) | mobile-dev |
| — | ESCALATE | (product) | 06:15 vs 07:30 default-time — already correctly flagged in-code, out of design scope | PM/CEO |

**Counts**: BLOCKER 0 · MAJOR 0 · MINOR 2 · ESCALATE 1 (informational/out-of-scope)

**Verdict rule applied**: no open BLOCKER/MAJOR → **PASS**. The two MINORs are logged for follow-up and do NOT block the PR.
