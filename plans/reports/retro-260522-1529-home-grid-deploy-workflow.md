# Retro — Home Grid PR + TestFlight deploy workflow

**Date**: 2026-05-22
**Scope**: PR #23 (Home Figma fixes, 6 commits) + TestFlight v1.0-build7 deploy
**Outcome**: All shipped. But repeated workflow friction. This is what's worth fixing for next session.

---

## Top 6 stucks (ranked by time lost)

### 1. Submodule branch dance — ~15 cycles of stash/checkout/pop
**Stuck**: Per PR commit, executed: backup files to `/tmp` → `git stash -u` → `git checkout feat/home-grid-variant-layouts` → restore files → commit → push → `git checkout fix/ios-archive-sentry-pbxproj` → `git stash pop`. Repeated 6× for 6 PR commits + once for deploy. Each cycle ~8 commands.

**Why**: I was working from the dirty `fix/ios-archive-sentry-pbxproj` branch (where team's iOS WIP lived + where my edits naturally landed during exploration) but commits needed to go to `feat/home-grid-variant-layouts` (PR branch).

**Improve next time**:
- **Use `git worktree`** for the PR branch. Single isolated checkout, no branch toggling, no stash. `git worktree add ../auxi-home-pr feat/home-grid-variant-layouts`. Then edit + commit in that worktree directly. Original branch state never touched.
- Alternative: do ALL exploration on the PR branch from the start, never switch back.

---

### 2. Login flow eats 30+ min trying to reach Home in sim
**Stuck**: Tried login as `qa-test@auxi.app` → FE went to "Create password" (didn't recognize email) → accidentally created `sim-test-1@auxi.app` → stuck on email-verification screen. Couldn't reach Home for visual verification of Figma fixes.

**Why**: AU-242 auth flow is signup-first; doesn't pre-check email existence before showing create-password. Also some i18n bug rendered `[VI]` prefix and raw `auth.uac.*` keys.

**Improve next time**:
- **Reset password DB-side BEFORE touching FE**. The reset I eventually did would have worked first time if I'd done it upfront: `psql -c "UPDATE users SET password_hash='<argon2 hash>' WHERE email='qa-test@auxi.app'"`. ~5 sec vs 30+ min.
- **Or bypass FE auth entirely** for visual tests: JWT injection into Keychain via a debug deeplink, or temp dev-flag in code that auto-sets a session.
- **Stop after first FE auth surprise**, don't keep clicking. The "Create password" screen for an email I expected to exist = signal that backend lookup is broken / wrong endpoint / branch mismatch. Investigate, don't brute-force.

---

### 3. Native binary vs JS bundle branch mismatch
**Stuck**: After switching auxi to `feat/home-grid-variant-layouts` (off main), Metro reload of installed app crashed with `TurboModuleRegistry.getEnforcing(...): 'RNLocalize' could not be found`. Cost ~10 min diagnosing.

**Why**: Installed app binary was built from `fix/ios-archive-sentry-pbxproj` (newer, has RNLocalize native module). Main branch JS imports RNLocalize but main's pinned native deps don't include it. Metro shipped the JS that crashed at native bridge.

**Improve next time**:
- **Stay on the branch that matches the installed binary** for JS testing. The installed app's branch is the only branch that's runtime-compatible with it.
- **Treat native-module additions as native-builds-required**. If `package.json` adds a new native module (via `react-native autolinking`), the installed binary must be rebuilt — JS bundle reload alone won't fix it.
- For E2E test of a JS-only fix: install the app from the branch you intend to test, OR test on the branch the installed binary was built from.

---

### 4. Deploy pre-flight missed `yarn install`
**Stuck**: Build 1 of TestFlight failed at `Bundle React Native code and images`: `UnableToResolveError: Unable to resolve module i18next`. Cost ~6 min of archive (335s) + diagnosis.

**Why**: AU-242 merge added `i18next` + `react-i18next` to `package.json` + `yarn.lock`, but team's local `node_modules` didn't have them. Deploy skill pre-flight (`auxi-deploy-testflight.md`) doesn't verify `node_modules` is fresh.

**Improve next time**:
- **Add `yarn install --check-files` to deploy pre-flight**. Cheap (5-30s), catches drift after pulls/merges.
- Even better: `git status -s package.json yarn.lock` + warn if either was touched recently and `node_modules/.yarn-integrity` is older.
- Update the `auxi-deploy-testflight` skill checklist to include this.

---

### 5. Subagent Figma MCP not exposed
**Stuck**: Spawned 5 `qa-ui` subagents in parallel for Figma audit. All 5 reported Pass 1 BLOCKED — Figma MCP tools (`get_metadata`, `get_design_context`, etc) not in subagent's tool surface. 5 × ~120K tokens wasted on incomplete audits.

**Why**: Subagent inherits parent's MCP servers but maps tool names per agent's declared `tools` list. `qa-ui` declares `mcp__claude_ai_Figma__*` (claude.ai-hosted) but env had `mcp__plugin_figma_figma__*` (plugin-hosted). Naming mismatch → no tools.

**Improve next time**:
- **Run Figma audits from main context** (where the MCP works). Cheaper than spawning 5 agents that all fail Pass 1.
- Or: **fix the agent declaration** — add both `mcp__claude_ai_Figma__*` AND `mcp__plugin_figma_figma__*` to qa-ui's tools list so whichever is wired works.
- Don't spawn N parallel agents for "exploratory" tasks that might fail uniformly — try ONE first, confirm tools work, then fan out.

---

### 6. PR branch 10 commits behind main at merge time
**Stuck**: Tried `gh pr merge 23`, mergeable but UNSTABLE because branch was 10 commits behind main (AU-242 phases 01-05 merged in parallel). Had to merge main into PR branch first.

**Why**: I created `feat/home-grid-variant-layouts` off main early in session, then team merged AU-242 PRs to main during my work. Didn't periodically rebase/merge main during the PR's lifecycle.

**Improve next time**:
- **Rebase/merge main into the PR branch every 2-3 hours** during long-running PR work, not at the end. Catches conflicts early when they're small.
- Or: open the PR as draft early, let GitHub's "needs update" badge prompt the periodic refresh.
- Watch `git log origin/feat/X..origin/main` periodically — if > 5 commits, time to merge main in.

---

## Bonus stucks (smaller, ~5 min each)

### A. Sim refused to launch after Metro reload + test multiplex
- Per memory `Auxi iOS sim setup` "don't churn build cycle" — I should have accepted faster instead of retrying `simctl launch` 3× when it kept failing.
- Lesson: 2 retries max on sim launch, then switch to code-only verification.

### B. Spurious merge state during CHANGELOG commit
- Mid-launch-notify Surface 3, git was in unresolved-merge state (likely Fastlane's `pod install` writing to Podfile.lock left it in conflict mid-operation). Required `git merge --abort` + manual restore.
- Lesson: after any Fastlane / pod install, `git status` BEFORE doing other git ops. Don't trust prior clean state.

### C. Fact-Forcing Gate per Edit
- Every `Edit`/`Write` triggered fact gate (4-fact preamble). Acceptable for safety but ceremony adds up over 20+ edits per session.
- Lesson: batch related edits (e.g. 3 edits to same file) into one Write replacement when possible — single fact-gate vs N.

### D. Loop warning false positives
- `Tool 'Edit' called 3 times with same parameters` fired on different edits (different old_string each). Misleading.
- Out of my control — just learned to ignore.

---

## Workflow patterns that DID work well

- **Temp test multiplex** (counts [3,5,6,7] inflated from 1 backend outfit) to E2E-verify all variant layouts when backend was limited. Revertable, deterministic, scaled to all cases. Reuse this pattern for future variant-render verification.
- **Fact-gate compliance via short upfront preamble** kept edits moving even with the gate.
- **Spawning deep-reviewer agent** found 5 critical bugs (C1 / C4 / C5 / H6 / C3) that visual review would have missed. Worth the parallel spawn cost.
- **Tech-lead agent for PR review** caught the bump granularity issue (5 intermediate bumps too many) and produced a structured APPROVE WITH SUGGESTIONS verdict in one call.

---

## Top 3 actionable next-session changes

1. **Use `git worktree` for PR work on a submodule with dirty WT**. Eliminates the stash/checkout dance entirely. Single command setup, no cleanup ceremony.
2. **Reset DB password BEFORE touching FE auth screens** when testing on sim. Avoids the auth-flow brute-force trap.
3. **Add `yarn install --check-files` to `auxi-deploy-testflight` skill pre-flight**. Catches dep-drift before 6-min archive fails.

---

## Unresolved questions

1. Should `auxi-deploy-testflight` skill be updated to (a) include yarn install check, (b) accept Fastlane location agnostically (main or feat branch)? Worth a small PR to `.claude/skills/`.
2. The dual-MCP-naming for Figma (`claude_ai_Figma` vs `plugin_figma_figma`) is a project-wide issue affecting any agent that declares one name. Worth a sweep through `.claude/agents/*.md` to standardize?
3. Should the project have a "release" branch policy doc? Currently Fastlane lives on `fix/ios-archive-sentry-pbxproj` for historical reasons but conceptually should be on main. Worth a PR to merge that branch when Sentry/iOS WIP stabilizes.
