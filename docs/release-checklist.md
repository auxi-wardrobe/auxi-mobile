# auxi — TestFlight release checklist

Reproducible pipeline for shipping new builds to TestFlight without re-debugging Xcode 26, fmt, icons, signing, etc.

**TL;DR per release:** `scripts/release-testflight.sh <next-build-number>` → press `y` when prompted.

---

## One-time setup (per machine)

### Tooling
- macOS 26+
- Xcode 26+ (App Store → "Get") — after install run once:
  ```
  sudo xcode-select -s /Applications/Xcode.app
  sudo xcodebuild -license accept
  ```
- iOS 26 platform: open Xcode → Settings (`⌘,`) → Platforms → iOS 26 → **Get**
- CocoaPods: `gem install cocoapods` (or via Bundler in repo)
- node + yarn (already required by RN)

### Apple credentials
- App Store Connect API key (.p8) lives at `~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8`
- Add to `~/.zshrc` (or `~/.bashrc`):
  ```bash
  export ASC_API_KEY=U2JN4H9WCR
  export ASC_API_ISSUER=f7c47bd9-de91-4a8e-a244-8b83d7fe6b14
  ```
- `source ~/.zshrc` once to load them

### Device registration
- Apple Dev portal at https://developer.apple.com/account/resources/devices/list
- For each tester iPhone, add by UDID. Get UDID with cable OR:
  ```
  xcrun devicectl list devices    # iPhone must be paired before, no cable needed once paired
  ```
- This is required even for App Store distribution profiles — Apple blocks signing if team has no devices

### Linear API key (for posting release notes)
- File: `~/.linear/api_key` (chmod 600)
- Used by ad-hoc `curl https://api.linear.app/graphql -H "Authorization: $(cat ~/.linear/api_key)" …`

---

## Repo gotchas (already committed — do not break)

These all live on `main` (after PR #11 merge) and any branch forked from it. If you ever switch to an older branch and the build breaks, check that these still exist:

| Gotcha | Where | Why |
|---|---|---|
| `ENABLE_USER_SCRIPT_SANDBOXING = NO` | `ios/auxi.xcodeproj/project.pbxproj` (Debug + Release) | Hermes `replace_hermes_version.js` script needs write access |
| `FMT_USE_CONSTEVAL=0` + `base.h` ifndef-guard patch | `ios/Podfile` `post_install` block | Xcode 26 clang's stricter `consteval` breaks fmt 11.0.2 in RN 0.83 |
| `CFBundleIconName = AppIcon` | `ios/auxi/Info.plist` | Required since iOS 11 SDK; Apple rejects upload without it |
| 9 sliced icons in asset catalog | `ios/auxi/Images.xcassets/AppIcon.appiconset/` | Apple rejects missing 120×120 (and all other sizes) |
| `ExportOptions.plist` | `ios/ExportOptions.plist` | `method=app-store-connect`, `signingStyle=automatic`, `teamID=9Z32ZJK4A5` |
| API base URL env switch | `src/config/env.ts` (after PR #11 merge) | Release builds hit Railway prod, not localhost |

**If you fork a branch from before PR #11**, run `git diff main..HEAD -- ios/Podfile ios/auxi/Info.plist src/config/env.ts` to spot missing pieces.

---

## Per-release flow

### Pre-flight
```bash
cd auxi
git status                                          # clean tree
git pull                                            # latest main if on a feature branch
grep MARKETING_VERSION ios/auxi.xcodeproj/project.pbxproj | head -1   # current x.y.z
grep CURRENT_PROJECT_VERSION ios/auxi.xcodeproj/project.pbxproj | head -1   # current build N
```

### Ship
```bash
scripts/release-testflight.sh <N+1>
```
The script:
1. Bumps `CURRENT_PROJECT_VERSION` to the arg you pass
2. `pod install` (reapplies fmt patches)
3. `xcodebuild archive` against iOS 26 SDK
4. `xcodebuild -exportArchive` to IPA
5. `xcrun altool --validate-app` (stops here if Apple rejects)
6. Prompts `y/N` → `xcrun altool --upload-app`
7. Creates annotated tag `v<MARKETING_VERSION>-build<N+1>` locally

**Skipping the bump arg** keeps the build number as-is — Apple rejects re-uploads of the same `MARKETING_VERSION` + `CURRENT_PROJECT_VERSION`. Bump every time.

### Post-flight
```bash
git push origin <branch>
git push origin v<x.y.z>-build<N+1>
```

Then in App Store Connect:
1. Wait 5–30 min — email arrives "Build ready" or "ITMS-XXXXX failure"
2. If failure → fix → bump build N+2 → re-run script
3. If success → app appears in TestFlight tab → answer **Export Compliance** prompt once
   - To skip the prompt permanently: add to `Info.plist` (NOT yet done):
     ```xml
     <key>ITSAppUsesNonExemptEncryption</key>
     <false/>
     ```
4. Add internal testers under **Users and Access** → assign to the **Internal Testing** group → they receive an email + TestFlight app invite

---

## Common failure modes

| Symptom | Diagnosis | Fix |
|---|---|---|
| `iOS 26.x is not installed` during archive | iOS platform missing | Xcode → Settings → Platforms → Install iOS 26 |
| `fmt/format-inl.h:59 consteval error` | Stale fmt patch | `pod install` to reapply, OR check Podfile has `FMT_USE_CONSTEVAL=0` block |
| `Missing Info.plist value: CFBundleIconName` | plist key removed | Add `<key>CFBundleIconName</key><string>AppIcon</string>` |
| `Missing required icon file ... 120x120` | Asset catalog empty | 9 PNG files in `AppIcon.appiconset/` + `Contents.json` references them |
| `Your team has no devices` | Apple Dev portal | Register at least one device UDID under your team |
| `Apple Distribution: ... not found` | No cert in keychain | Open Xcode → Settings → Accounts → manage certs, or use automatic signing |
| Upload succeeds but app crashes on launch in TestFlight | RN bundle missing | Check `Bundle React Native code and images` script phase ran during archive |
| App opens but all API calls fail | Wrong env URL or backend down | Verify `src/config/env.ts` `PROD_ROOT` → `curl https://wardrobe-backend-production-c8d9.up.railway.app/docs` returns 200 |

---

## Branching rules to avoid re-debugging

- **Always branch from `main`** for new features — inherits all the fixes above
- **Never create release commits on feature branches** unless you're ready to ship — keeps history clean
- **PR #11** (the original TestFlight ship) must be merged to `main` before any other branch can safely ship. Until merged, every new branch needs to cherry-pick the gotchas
- **Tag every shipped build** as `v<x.y.z>-build<N>` so you can `git checkout` to a known-shipped state when debugging "what was on TestFlight at the time"

---

## What to update when something changes

| Change | Update |
|---|---|
| New Apple Dev team member | Re-add to `Users and Access` in App Store Connect |
| Railway backend URL changes | Edit `PROD_ROOT` in `src/config/env.ts`, bump build, ship |
| Real designer icon arrives | Replace `Icon-1024.png`, re-slice via `magick`, bump build, ship |
| Apple raises minimum SDK again | Wait for the email, install new Xcode, re-ship a build to validate |
| API contract drift surfaces in TestFlight | See `docs/journals/2026-05-11-*` if exists, or document in new journal entry |

---

## Related docs
- `docs/journals/2026-05-10-first-testflight-upload.md` — post-mortem of the gnarly first ship
- `wardrobe-backend/API_DOCUMENTATION.md` — API contract (in the umbrella repo's backend submodule)
