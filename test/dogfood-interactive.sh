#!/bin/bash
#
# Atlas Interactive Dogfood Test
#
# Walk through all Atlas features with pauses to inspect output.
# Usage: ./test/dogfood-interactive.sh
#

ATLAS="node $(dirname "$0")/../bin/atlas.js"

# Colors
G='\033[0;32m'  # Green
B='\033[0;34m'  # Blue
Y='\033[1;33m'  # Yellow
C='\033[0;36m'  # Cyan
R='\033[0;31m'  # Red
N='\033[0m'     # No color

header() {
  echo ""
  echo -e "${B}══════════════════════════════════════════════════════════${N}"
  echo -e "${B}  $1${N}"
  echo -e "${B}══════════════════════════════════════════════════════════${N}"
}

run() {
  echo ""
  echo -e "${C}\$ $1${N}"
  echo -e "${Y}────────────────────────────────────────────────────────${N}"
  eval "$1"
  echo -e "${Y}────────────────────────────────────────────────────────${N}"
}

check() {
  echo -e "${G}✓ Expected: $1${N}"
}

wait() {
  echo ""
  echo -e "${G}[Enter to continue]${N}"
  read -r
}

# ============================================================================
clear
echo -e "${G}"
cat << 'EOF'
   _  _____ _      _   ___   ___  ___  ___ ___ ___  ___  ___
  /_\|_   _| |    /_\ / __| |   \/ _ \/ __| __/ _ \/ _ \|   \
 / _ \ | | | |__ / _ \\__ \ | |) | (_) \__ \ _| (_) | (_) | |) |
/_/ \_\|_| |____/_/ \_\___/ |___/\___/|___/_| \___/ \___/|___/

              Interactive Dogfood Test
EOF
echo -e "${N}"
echo "This will test all Atlas features. Review each output carefully."
wait

# ============================================================================
header "1. VERSION & HELP"
run "$ATLAS --version"
check "0.1.0"
wait

# ============================================================================
header "2. PROJECT LIST (Value Object Fix)"
run "$ATLAS project list | head -10"
check "Type column shows 'node', 'python' - NOT 'ProjectType { _value: ... }'"
wait

# ============================================================================
header "3. PROJECT SHOW (Formatted Output)"
run "$ATLAS project show atlas"
check "Formatted status with emojis - NOT raw JSON object"
wait

# ============================================================================
header "4. SESSION WORKFLOW"

# Clean slate
$ATLAS session end "cleanup" 2>/dev/null || true

run "$ATLAS session status"
check "No active session"

run "$ATLAS session start atlas"
check "Session started message"

run "$ATLAS session status"
check "Active: atlas (0m)"

sleep 1
run "$ATLAS session end 'Dogfood test'"
check "Session ended (Xm) - NOT (undefined)"
wait

# ============================================================================
header "5. CAPTURE & INBOX"

TS=$(date +%s)
run "$ATLAS catch 'Dogfood idea $TS'"
check "Captured message"

run "$ATLAS inbox | head -8"
check "Shows recent captures"

run "$ATLAS inbox --stats"
check "Shows inbox statistics"
wait

# ============================================================================
header "6. BREADCRUMBS"

run "$ATLAS crumb 'Dogfood checkpoint $TS'"
check "Breadcrumb created"

run "$ATLAS trail | head -6"
check "Recent breadcrumbs with timestamps"
wait

# ============================================================================
header "7. CONTEXT (where)"

$ATLAS session start atlas 2>/dev/null || true
run "$ATLAS where"
check "Current context with project info"
$ATLAS session end "where test" 2>/dev/null || true
wait

# ============================================================================
header "8. STATUS"

run "$ATLAS status"
check "Workflow status with today's stats"
wait

# ============================================================================
header "9. SYNC (dry-run)"

run "$ATLAS sync --dry-run"
check "Shows what would sync"
wait

# ============================================================================
header "10. CONFIG"

run "$ATLAS config paths"
check "Scan paths list"
wait

# ============================================================================
header "11. DASHBOARD (optional)"

echo -e "${Y}Test dashboard? Press 'q' to exit it. [y/N]${N}"
read -r -n 1 ans
echo ""
if [[ "$ans" == "y" ]]; then
  $ATLAS dash
fi

# ============================================================================
header "COMPLETE"

echo ""
echo -e "${G}All tests done!${N}"
echo ""
echo "Key fixes verified:"
echo "  • project list: types as strings"
echo "  • project show: formatted output"
echo "  • session end: duration displays correctly"
echo ""
