# AU-362 Temperature Override — Sim Verify (fresh rebuild)

**Date**: 2026-06-19 17:34–17:56
**Agent**: qa-mobile (exploratory verify, mobile-mcp)
**Branch**: `feat/favourite-figma-fidelity` @ `4db98054`
**Device**: iPhone 16 Pro · iOS 18.1 · UDID 9DCBFE8A-EE9E-4AD6-8F45-91B3F7AC5916
**Lane**: exploratory (no Maestro flow exists for AU-362 yet)

## Core question: did a fresh rebuild surface the feature the stale build was hiding?

**YES — confirmed.** The user's "không thấy" was a stale build + stale Metro cache,
NOT a code defect.

Evidence chain:
- Stale installed binary was at DerivedData path `...126DB443...`; the running app
  showed a **"Fast Refresh disconnected. Reload app to reconnect."** banner — the JS
  bundle was not connected to a live Metro.
- An existing Metro (PID 99761) was already serving on :8081 with a stale (un-reset)
  transform cache. Killed it, started a clean `yarn start --reset-cache`.
- `yarn react-native run-ios --udid ...` rebuilt + reinstalled to a NEW DerivedData
  path `...dowftpccxrybejdxxgkxbvrrpfle...` (337s, exit 0, BUILD SUCCEEDED).
- On relaunch the fresh Metro bundled `./index.js` from scratch (0%→99.9%) — proof
  the old cache is gone. Banner cleared; app connected to the live bundle.
- After the fresh bundle loaded, the temperature-override entry point rendered
  immediately on the Home outfit card.

No code change was needed. Static analysis was right: the feature is fully wired on
this branch (`OutfitCardCaption.tsx:57`, `HomeScreen.tsx:2142/2816` `onPressInsight`,
sheet + indicator imported at `HomeScreen.tsx:83/86`).

## Does `home-temp-trigger` render on the Home outfit card?

**YES.** On the Home recommendation card caption row:
```
{"type":"Button","label":"Adjust outfit temperature","name":"home-temp-trigger",
 "coordinates":{"x":168,"y":146,"width":40,"height":40}}
```
40×40 lightbulb pill, exact testID + a11y label from code. (Screenshot a.)

Note: only renders on a real outfit recommendation card (needs `onPressInsight`
prop, only passed on Home). Confirmed not present on FavouriteScreen — by design.

## Does the sheet open and apply work?

**YES — full flow end-to-end:**
1. Tap `home-temp-trigger` → **TemperatureOverrideSheet** opens: title "Outfit
   Temperature", subtitle, 5 buckets (Use current weather (32°C) / 28–40°C /
   10 - 25°C / 0 - 7°C / -10 - 0°C), Apply + Cancel. (Screenshot b.)
2. Selected "10 - 25°C" (radio filled, current-weather deselected).
3. Tap Apply (`temp-sheet-apply`) → button shows loading spinner, recommend rebuild
   fires (`applyTemperature` → `resetV05Session` + forced `requestRecommendation`).
4. Header swap CONFIRMED: WeatherWidget → **`home-temp-indicator`**
   ("Outfit temperature override active: 10 - 25°C. Tap to change.") at header y=87.
5. Caption pill flips to active: **`home-temp-trigger-active`**
   ("Outfit temperature override active. Tap to change.").
6. Fresh outfit rebuilt under the override (new pin ids `f20e94be6f0a`). (Screenshot c.)

All AU-362 testIDs verified live: `home-temp-trigger`, `home-temp-trigger-active`,
`temp-sheet-cancel`, `temp-sheet-apply` (via behavior), `home-temp-indicator`.

## Blockers hit

- **No AsyncStorage redbox** — the known Xcode 26.5 ↔ RN 0.83.1 cold-launch native
  blocker did NOT manifest this run (clean build to fresh DerivedData; cold launch +
  relaunch both rendered fine). Worth noting since prior AU-362 PR #96 work hit it.
- **No login needed** — the booted sim already had an authenticated session with a
  populated wardrobe + live recommendations, so Home had a real outfit card.
- Minor (not a feature bug): the Sidebar "See my outfits" pill (`sidebar-pill-see-outfits`)
  was finicky to hit via coordinate taps (sits in the safe-area top zone). Worked
  around by terminate+relaunch, which cold-resets to Home (default initial route, no
  `initialRouteName` set). Not an AU-362 issue.
- Dev-only "Open debugger to view warnings" toast appeared on Home — benign Metro/dev
  warning, not a crash or feature error.

## Screenshots

- (a) Home with lightbulb pill visible:
  `auxi/docs/design-reviews/screenshots/2026-06-19/qa-mobile-au362-a-home-temp-pill.png`
- (b) TemperatureOverrideSheet open:
  `auxi/docs/design-reviews/screenshots/2026-06-19/qa-mobile-au362-b-sheet-open.png`
- (c) Header after applying override (10 - 25°C indicator + active pill):
  `auxi/docs/design-reviews/screenshots/2026-06-19/qa-mobile-au362-c-override-active.png`

## Findings filed

None. Feature renders and functions correctly on a fresh build.

## Recommendation

Tell the user: rebuild + reinstall (the binary they had predated AU-362) and reset
the Metro cache. If they keep an old Metro running, `--reset-cache` after every
git checkout that changes JS. Since this exploratory verify covers a shipping user
flow that will be re-run each release, recommend `qa-ui` promote it to a Maestro flow
(`maestro/flows/home/temperature-override.yaml`) keyed off the verified testIDs above.

---

**Status:** DONE
**Summary:** Fresh rebuild + Metro cache reset surfaced AU-362 exactly as expected —
the user's stale binary was hiding it. `home-temp-trigger` renders on the Home outfit
card, the sheet opens, and Apply swaps the header to `home-temp-indicator` and flips
the pill to `home-temp-trigger-active`. End-to-end verified, zero findings.
**Concerns:** Known AsyncStorage cold-launch blocker did not recur this run, but it's
build-toolchain-dependent — a future clean build could still hit it. Sidebar
"See my outfits" pill is awkward to hit by coordinate (safe-area placement); cosmetic
for QA navigation, not a feature defect.
