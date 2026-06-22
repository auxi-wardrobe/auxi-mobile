#!/usr/bin/env bash
#
# Canonical iOS simulator build for auxi (RN 0.83.1 · React 19 · Xcode 26 · Node 20).
#
# Why this exists: build/sim flakiness on this project is NOT random — it comes
# from an unpinned toolchain:
#   1. Node version roulette  — no .nvmrc, nvm default drifts (16 → 23). Fixed by .nvmrc=20.
#   2. watchman missing       — Metro file-watch unreliable → Fast Refresh trượt → sim giữ bundle CŨ.
#   3. multiple dev servers   — many Metro/vite on different ports → "đang nhìn bundle nào?".
#   4. pods drift             — switch branch thêm native dep mà không pod install → link error.
# This script forces ONE deterministic path so a rebuild is reproducible.
#
# Usage:
#   ./scripts/ios-clean-rebuild.sh            # full clean rebuild + launch sim
#   ./scripts/ios-clean-rebuild.sh --check    # preflight doctor only (read-only, no mutation)
#   ./scripts/ios-clean-rebuild.sh --no-build # reset env + caches + pods, skip the build
#   ./scripts/ios-clean-rebuild.sh --yes      # skip the concurrency confirm (use ONLY when no other session is live)
#
# CONCURRENCY: Metro :8081 / the Simulator / watchman are ONE shared machine
# singleton. The mutating steps below (kill Metro, watchman reset, pod install,
# rebuild) are GLOBAL — they disrupt EVERY other Claude Code session (qa-ui
# screenshots, a running app). So mutation requires consent: it refuses to run
# non-interactively unless --yes is passed, and prompts y/N on a TTY.
#
# See docs/ios-build-troubleshooting.md for the escalation ladder.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="full"
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --check)     MODE="check" ;;
    --no-build)  MODE="nobuild" ;;
    --yes|-y)    ASSUME_YES=1 ;;
    "")          ;;
    *) echo "Unknown arg: ${arg}. Use --check | --no-build | --yes."; exit 2 ;;
  esac
done

bold() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
err()  { printf '  \033[31m✗\033[0m %s\n' "$1"; }

FAIL=0

# --- Node: pin via nvm + .nvmrc -----------------------------------------
bold "Node (cần >=20 — xem .nvmrc)"
WANT="$(cat "$ROOT/.nvmrc" 2>/dev/null || echo 20)"
NVM_SH="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
if [ -s "$NVM_SH" ]; then
  # shellcheck disable=SC1090
  . "$NVM_SH"
  if ! nvm use >/dev/null 2>&1; then
    warn "Node $WANT chưa cài — đang cài qua nvm"
    nvm install "$WANT" >/dev/null 2>&1 && nvm use >/dev/null 2>&1 || true
  fi
else
  warn "nvm không thấy — bỏ qua việc tự chọn Node"
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "${NODE_MAJOR}" -ge 20 ] 2>/dev/null; then
  ok "node $(node -v)"
else
  err "node $(node -v 2>/dev/null || echo 'missing') — auxi cần >=20. Chạy: nvm install 20 && nvm use"
  FAIL=1
fi

# --- Xcode ---------------------------------------------------------------
bold "Xcode"
if command -v xcodebuild >/dev/null 2>&1; then
  ok "$(xcodebuild -version | head -1) @ $(xcode-select -p)"
else
  err "xcodebuild không thấy — mở Xcode 1 lần hoặc xcode-select --install"; FAIL=1
fi

# --- CocoaPods -----------------------------------------------------------
bold "CocoaPods"
if command -v pod >/dev/null 2>&1; then ok "pod $(pod --version)"; else err "cocoapods chưa cài (brew install cocoapods)"; FAIL=1; fi

# --- Watchman (root cause #2 của stale-bundle) ---------------------------
bold "Watchman"
if command -v watchman >/dev/null 2>&1; then
  ok "watchman đã cài"
else
  warn "watchman CHƯA cài → Fast Refresh hay trượt, sim giữ bundle CŨ. Cài 1 lần: brew install watchman"
fi

# --- Stray dev servers ---------------------------------------------------
bold "Dev servers (Metro :8081)"
METRO_PIDS="$(lsof -nP -iTCP:8081 -sTCP:LISTEN -t 2>/dev/null || true)"
if [ -n "$METRO_PIDS" ]; then warn "Metro đang giữ :8081 (pid: $(echo "$METRO_PIDS" | tr '\n' ' '))"; else ok ":8081 trống"; fi

if [ "$MODE" = "check" ]; then
  bold "Preflight xong (read-only)."
  [ "$FAIL" -eq 0 ] && ok "Môi trường OK. Bỏ --check để clean rebuild." || err "Sửa các mục ✗ ở trên trước khi build."
  exit "$FAIL"
fi

[ "$FAIL" -eq 0 ] || { err "Preflight có lỗi — dừng. Chạy --check để xem chi tiết."; exit 1; }

# --- Concurrency guard: the steps below are GLOBAL (kill the one shared Metro,
#     reset watchman, pod install, rebuild) and WILL disrupt every other Claude
#     Code session mid qa-ui / running app. Require explicit consent. ----------
bold "⚠️  Các bước tiếp theo là GLOBAL & destructive"
warn "Sẽ kill Metro :8081 + reset watchman + pod install + rebuild → GIÁN ĐOẠN mọi session CC khác (qa-ui, app đang chạy)."
if [ "$ASSUME_YES" -ne 1 ]; then
  if [ -t 0 ]; then
    printf '  Chắc chắn không có session nào đang chạy? Tiếp tục? [y/N] '
    read -r reply
    case "$reply" in
      y|Y|yes|YES) ;;
      *) echo "  Huỷ — không có gì bị thay đổi."; exit 0 ;;
    esac
  else
    err "Không phải TTY và thiếu --yes → TỪ CHỐI để khỏi phá session khác."
    err "Nếu chắc chắn không có session nào đang chạy, chạy lại với: yarn ios:clean --yes"
    exit 3
  fi
fi

# === MUTATING STEPS ======================================================
bold "Dọn Metro + caches"
if [ -n "$METRO_PIDS" ]; then echo "$METRO_PIDS" | xargs kill 2>/dev/null || true; ok "killed Metro :8081"; fi
if command -v watchman >/dev/null 2>&1; then watchman watch-del-all >/dev/null 2>&1 || true; ok "watchman reset"; fi
rm -rf "${TMPDIR:-/tmp}"/metro-* "${TMPDIR:-/tmp}"/haste-map-* 2>/dev/null || true
rm -rf ios/build 2>/dev/null || true
ok "metro / haste / ios-build caches cleared"

bold "pod install (giữ nguyên static linkage — bản đang chạy ổn)"
( cd ios && { bundle exec pod install 2>/dev/null || pod install; } )
ok "pods installed"

if [ "$MODE" = "nobuild" ]; then
  bold "Bỏ qua build (--no-build). Khi sẵn sàng chạy: yarn ios:sim"
  exit 0
fi

bold "Build + launch simulator"
open -a Simulator 2>/dev/null || true
yarn ios
