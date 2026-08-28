# qa-mobile — AU-457 Discovery live E2E smoke test (retry) — BLOCKED at boot gate

**Plan:** `plans/260827-2205-au-457-discovery/plan.md`
**Retry of:** earlier attempt cut off mid-task by a session usage-limit reset (not a real failure). Started fresh per instructions — did not assume prior seeded data still exists.

## Step 1 — boot verification (per workflow, mandatory before any other step)

Checked per the required commands:

```
$ curl -s http://localhost:5001/health --max-time 3
{"status":"healthy","timestamp":"2026-08-27T19:55:57.534191+00:00", ...}

$ curl -s http://localhost:8081/status --max-time 3
packager-status:running

$ xcrun simctl list devices booted
== Devices ==
-- iOS 26.5 --
(no booted device lines)

$ xcrun simctl listapps booted 2>&1 | grep -i auxi
NO BOOTED DEVICE TO QUERY
```

**Result:**
- Backend `:5001` — healthy, already running (presumably left up from the earlier interrupted attempt or another concurrent session).
- Metro `:8081` — running (`packager-status:running`).
- iOS Simulator — **not booted**. No device is in the `Booted` state, so there is nothing to query for installed apps, and no target for mobile-mcp.

## Why I stopped instead of proceeding

Two hard rules apply here and both point the same direction:

1. My own scope boundary: *"No booting. The sim must already be booted with the app installed via `./scripts/qa-boot.sh`. If it isn't, tell the user to run that script and stop."*
2. `.claude/rules/ios-build-workflow-required.md` concurrency rule: Metro (`:8081`) and the backend (`:5001`) are shared-machine singletons; `qa-boot.sh`'s `free_ports()` step unconditionally `kill -9`s whatever is listening on `:5001`/`:8081` before restarting them. Since both are currently healthy and I have no way to confirm whether another Claude Code session (mobile-dev, another qa run, etc.) depends on the exact process instances currently bound to those ports, running `qa-boot.sh` myself risks tearing down someone else's live session — a destructive/global action I must not take unilaterally.

Since the simulator itself (not the backend/Metro) is the missing piece, the safe move is to have the human confirm no other session needs the current backend/Metro instances before either (a) they boot a simulator directly (`xcrun simctl boot <udid>` + install/launch the app onto the existing Metro), or (b) they run `./scripts/qa-boot.sh` themselves, accepting that it will restart backend+Metro too.

## What was NOT done (blocked by the above — none of Steps 2–3 were started)

- **Step 2 (seed Discovery data):** not started. Did not check `GET /api/discovery/outfits` for leftover data from the prior interrupted run, did not touch `create_admin.py`, did not create/publish a Discovery outfit, did not exercise the duplicate-item-id validation check. Backend being healthy means these are all still executable once the sim gate clears — no backend-side blocker observed.
- **Step 3 (mobile smoke test):** not started — no booted simulator to launch the app on, so no mobile-mcp calls were made (launch, drawer, feed, filters, detail, See-on-me, save-to-wardrobe idempotency, deep links, onboarding-stash case, logged-out case, regression nav, crash log check). No screenshots were taken.

## Recommendation for the next attempt

1. Confirm no other Claude Code session is relying on the current `:5001`/`:8081` processes.
2. Either boot a simulator manually and reuse the existing healthy backend/Metro, or have the user run `./scripts/qa-boot.sh` (accepting the backend/Metro restart).
3. Re-dispatch this same smoke test — Step 2 (seed) and Step 3 (mobile walk) are both still fully pending and should be run in full once the sim is available.

## Status

**Status:** BLOCKED
**Summary:** Backend (`:5001`) and Metro (`:8081`) are already healthy/running, but no iOS Simulator is booted and no app is installed to test against. Per hard boot-verification and concurrency-safety rules, I stopped before seeding data or touching mobile-mcp rather than booting a simulator or restarting the shared backend/Metro myself.
**Concerns/Blockers:** No booted iOS Simulator. Need the user (or a session authorized to boot/restart the shared toolchain) to either boot a simulator against the existing Metro/backend, or explicitly authorize running `./scripts/qa-boot.sh` (which will restart backend+Metro). None of the AU-457 Discovery seeding or mobile verification steps have been executed yet in this retry.
