#!/usr/bin/env bash
# Reproducible TestFlight release pipeline for auxi.
# Usage: scripts/release-testflight.sh [build_number]
#
# Skip the bump arg to keep CFBundleVersion as-is (re-upload same build is rejected).
# Set ASC_API_KEY_ID / ASC_API_ISSUER in your shell rc (see docs/release-checklist.md).

set -euo pipefail

cd "$(dirname "$0")/.."

API_KEY_ID="${ASC_API_KEY_ID:?Set ASC_API_KEY_ID in shell rc — see docs/release-checklist.md}"
API_ISSUER="${ASC_API_ISSUER:?Set ASC_API_ISSUER in shell rc — see docs/release-checklist.md}"
SCHEME=auxi
WORKSPACE=ios/auxi.xcworkspace
EXPORT_OPTIONS=ios/ExportOptions.plist
PBXPROJ=ios/auxi.xcodeproj/project.pbxproj
ARCHIVE_DIR="${TMPDIR:-/tmp}/auxi-archive"

# 1. Bump build number if provided — validate it's a positive integer first
if [[ "${1:-}" ]]; then
  if ! [[ "$1" =~ ^[0-9]+$ ]]; then
    echo "Error: build number must be a positive integer (got: '$1')" >&2
    exit 1
  fi
  /usr/bin/sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9]*;/CURRENT_PROJECT_VERSION = $1;/g" "$PBXPROJ"
  echo ">>> Bumped CURRENT_PROJECT_VERSION to $1"
fi

BUILD=$(grep -m1 "CURRENT_PROJECT_VERSION" "$PBXPROJ" | awk -F'= |;' '{print $2}' | tr -d ' ')
VERSION=$(grep -m1 "MARKETING_VERSION" "$PBXPROJ" | awk -F'= |;' '{print $2}' | tr -d ' ')
echo ">>> Shipping ${VERSION} build ${BUILD}"

# 2. Preflight — fail loud if Xcode 26 / iOS 26 platform missing
xcodebuild -version | head -1
xcrun --sdk iphoneos --show-sdk-version

# 2b. Sentry preflight — Bundle RN + Upload Debug Symbols build phases
# wrap sentry-cli, which needs auth (sentry.properties OR SENTRY_AUTH_TOKEN).
# Without it the archive dies ~10 minutes in with cryptic
# "Node: cannot execute binary file" or sourcemap collection errors.
# Fail loud now.
if grep -q "SENTRY_DISABLE_AUTO_UPLOAD=true" "$PBXPROJ"; then
  echo ">>> Sentry uploads disabled in build phase — skipping creds check"
elif [ -f ios/sentry.properties ] || [ -n "${SENTRY_AUTH_TOKEN:-}" ]; then
  echo ">>> Sentry creds detected (sentry.properties or SENTRY_AUTH_TOKEN)"
else
  cat >&2 <<'SENTRY_ERR'
ERROR: Sentry sourcemap upload requires auth but none found.

The "Bundle React Native code and images" + "Upload Debug Symbols to Sentry"
build phases call sentry-cli, which needs auth or it will fail the archive.

Pick one fix:
  (a) Persistent: create ios/sentry.properties (gitignored) with
        defaults.org=auxi
        defaults.project=react-native
        auth.token=<from sentry.io/settings/account/api/auth-tokens/>
  (b) One-shot: export SENTRY_AUTH_TOKEN=<token> before re-running
  (c) Ship without sourcemap: add `export SENTRY_DISABLE_AUTO_UPLOAD=true`
      to the affected build phase shellScript in ios/auxi.xcodeproj/project.pbxproj
SENTRY_ERR
  exit 1
fi

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
  --apiKey "$API_KEY_ID" --apiIssuer "$API_ISSUER"

# 7. Upload (require explicit yes)
read -p ">>> Validation OK. Upload to TestFlight? [y/N] " yn
[[ "$yn" =~ ^[Yy]([Ee][Ss])?$ ]] || { echo "Skipped upload."; exit 0; }

xcrun altool --upload-app -f "$ARCHIVE_DIR/export/auxi.ipa" -t ios \
  --apiKey "$API_KEY_ID" --apiIssuer "$API_ISSUER" \
  2>&1 | tee "$ARCHIVE_DIR/upload.log"

# Parse delivery UUID from altool log (fallback to empty if upload mode/format changes)
DELIVERY_UUID=$(grep -oE 'Delivery UUID: [a-f0-9-]+' "$ARCHIVE_DIR/upload.log" | awk '{print $3}' || true)
[ -z "$DELIVERY_UUID" ] && echo ">>> WARN: could not parse Delivery UUID from altool log"

# 8. Tag the release
TAG="v${VERSION}-build${BUILD}"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo ">>> Tag $TAG already exists — skipping git tag"
else
  git tag -a "$TAG" -m "TestFlight upload ${VERSION} build ${BUILD}"
  echo ">>> Tagged $TAG (push manually: git push origin $TAG)"
fi

# 9. Emit release-metadata.env for auxi-launch-notify auto-chain.
# Source via: set -a; source $ARCHIVE_DIR/release-metadata.env; set +a
COMMIT_SHA=$(git rev-parse HEAD)
BRANCH_NAME=$(git branch --show-current 2>/dev/null || echo "detached")
META_FILE="$ARCHIVE_DIR/release-metadata.env"
cat > "$META_FILE" <<META_EOF
BUILD_NUMBER=$BUILD
MARKETING_VERSION=$VERSION
TAG=$TAG
DELIVERY_UUID=$DELIVERY_UUID
COMMIT_SHA=$COMMIT_SHA
BRANCH=$BRANCH_NAME
META_EOF

echo ""
echo "=============================================="
echo "Done. Build $BUILD uploaded."
echo "Tag: $TAG | Delivery UUID: ${DELIVERY_UUID:-<unparsed>}"
echo "Metadata: $META_FILE"
echo ""
echo "Next step — auto-chain to launch notification:"
echo "  Invoke the auxi-launch-notify skill (Claude reads $META_FILE)"
echo "  OR manually:  set -a; source $META_FILE; set +a"
echo "Check email + App Store Connect → TestFlight in 5–30 min."
echo "=============================================="
