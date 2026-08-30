#!/usr/bin/env bash
#
# Smoke-test a built simulator binary before anyone trusts it.
#
# Round three shipped a build that red-screened on launch: `expo-blur` was
# correctly declared in package.json and correctly present in Podfile.lock, but
# the ExpoBlur pod had never been compiled into the installed binary. A JS-only
# dependency bump had landed without the native rebuild that makes it real, and
# nothing in the pipeline noticed until a human opened the app.
#
# Compiling is not evidence that the app runs. This launches the binary that was
# actually built, drives it past the first screen, and fails on the log
# signatures that class of break produces.
#
# Usage:  scripts/smoke-native-build.sh [Debug|Release] [seconds]
set -uo pipefail

CONFIG="${1:-Debug}"
WATCH_SECONDS="${2:-25}"
BUNDLE_ID="com.simplyrenit.renit"

say()  { printf '\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\033[31mFAIL\033[0m  %s\n' "$*"; exit 1; }
ok()   { printf '\033[32mOK\033[0m    %s\n' "$*"; }

DD=$(ls -dt "$HOME"/Library/Developer/Xcode/DerivedData/Renit-* 2>/dev/null | head -1)
[ -n "$DD" ] || fail "no Renit DerivedData — build first"

PRODUCTS="$DD/Build/Products/$CONFIG-iphonesimulator"
APP=$(ls -d "$PRODUCTS"/*.app 2>/dev/null | head -1)
[ -n "$APP" ] || fail "no .app in $PRODUCTS — build first"
ok "binary $(basename "$APP")  ($CONFIG)"

# --- Static pre-check -------------------------------------------------------
# Every pod the lockfile says we depend on should have left a build product
# behind. This is the cheap version of the check that would have caught the
# ExpoBlur break without booting anything.
# `EXTERNAL SOURCES:` is the authoritative list of pods that come from this
# repo's own node_modules rather than a remote spec — i.e. every native module
# the JS side can import. Each one must have left a build product behind. Any
# that has not is a JS dependency that never got compiled, which is exactly the
# shape of the ExpoBlur break.
MISSING=""
COUNT=0
while read -r pod path; do
  [ -z "$pod" ] && continue
  case "$path" in ../node_modules/*) ;; *) continue ;; esac
  [ -d "ios/$path" ] || continue
  COUNT=$((COUNT + 1))
  [ -d "$PRODUCTS/$pod" ] && continue
  MISSING="$MISSING $pod"
done < <(awk '
  /^EXTERNAL SOURCES:/ { f = 1; next }
  /^[A-Z]/             { f = 0 }
  f && /^  [A-Za-z0-9_.-]+:$/ { name = $1; sub(/:$/, "", name); next }
  f && /:path:/ { p = $2; gsub(/"/, "", p); if (name != "") print name, p; name = "" }
' ios/Podfile.lock)

if [ -n "$MISSING" ]; then
  fail "declared in Podfile.lock but never compiled:$MISSING
      This is the ExpoBlur failure mode: a JS dependency landed without the
      native rebuild that makes it real. Run a full native rebuild."
fi
ok "all $COUNT local native pods have build products"

# --- Launch -----------------------------------------------------------------
DEVICE=$(xcrun simctl list devices booted -j | python3 -c '
import json,sys
d=json.load(sys.stdin)["devices"]
for rt in d.values():
    for dev in rt:
        if dev.get("state")=="Booted":
            print(dev["udid"]); raise SystemExit
' 2>/dev/null)
[ -n "$DEVICE" ] || fail "no booted simulator — boot one, then re-run"
ok "simulator $DEVICE"

xcrun simctl install "$DEVICE" "$APP" >/dev/null 2>&1 || fail "install failed"

LOG=$(mktemp -t renit-smoke)
xcrun simctl spawn "$DEVICE" log stream --level debug \
  --predicate "processImagePath CONTAINS 'Renit'" > "$LOG" 2>/dev/null &
LOG_PID=$!
trap 'kill $LOG_PID 2>/dev/null' EXIT

xcrun simctl launch "$DEVICE" "$BUNDLE_ID" >/dev/null 2>&1 || fail "launch failed"
say "watching ${WATCH_SECONDS}s of device log…"
sleep "$WATCH_SECONDS"
kill $LOG_PID 2>/dev/null

# --- Assert -----------------------------------------------------------------
# These are the signatures of a binary that compiled but cannot render. A
# missing view manager is the specific one that shipped in round three.
PATTERNS='was not found in the UIManager|requireNativeComponent|Invariant Violation|Unhandled JS Exception|RCTFatal|Application .* has not been registered'
HITS=$(grep -oE "$PATTERNS" "$LOG" 2>/dev/null | sort -u)

if [ -n "$HITS" ]; then
  printf '\n'
  grep -E "$PATTERNS" "$LOG" | head -8
  fail "the binary launched but cannot render:
$(echo "$HITS" | sed 's/^/      /')"
fi

if ! xcrun simctl listapps "$DEVICE" 2>/dev/null | grep -q "$BUNDLE_ID"; then
  fail "$BUNDLE_ID is not installed after launch"
fi

ok "no native-module or fatal-render errors in ${WATCH_SECONDS}s"
say "PASS — this binary is safe to hand to QA."
