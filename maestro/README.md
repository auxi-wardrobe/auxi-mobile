# Auxi Maestro flows

Local-only deterministic mobile QA. No cloud. No screenshots. No LLM
reasoning over images. Maestro reads `testID` / `accessibilityLabel` /
text and either matches or it doesn't — pass/fail is binary.

## One-time setup

```bash
# 1. Install Maestro CLI
brew tap mobile-dev-inc/tap
brew install mobile-dev-inc/tap/maestro --formula
maestro --version

# 2. Java is required by Maestro. Brew installed openjdk as a dep but
#    didn't link it. Either symlink (sudo) OR export JAVA_HOME.
#
# Option A — one-line zshrc export (recommended):
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home"' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Option B — system-wide symlink (sudo):
sudo ln -sfn /opt/homebrew/opt/openjdk/libexec/openjdk.jdk \
  /Library/Java/JavaVirtualMachines/openjdk.jdk
```

`./scripts/qa-boot.sh` from the umbrella root also exports `JAVA_HOME`
for the current shell, so flows run cleanly in any session that started
with the boot script.

## Running flows

Prereq: `./scripts/qa-boot.sh` (boots backend + sim + installs the app).

```bash
cd auxi

# Single flow
maestro test maestro/flows/home/swipe.yaml

# All flows in a feature directory
maestro test maestro/flows/home/

# Pass credentials via env (don't bake secrets into YAML)
maestro test maestro/flows/auth/login.yaml \
  -e QA_EMAIL=qa-test@auxi.app \
  -e QA_PASSWORD='QaTest!2026'

# JUnit-style report (machine-parsable, useful for hand-off)
maestro test maestro/flows/home/ \
  --format junit \
  --output ../logs/maestro/home.xml

# Save per-step hierarchy on failure (use this when filing bugs)
maestro test maestro/flows/home/swipe.yaml \
  --debug-output ../logs/maestro/home-swipe-debug
```

Exit code: 0 = pass, non-zero = fail.

## Flow inventory

> Authored by `qa-ui`. Executed by `qa-mobile`. If a flow you need
> doesn't exist, file a request with `qa-ui`.

| Flow | Tags | Purpose |
|---|---|---|
| `_shared/login.yaml` | _shared | Cold login (clearKeychain + type credentials). Used by `auth/login.yaml`. |
| `_shared/ensure-home.yaml` | _shared | Conditional login — reuses Keychain if present, falls into `login.yaml` only when the Login screen is visible. Used by every post-login flow. |
| `auth/login.yaml` | auth, regression | Login persists across relaunch |
| `home/swipe.yaml` | home, regression | Vertical sheet swipe + index advance + Show another / This works / Edit context buttons |
| `onboarding/v05.yaml` | onboarding, v05, regression | V05 onboarding journey: WardrobeDirection -> FitPreference -> StylePicker -> POST /api/v05/onboarding/generate -> Home stack swap. Requires `is_first_login=true` test account; ~60s runtime to absorb slow generate endpoint. |

Add new flows here when you ship them. Tags drive grouped runs.

## Login: cold vs reused (the `_shared/` split)

| Sub-flow | What it does | Use it when |
|---|---|---|
| `_shared/login.yaml` | `clearState + clearKeychain` then types credentials. **Always cold-login.** | Only `auth/login.yaml` (which tests login itself + Keychain persistence). |
| `_shared/ensure-home.yaml` | Launches app; if Login screen visible, falls into `login.yaml`. Otherwise skips straight to Home. | Every flow that doesn't care about login mechanics — `home/*`, `wardrobe/*`, `body/*`, `settings/*`, etc. |

**Why it matters:** the cold login path costs ~30-90s per run (LLM
cold-start + OpenAI retries). Most flows shouldn't pay that tax —
`ensure-home.yaml` reuses the iOS Keychain across runs so only the
*first* run in a fresh sim seeds the credentials.

If you start hitting "still logged in as someone else" issues, run
`auth/login.yaml` once (or `xcrun simctl uninstall booted com.auxi2026.app`)
to reset the keychain.

`onboarding/v05.yaml` deliberately inlines its own cold-login (rather
than reusing `_shared/login.yaml`) because the post-credentials assertion
differs: a first-login user lands on Welcome, not Home.

## Conventions (must read before authoring)

- **Selector hierarchy**: `id:` (testID or a11y label) preferred. `text:`
  is last resort and only for designer-confirmed static copy.
- **No screenshot reasoning, no OCR, no visual diff.** If an assertion
  needs visual judgement, the flow is wrong — push back.
- **No assertions on randomized data**: temperatures, item counts,
  recommendation copy, timestamps drift constantly.
- **Sub-flows for shared setup**: anything used by 3+ flows belongs in
  `_shared/`. Login is the canonical example.
- **Sensitive values via env**: `${QA_EMAIL}`, `${QA_PASSWORD}` come from
  env, never hardcoded.
- **One flow = one journey**: ~5-30 steps. If you exceed 50, split.

For full authoring details, see the `auxi-qa-ui` skill at
`.claude/skills/auxi-qa-ui.md` (umbrella root).

## testID gaps

Maestro flows depend on `testID` props on every interactive element. If
the screen you're testing doesn't have them yet, that's a `mobile-dev`
backlog item — not a flow problem. File a backfill request rather than
falling back to fragile selectors.

Naming convention (mirrored in `mobile-dev` agent rules):
`<feature>-<element>-<state-or-purpose>`. Examples:

- `auth-email-input`, `auth-password-input`, `auth-login-submit`
- `home-screen-root`, `home-mode-pill-safe`, `home-heart-toggle`
- `wardrobe-tab-tops`, `wardrobe-item-tile-{id}`

Open testID gaps (filed with mobile-dev):

- `WelcomeScreen.tsx` — "Get started" PillButton has no testID. Proposed:
  `onboarding-welcome-cta`. `onboarding/v05.yaml` falls back to
  `text: "Get started"` (designer-confirmed static copy).
- `LocationPermissionScreen.tsx` — "Enable location" / "Not now" buttons
  have no testIDs. Proposed: `onboarding-location-enable`,
  `onboarding-location-skip`. `onboarding/v05.yaml` falls back to
  `text: "Not now"` for the skip path.
- `screens/auth/RegisterScreen.tsx` — entire register screen has no
  testIDs (`Input` placeholders + Sign Up button). Blocks any future
  "register fresh user" subflow. Proposed: `auth-register-email`,
  `auth-register-password`, `auth-register-confirm-password`,
  `auth-register-submit`.

## Bug-report format (qa-mobile fills this in on failure)

`auxi/docs/qa-findings/<YYYY-MM-DD>-<slug>.md` with:

- Failing flow path + step
- Maestro log excerpt
- Hierarchy snapshot path (from `--debug-output`)
- Suspected `auxi/src/<file>.tsx:<line>`
- Routing: `mobile-dev` (UI/state) | `backend-dev` (API) | `qa-ui` (flow bug)
