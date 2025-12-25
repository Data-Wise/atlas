#!/bin/bash
#
# Atlas Automated Dog-fooding Test
# Non-interactive version - runs all tests automatically
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

# Counters
PASSED=0
FAILED=0

header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check() {
  local name="$1"
  local cmd="$2"
  local expect="$3"

  echo -e "${YELLOW}Testing:${NC} $name"

  output=$(eval "$cmd" 2>&1) || true

  if [[ "$output" == *"$expect"* ]]; then
    echo -e "  ${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "  ${RED}✗ FAIL${NC} - Expected '$expect'"
    echo "  Got: ${output:0:100}..."
    ((FAILED++))
  fi
}

run() {
  local name="$1"
  local cmd="$2"

  echo -e "${YELLOW}Running:${NC} $name"
  if output=$(eval "$cmd" 2>&1); then
    echo -e "  ${GREEN}✓ OK${NC}"
    echo "$output" | head -3 | sed 's/^/  /'
    ((PASSED++))
  else
    echo -e "  ${RED}✗ ERROR${NC}"
    echo "$output" | head -3 | sed 's/^/  /'
    ((FAILED++))
  fi
}

# ============================================================================
# START
# ============================================================================

echo -e "${BOLD}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        ATLAS - Automated Dog-fooding Test                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# 1. BASIC COMMANDS
# ============================================================================

header "1. Basic Commands"

check "Version" "atlas --version" "0.1.0"
check "Help" "atlas --help" "Usage: atlas"
check "Help shows commands" "atlas --help" "session"

# ============================================================================
# 2. CONFIG
# ============================================================================

header "2. Configuration"

check "Config paths" "atlas config paths" "Configured scan paths"
check "Config show" "atlas config show" "scanPaths"
run "Add test path" "atlas config add-path /tmp/atlas-dogfood-test"

# ============================================================================
# 3. SYNC
# ============================================================================

header "3. Project Sync"

check "Sync dry-run" "atlas sync --dry-run" "projects"
run "Full sync" "atlas sync"

# ============================================================================
# 4. PROJECT LIST
# ============================================================================

header "4. Project Management"

run "List projects" "atlas project list --format json | head -5"
check "Project list format" "atlas project list --format json" "["

# ============================================================================
# 5. STATUS
# ============================================================================

header "5. Status Commands"

run "Global status" "atlas status"
run "Project status (atlas)" "atlas status atlas"
check "Status help" "atlas status --help" "--set"

# ============================================================================
# 6. SESSION
# ============================================================================

header "6. Session Management"

run "Start session" "atlas session start atlas"
run "Session status" "atlas session status"
run "End session" "atlas session end 'Automated dogfood test'"

# ============================================================================
# 7. CAPTURE
# ============================================================================

header "7. Quick Capture"

run "Capture idea" "atlas catch 'Dogfood test capture $(date +%H:%M:%S)'"
run "Capture for project" "atlas catch atlas 'Test capture for atlas'"
check "Inbox" "atlas inbox" ""
check "Inbox stats" "atlas inbox --stats" "INBOX STATS"

# ============================================================================
# 8. CONTEXT
# ============================================================================

header "8. Context & Breadcrumbs"

run "Leave breadcrumb" "atlas crumb 'Dogfood test breadcrumb'"
run "Where am I" "atlas where"
run "Trail" "atlas trail --days 1"

# ============================================================================
# 9. COMPLETIONS
# ============================================================================

header "9. Shell Completions"

check "ZSH" "atlas completions zsh | head -1" "#compdef"
check "Bash" "atlas completions bash | head -1" "_atlas"
check "Fish" "atlas completions fish | head -1" "complete"

# ============================================================================
# CLEANUP
# ============================================================================

header "Cleanup"

atlas config remove-path /tmp/atlas-dogfood-test 2>/dev/null || true
echo "Removed test path"

# ============================================================================
# SUMMARY
# ============================================================================

header "Test Summary"

TOTAL=$((PASSED + FAILED))

echo ""
echo -e "  ${GREEN}Passed:${NC}  $PASSED"
echo -e "  ${RED}Failed:${NC}  $FAILED"
echo -e "  ${BOLD}Total:${NC}   $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ All dog-fooding tests passed!${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}✗ $FAILED tests failed${NC}"
  exit 1
fi
