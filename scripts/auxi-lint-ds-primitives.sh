#!/usr/bin/env bash
# auxi-lint-ds-primitives.sh — WARN-mode (Phase 0 of GH-364 DS migration).
# Flags raw RN primitives used on product screens where an M* design-system
# primitive exists (src/components/design-system/lib). Heuristic, warn-only:
# exits 0 so it never fails the build until Phase 4 flips it to error.
# Run: ./scripts/auxi-lint-ds-primitives.sh
set -uo pipefail
cd "$(dirname "$0")/.."
SCAN="src/screens src/components/features src/components/layout"
echo "🔎 DS-primitive lint (warn-mode) — raw primitives with an M* equivalent"
echo "   scope: $SCAN   rule: .claude/rules/design-system-primitives-required.md"
total=0
check() {
  local label="$1" pattern="$2" suggest="$3" hits n
  # exclude the DS lib/showcase + the legacy HomeScreen
  hits=$(grep -rnE "$pattern" $SCAN --include='*.tsx' 2>/dev/null \
         | grep -vE '_HomeScreen|/design-system/' || true)
  n=$(printf '%s' "$hits" | grep -c . || true)
  if [ "${n:-0}" -gt 0 ]; then
    echo ""
    echo "⚠ ${label}: ${n} → use ${suggest}"
    printf '%s\n' "$hits" | sed 's/^/   /' | head -15
    [ "$n" -gt 15 ] && echo "   … (+$((n-15)) more)"
    total=$((total+n))
  fi
}
check "raw <Text>"                '<Text[ />]'        'MText (variant=…)'
check "raw <TextInput>"           '<TextInput'        'MInput'
check "raw <Switch>"              '<Switch'           'MSwitch'
check "raw <Modal>"               '<Modal'           'MDialog / MBottomSheet'
check "raw <TouchableOpacity>"    '<TouchableOpacity' 'MButton / MIconButton / MListRow'
check "legacy PillButton"         'PillButton'        'MButton (pill variant)'
check "legacy TopIconButton"      'TopIconButton'     'MIconButton'
echo ""
echo "— total flagged: ${total}  (WARN only — does not fail the build in Phase 0)"
exit 0
