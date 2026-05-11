#!/usr/bin/env bash
# Reproducible TestFlight release pipeline for auxi.
# Usage: scripts/release-testflight.sh [build_number]
#
# Skip the bump arg to keep CFBundleVersion as-is (re-upload same build is rejected).
# Set ASC_API_KEY / ASC_API_ISSUER in your shell rc (see docs/release-checklist.md).

set -euo pipefail

cd "$(dirname "$0")/.."

API_KEY="${ASC_API_KEY:?Set ASC_API_KEY in shell rc — see docs/release-checklist.md}"
API_ISSUER="${ASC_API_ISSUER:?Set ASC_API_ISSUER in shell rc — see docs/release-checklist.md}"
SCHEME=auxi
WORKSPACE=ios/auxi.xcworkspace
EXPORT_OPTIONS=ios/ExportOptions.plist
PBXPROJ=ios/auxi.xcodeproj/project.pbxproj
ARCHIVE_DIR="${TMPDIR:-/tmp}/auxi-archive"

# 1. Bump build number if provided
if [[ "${1:-}" ]]; then
  /usr/bin/sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9]*;/CURRENT_PROJECT_VERSION = $1;/g" "$PBXPROJ"
  echo ">>> Bumped CURRENT_PROJECT_VERSION to $1"
fi

BUILD=$(grep -m1 "CURRENT_PROJECT_VERSION" "$PBXPROJ" | awk -F'= |;' '{print $2}' | tr -d ' ')
VERSION=$(grep -m1 "MARKETING_VERSION" "$PBXPROJ" | awk -F'= |;' '{print $2}' | tr -d ' ')
echo ">>> Shipping ${VERSION} build ${BUILD}"

# 2. Preflight — fail loud if Xcode 26 / iOS 26 platform missing
xcodebuild -version | head -1
xcrun --sdk iphoneos --show-sdk-version

# 3. Pod install (idempotent; reapplies fmt patches via Podfile post_install)
( cd ios && pod install --silent )

# 4. Clean + archive
rm -rf "$ARCHIVE_DIR"
mkdir -p "$ARCHIVE_DIR"
echo ">>> Archiving (logs: $ARCHIVE_DIR/archive.log)"
xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_DIR/auxi.xcarchive" \
  > "$ARCHIVE_DIR/archive.log" 2>&1
echo ">>> Archive OK"

# 5. Export IPA
echo ">>> Exporting IPA"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_DIR/auxi.xcarchive" \
  -exportPath "$ARCHIVE_DIR/export" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  > "$ARCHIVE_DIR/export.log" 2>&1
ls -lh "$ARCHIVE_DIR/export/auxi.ipa"

# 6. Validate before upload (saves an upload if icons/CFBundleIconName/signing wrong)
echo ">>> Validating against App Store Connect"
xcrun altool --validate-app -f "$ARCHIVE_DIR/export/auxi.ipa" -t ios \
  --apiKey "$API_KEY" --apiIssuer "$API_ISSUER"

# 7. Upload (require explicit yes)
read -p ">>> Validation OK. Upload to TestFlight? [y/N] " yn
[[ "$yn" == "y" || "$yn" == "Y" ]] || { echo "Skipped upload."; exit 0; }

xcrun altool --upload-app -f "$ARCHIVE_DIR/export/auxi.ipa" -t ios \
  --apiKey "$API_KEY" --apiIssuer "$API_ISSUER"

# 8. Tag the release
TAG="v${VERSION}-build${BUILD}"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo ">>> Tag $TAG already exists — skipping git tag"
else
  git tag -a "$TAG" -m "TestFlight upload ${VERSION} build ${BUILD}"
  echo ">>> Tagged $TAG (push manually: git push origin $TAG)"
fi

echo ""
echo "=============================================="
echo "Done. Build $BUILD uploaded."
echo "Check email + App Store Connect → TestFlight in 5–30 min."
echo "=============================================="
