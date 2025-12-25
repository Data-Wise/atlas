#!/bin/bash
#
# Atlas Interactive Dog-fooding Test
# Run through all features to verify real-world usage
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Counters
PASSED=0
FAILED=0
SKIPPED=0

pause() {
  echo ""
  read -p "Press Enter to continue... " </dev/tty
}

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

  echo -e "\n${YELLOW}Testing:${NC} $name"
  echo -e "${BLUE}Command:${NC} $cmd"

  output=$(eval "$cmd" 2>&1) || true

  if [[ "$output" == *"$expect"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - Found: '$expect'"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} - Expected '$expect' not found"
    echo "Got: $output"
    ((FAILED++))
  fi
}

interactive() {
  local name="$1"
  local cmd="$2"
  local description="$3"

  echo -e "\n${YELLOW}▶ $name${NC}"
  echo -e "  ${description}"
  echo -e "  ${BLUE}Command:${NC} $cmd"
  echo ""

  read -p "Run this command? [Y/n/s(kip)] " response </dev/tty
  response=${response:-y}

  case "$response" in
    [Yy]* )
      echo -e "${BLUE}Output:${NC}"
      eval "$cmd" 2>&1 | head -20
      echo ""
      read -p "Did it work? [Y/n] " worked </dev/tty
      worked=${worked:-y}
      if [[ "$worked" =~ ^[Yy] ]]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
      else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
      fi
      ;;
    [Ss]* )
      echo -e "${YELLOW}⊘ SKIPPED${NC}"
      ((SKIPPED++))
      ;;
    * )
      echo -e "${YELLOW}⊘ SKIPPED${NC}"
      ((SKIPPED++))
      ;;
  esac
}

# ============================================================================
# START
# ============================================================================

clear
echo -e "${BOLD}"
echo "    _   _____ _        _    ____  "
echo "   / \ |_   _| |      / \  / ___| "
echo "  / _ \  | | | |     / _ \ \___ \ "
echo " / ___ \ | | | |___ / ___ \ ___) |"
echo "/_/   \_\|_| |_____/_/   \_\____/ "
echo ""
echo "       Interactive Dog-fooding Test"
echo -e "${NC}"
echo "This script tests Atlas features interactively."
echo "You'll verify each feature works in real-world usage."
echo ""
pause

# ============================================================================
# VERSION & HELP
# ============================================================================

header "1. Basic Commands"

check "Version flag" "atlas --version" "0.1.0"
check "Help output" "atlas --help" "Usage: atlas"
check "Help shows config" "atlas --help" "config"

# ============================================================================
# CONFIG
# ============================================================================

header "2. Configuration"

check "Config paths" "atlas config paths" "Configured scan paths"
check "Config show" "atlas config show" "scanPaths"

interactive "Add a test path" \
  "atlas config add-path /tmp/atlas-test-projects" \
  "Add a temporary test path to config"

# ============================================================================
# SYNC
# ============================================================================

header "3. Project Sync"

check "Sync dry-run" "atlas sync --dry-run" "projects"

interactive "Full sync" \
  "atlas sync" \
  "Sync all configured paths and save to registry"

# ============================================================================
# PROJECT LIST
# ============================================================================

header "4. Project Management"

interactive "List projects" \
  "atlas project list --format table | head -15" \
  "Show all discovered projects"

interactive "List as JSON" \
  "atlas project list --format json | head -10" \
  "JSON output for scripting"

# ============================================================================
# STATUS
# ============================================================================

header "5. Status Commands"

interactive "Global status" \
  "atlas status" \
  "Show overall status across all projects"

interactive "Project status" \
  "atlas status atlas" \
  "Show status for a specific project"

# ============================================================================
# SESSION
# ============================================================================

header "6. Session Management"

interactive "Start session" \
  "atlas session start atlas" \
  "Start a work session on atlas project"

interactive "Session status" \
  "atlas session status" \
  "Check current session"

interactive "End session" \
  "atlas session end 'Testing dogfood script'" \
  "End the session with a note"

# ============================================================================
# CAPTURE
# ============================================================================

header "7. Quick Capture"

interactive "Capture idea" \
  "atlas catch 'Test idea from dogfood script'" \
  "Capture a quick idea"

interactive "Capture for project" \
  "atlas catch atlas 'Add more dogfood tests'" \
  "Capture idea for specific project"

interactive "View inbox" \
  "atlas inbox" \
  "Show captured items"

interactive "Inbox stats" \
  "atlas inbox --stats" \
  "Show inbox statistics"

# ============================================================================
# CONTEXT
# ============================================================================

header "8. Context & Breadcrumbs"

interactive "Leave breadcrumb" \
  "atlas crumb 'Testing breadcrumb from dogfood'" \
  "Leave a context breadcrumb"

interactive "Where am I?" \
  "atlas where" \
  "Show current context"

interactive "Breadcrumb trail" \
  "atlas trail --days 1" \
  "Show recent breadcrumbs"

# ============================================================================
# COMPLETIONS
# ============================================================================

header "9. Shell Completions"

check "ZSH completions" "atlas completions zsh | head -3" "#compdef"
check "Bash completions" "atlas completions bash | head -3" "_atlas_completions"
check "Fish completions" "atlas completions fish | head -3" "complete -c atlas"

# ============================================================================
# DASHBOARD (optional)
# ============================================================================

header "10. Dashboard (Optional)"

echo -e "${YELLOW}The dashboard is a TUI that requires a full terminal.${NC}"
echo "It may not work well in all environments."
read -p "Try launching dashboard? [y/N] " try_dash </dev/tty
if [[ "$try_dash" =~ ^[Yy] ]]; then
  echo "Launching dashboard... (Press 'q' to quit)"
  sleep 1
  atlas dashboard || echo "Dashboard exited"
  ((PASSED++))
else
  echo -e "${YELLOW}⊘ SKIPPED${NC}"
  ((SKIPPED++))
fi

# ============================================================================
# CLEANUP
# ============================================================================

header "Cleanup"

echo "Removing test path from config..."
atlas config remove-path /tmp/atlas-test-projects 2>/dev/null || true
echo "Done."

# ============================================================================
# SUMMARY
# ============================================================================

header "Test Summary"

TOTAL=$((PASSED + FAILED + SKIPPED))

echo ""
echo -e "  ${GREEN}Passed:${NC}  $PASSED"
echo -e "  ${RED}Failed:${NC}  $FAILED"
echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED"
echo -e "  ${BOLD}Total:${NC}   $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All tests passed!${NC} 🎉"
else
  echo -e "${RED}${BOLD}Some tests failed.${NC} Review the output above."
fi

echo ""
echo "Dog-fooding complete. Issues found? Create them at:"
echo "  https://github.com/Data-Wise/atlas/issues"
echo ""
