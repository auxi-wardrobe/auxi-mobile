# First TestFlight Upload — Apple's Gauntlet Cleared

**Date**: 2026-05-10 16:44
**Severity**: Medium
**Component**: auxi iOS build pipeline, React Native 0.83 + Xcode toolchain
**Status**: Resolved (v1.0.0-build1 uploaded, placeholder icon)

## What Happened

Got auxi (RN 0.83 + TS 5.8) through Apple's TestFlight submission gates for the first time. Bundle ID `com.auxi2026.app`, team ID `9Z32ZJK4A5`. Upload succeeded with delivery UUID `cbc11bd6-6885-4c93-98b2-e2dd69e52924`. 11.4 MB IPA pushed to test branch.

## The Brutal Truth

Apple's April 2026 deadline forces the entire iOS ecosystem forward at gunpoint: macOS 26.4.1, Xcode 26.4.1, iOS 26 SDK. None of it was installed. You can't stub any of it. The toolchain download + install consumed hours of patience and disk space before a single line of code compiled.

The C++ `consteval` issue with fmt 11.0.2 was a time trap. The fix that *looked* obvious (add `-DFMT_USE_CONSTEVAL=0` flag) silently failed because `base.h` hard-codes the detection. Felt like debugging with one eye closed until I realized the `#define` was getting clobbered.

## Technical Details

**SDK Gating**: Xcode 16.2 ships with iOS 18.2 SDK. Apple now requires iOS 26 SDK for new TestFlight uploads. macOS 15.0 doesn't ship Xcode 26 in the App Store. Manual upgrade path:
- macOS 26.4.1 install (~4GB)
- Xcode 26.4.1 install (~15GB)  
- iOS 26 platform download (~3GB) — split from main installer in Xcode 26

**The fmt consteval trap** (`format-inl.h:59`):
```
clang error: call to consteval function FMT_STRING is not a constant expression
```

Root cause: Xcode 26's clang enforces `consteval` stricter than 16.2. RN's bundled fmt 11.0.2 doesn't guard `FMT_USE_CONSTEVAL` detection.

Fix (two-part, both required):
1. Podfile `post_install` sets `GCC_PREPROCESSOR_DEFINITIONS += FMT_USE_CONSTEVAL=0` on fmt target
2. **Also** patch `base.h` in post_install to wrap detection in `#ifndef FMT_USE_CONSTEVAL ... #endif`

Without (2), (1) is silently overridden. Without (1), next `pod install` reverts (2). Both are necessary.

Also needed: `ENABLE_USER_SCRIPT_SANDBOXING=NO` for Hermes script phase.

**Icon gauntlet**: Designer (Viet) hadn't shipped master icon. Validation gated on `CFBundleIconName` + 120×120 minimum. Used ImageMagick to generate rose-gradient "A" monogram, sliced 9 sizes (40, 60, 58, 87, 80, 120, 180, 1024), wrote Contents.json with `filename` keys, added Info.plist `CFBundleIconName=AppIcon`.

**Files changed** (commit 021c2d0):
- `ios/Podfile` — fmt workaround + base.h sed in post_install
- `ios/auxi.xcodeproj/project.pbxproj` — bundle ID, team, USER_SCRIPT_SANDBOXING=NO
- `ios/auxi/Info.plist` — CFBundleIconName
- `ios/auxi/Images.xcassets/AppIcon.appiconset/` — 9 PNGs + Contents.json
- `ios/ExportOptions.plist` — created

## What We Tried

1. `-DFMT_USE_CONSTEVAL=0` via compiler flags only → failed silently
2. Manual edit to `base.h` in Pods only → reverted on next pod install
3. Xcode 16.2 with iOS 18.2 SDK → rejected by TestFlight ("iOS 26 SDK required")

## Root Cause Analysis

Apple's toolchain versioning is a **hard gate**, not advisory. The April 2026 deadline isn't a suggestion. This forces downstream: if you ship via TestFlight, every developer must match the entire stack.

The fmt issue is a known RN community pain point. The "obvious" preprocessor define silently fails—no error, just ignored. This is worse than a hard failure because you don't realize the flag was clobbered.

## Lessons Learned

- **First upload always takes 4× longer than estimated**. Apple's ecosystem is synchronous: macOS, Xcode, SDK, simulators all upgrade together, or nothing works.
- **Preprocessor defines in Xcode don't trump source-level `#define` statements**. If the header hard-codes a value without guards, you must patch the header.
- **Patch idempotence matters**. Use sed with anchors in Podfile post_install so re-runs don't break.
- UDID registration (via `xcrun devicectl list devices`) is mandatory for any signing, even App Store distribution. "No devices" error is a blocker, not a warning.

## Next Steps

- Real app icon from Viet (placeholder "A" shipped in build 1)
- Add `ITSAppUsesNonExemptEncryption=false` to Info.plist (skip export compliance prompt)
- Bump umbrella submodule pointer to test/v05-onboarding-flow
- Push base branch, open PR

**Files touched**: auxi/ios/* (Podfile, pbxproj, Info.plist, AppIcon, ExportOptions)
**Branch**: test/v05-onboarding-flow
**Commit**: 021c2d0 (tagged v1.0.0-build1)
