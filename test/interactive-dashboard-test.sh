#!/bin/bash
#
# Interactive Dashboard Test Script
#
# Runs through dashboard features and logs results for later analysis.
# Each test asks the user to confirm if the output matches expectations.
#
# Usage: ./test/interactive-dashboard-test.sh
#
# Log file: test/interactive-test-results.log
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/interactive-test-results.log"
ATLAS_BIN="$PROJECT_DIR/bin/atlas.js"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Initialize log file
init_log() {
  cat > "$LOG_FILE" << EOF
================================================================================
ATLAS DASHBOARD INTERACTIVE TEST LOG
================================================================================
Date: $(date '+%Y-%m-%d %H:%M:%S')
Branch: $(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo "unknown")
Commit: $(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
Node: $(node --version)
Terminal: $TERM
Size: $(tput cols)x$(tput lines)
================================================================================

EOF
}

# Log message
log() {
  echo "$@" >> "$LOG_FILE"
}

# Log with timestamp
log_ts() {
  echo "[$(date '+%H:%M:%S')] $@" >> "$LOG_FILE"
}

# Print header
print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  log ""
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "TEST: $1"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Print test step
print_step() {
  echo -e "${YELLOW}▶${NC} $1"
  log_ts "STEP: $1"
}

# Print expected behavior
print_expected() {
  echo -e "${CYAN}Expected:${NC}"
  echo -e "  $1"
  log "EXPECTED: $1"
}

# Ask user for result
ask_result() {
  local test_name="$1"
  local options="${2:-ynsp}"

  TESTS_RUN=$((TESTS_RUN + 1))

  echo ""
  echo -e "${BOLD}Did it work as expected?${NC}"

  if [[ "$options" == *"y"* ]]; then echo -e "  ${GREEN}y${NC} = Yes, it worked"; fi
  if [[ "$options" == *"n"* ]]; then echo -e "  ${RED}n${NC} = No, something was wrong"; fi
  if [[ "$options" == *"s"* ]]; then echo -e "  ${YELLOW}s${NC} = Skip this test"; fi
  if [[ "$options" == *"p"* ]]; then echo -e "  ${BLUE}p${NC} = Partially worked"; fi
  if [[ "$options" == *"q"* ]]; then echo -e "  ${RED}q${NC} = Quit testing"; fi

  echo -n "> "
  read -n 1 result
  echo ""

  case "$result" in
    y|Y)
      echo -e "${GREEN}✓ PASSED${NC}"
      log_ts "RESULT: PASSED"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      return 0
      ;;
    n|N)
      echo -e "${RED}✗ FAILED${NC}"
      echo -n "Describe what went wrong (or press Enter to skip): "
      read error_desc
      log_ts "RESULT: FAILED"
      log "ERROR: $error_desc"
      TESTS_FAILED=$((TESTS_FAILED + 1))
      return 1
      ;;
    p|P)
      echo -e "${YELLOW}◐ PARTIAL${NC}"
      echo -n "Describe what worked and what didn't: "
      read partial_desc
      log_ts "RESULT: PARTIAL"
      log "PARTIAL: $partial_desc"
      TESTS_FAILED=$((TESTS_FAILED + 1))
      return 1
      ;;
    s|S)
      echo -e "${YELLOW}⊘ SKIPPED${NC}"
      log_ts "RESULT: SKIPPED"
      TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
      TESTS_RUN=$((TESTS_RUN - 1))
      return 0
      ;;
    q|Q)
      echo -e "${RED}Quitting tests...${NC}"
      log_ts "RESULT: QUIT"
      print_summary
      exit 0
      ;;
    *)
      echo -e "${YELLOW}Invalid input, treating as skip${NC}"
      log_ts "RESULT: SKIPPED (invalid input)"
      TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
      TESTS_RUN=$((TESTS_RUN - 1))
      return 0
      ;;
  esac
}

# Capture screenshot info
capture_state() {
  log ""
  log "--- State Capture ---"
  log "Terminal size: $(tput cols)x$(tput lines)"
  log "Current time: $(date '+%H:%M:%S')"
  log "---"
  log ""
}

# Wait for user to press key
wait_key() {
  echo ""
  echo -e "${YELLOW}Press any key to continue...${NC}"
  read -n 1 -s
  echo ""
}

# Run a command and log output
run_cmd() {
  local cmd="$1"
  local timeout="${2:-5}"

  log_ts "COMMAND: $cmd"
  log "--- Output Start ---"

  # Run command with timeout and capture output
  if output=$(timeout "$timeout" bash -c "$cmd" 2>&1); then
    log "$output"
    log "--- Output End (exit: 0) ---"
    echo "$output"
    return 0
  else
    local exit_code=$?
    log "$output"
    log "--- Output End (exit: $exit_code) ---"
    echo "$output"
    return $exit_code
  fi
}

# Print summary
print_summary() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}  TEST SUMMARY${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  Total tests:  ${BOLD}$TESTS_RUN${NC}"
  echo -e "  ${GREEN}Passed:${NC}       ${GREEN}$TESTS_PASSED${NC}"
  echo -e "  ${RED}Failed:${NC}       ${RED}$TESTS_FAILED${NC}"
  echo -e "  ${YELLOW}Skipped:${NC}      ${YELLOW}$TESTS_SKIPPED${NC}"
  echo ""

  if [[ $TESTS_FAILED -eq 0 && $TESTS_RUN -gt 0 ]]; then
    echo -e "  ${GREEN}${BOLD}All tests passed! 🎉${NC}"
  elif [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "  ${RED}${BOLD}Some tests failed. Check log: $LOG_FILE${NC}"
  fi
  echo ""

  log ""
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "SUMMARY"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Total: $TESTS_RUN | Passed: $TESTS_PASSED | Failed: $TESTS_FAILED | Skipped: $TESTS_SKIPPED"
  log "End time: $(date '+%Y-%m-%d %H:%M:%S')"
}

# ============================================================================
# TEST CASES
# ============================================================================

test_dashboard_launch() {
  print_header "Test 1: Dashboard Launch"

  print_step "Launch the dashboard with: node $ATLAS_BIN dash"
  print_expected "Dashboard opens with project list, sidebar, and command bar at bottom"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Observe the dashboard layout"
  echo "  3. Press 'q' to quit the dashboard"
  echo "  4. Return here to report result"
  echo ""

  capture_state
  wait_key

  ask_result "Dashboard Launch"
}

test_navigation() {
  print_header "Test 2: Navigation"

  print_step "Test arrow key navigation in project list"
  print_expected "Up/Down arrows move selection, selection is highlighted"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Press Up/Down arrows to navigate"
  echo "  3. Verify selection highlight moves"
  echo "  4. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Navigation"
}

test_detail_view() {
  print_header "Test 3: Detail View"

  print_step "Test Enter key to open detail view"
  print_expected "Pressing Enter on a project shows detailed view with project info"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Select a project with arrow keys"
  echo "  3. Press Enter"
  echo "  4. Verify detail view appears"
  echo "  5. Press Esc to go back"
  echo "  6. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Detail View"
}

test_focus_mode() {
  print_header "Test 4: Focus Mode (f key)"

  print_step "Test focus mode with Pomodoro timer"
  print_expected "Large centered timer, progress bar, session info"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Press 'f' to enter focus mode"
  echo "  3. Verify timer appears (should show 25:00 or countdown)"
  echo "  4. Verify progress bar is visible"
  echo "  5. Press Space to pause/resume"
  echo "  6. Press Esc to exit"
  echo "  7. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Focus Mode"
}

test_zen_mode() {
  print_header "Test 5: Zen Mode (z key)"

  print_step "Test minimal Zen mode"
  print_expected "Minimal UI with: project name, timer, progress bar, streak info"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Press 'z' to enter Zen mode"
  echo "  3. Verify minimal display appears with:"
  echo "     - Project name (or 'No session')"
  echo "     - Status indicator (● FOCUS or ◑ PAUSED)"
  echo "     - Large timer display"
  echo "     - Progress bar"
  echo "     - 'Day X | Y 🍅 today' line"
  echo "  4. Press Space to pause/resume"
  echo "  5. Press Esc to exit"
  echo "  6. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Zen Mode"
}

test_zen_timer_update() {
  print_header "Test 6: Zen Mode Timer Updates"

  print_step "Verify timer updates in Zen mode"
  print_expected "Timer counts down every second, progress bar advances"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Press 'z' to enter Zen mode"
  echo "  3. Wait 5-10 seconds"
  echo "  4. Verify timer is counting down (seconds change)"
  echo "  5. Verify progress bar is advancing"
  echo "  6. Press Esc to exit"
  echo "  7. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Zen Mode Timer Updates"
}

test_focus_to_zen_switch() {
  print_header "Test 7: Switch from Focus to Zen"

  print_step "Test switching between Focus and Zen modes"
  print_expected "Can switch from Focus to Zen with 'z', timer state preserved"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Press 'f' to enter Focus mode"
  echo "  3. Note the timer value"
  echo "  4. Press 'z' to switch to Zen mode"
  echo "  5. Verify timer is approximately the same"
  echo "  6. Press Esc to exit"
  echo "  7. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Focus to Zen Switch"
}

test_theme_cycling() {
  print_header "Test 8: Theme Cycling (t key)"

  print_step "Test theme switching"
  print_expected "Colors change when pressing 't' (default → dark → minimal → default)"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Note the current colors (should be blue)"
  echo "  3. Press 't' to cycle theme"
  echo "  4. Verify status bar shows 'Theme: dark'"
  echo "  5. Press 't' again"
  echo "  6. Verify status bar shows 'Theme: minimal'"
  echo "  7. Press 't' again"
  echo "  8. Verify back to 'Theme: default'"
  echo "  9. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Theme Cycling"
}

test_decision_helper() {
  print_header "Test 9: Decision Helper (d key)"

  print_step "Test decision helper dialog"
  print_expected "Dialog with time-of-day context and project suggestions"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Press 'd' to open decision helper"
  echo "  3. Verify dialog appears with:"
  echo "     - Time context (🌅 Morning, ☀️ Afternoon, etc.)"
  echo "     - Project suggestions with reasons"
  echo "  4. Press any key to close"
  echo "  5. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Decision Helper"
}

test_filter_keys() {
  print_header "Test 10: Filter Keys (a/p/*)"

  print_step "Test project filtering"
  print_expected "Pressing 'a' shows only active, 'p' only paused, '*' shows all"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Note total project count"
  echo "  3. Press 'a' to filter active"
  echo "  4. Verify filter bar shows 'Filter: active'"
  echo "  5. Press 'p' to filter paused"
  echo "  6. Verify filter bar shows 'Filter: paused'"
  echo "  7. Press '*' to show all"
  echo "  8. Verify all projects visible again"
  echo "  9. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Filter Keys"
}

test_search() {
  print_header "Test 11: Search (/ key)"

  print_step "Test project search"
  print_expected "Pressing '/' opens search, typing filters projects"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Press '/' to start search"
  echo "  3. Type part of a project name"
  echo "  4. Press Enter"
  echo "  5. Verify list is filtered"
  echo "  6. Press '*' to clear filter"
  echo "  7. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Search"
}

test_help_dialog() {
  print_header "Test 12: Help Dialog (? key)"

  print_step "Test help dialog"
  print_expected "Help shows all keyboard shortcuts including Zen mode"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Press '?' to open help"
  echo "  3. Verify dialog shows:"
  echo "     - Navigation keys"
  echo "     - Action keys (s, e, c, r, o)"
  echo "     - Filter keys (/, a, p, *, d, t)"
  echo "     - Focus/Zen mode section with 'z' key"
  echo "  4. Press any key to close"
  echo "  5. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Help Dialog"
}

test_escape_handling() {
  print_header "Test 13: Escape Key Handling"

  print_step "Test Escape key in different contexts"
  print_expected "Escape returns to previous view in all modes"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Press Enter on a project → Esc should return to main"
  echo "  3. Press 'f' for focus mode → Esc should return to main"
  echo "  4. Press 'z' for zen mode → Esc should return to main"
  echo "  5. Verify each Escape works correctly"
  echo "  6. Press 'q' to quit"
  echo ""

  capture_state
  wait_key

  ask_result "Escape Handling"
}

test_quit_behavior() {
  print_header "Test 14: Quit Behavior"

  print_step "Test quit from different states"
  print_expected "'q' exits dashboard cleanly from any view"

  echo ""
  echo -e "${BOLD}Instructions:${NC}"
  echo "  1. Run: node $ATLAS_BIN dash"
  echo "  2. Press 'q' from main view - should quit"
  echo "  3. Run again, enter detail view, press 'q' - should return to main"
  echo "  4. Run again, enter focus mode, press 'q' - should return to main (timer running)"
  echo "  5. Verify no errors in terminal after quit"
  echo ""

  capture_state
  wait_key

  ask_result "Quit Behavior"
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  clear
  echo -e "${BOLD}${CYAN}"
  echo "  ╔═══════════════════════════════════════════════════════════════════╗"
  echo "  ║           ATLAS DASHBOARD INTERACTIVE TEST SUITE                  ║"
  echo "  ╠═══════════════════════════════════════════════════════════════════╣"
  echo "  ║  This script will guide you through manual testing of the        ║"
  echo "  ║  dashboard features. Results are logged for later analysis.      ║"
  echo "  ║                                                                   ║"
  echo "  ║  Log file: test/interactive-test-results.log                     ║"
  echo "  ╚═══════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo ""
  echo -e "${YELLOW}Prerequisites:${NC}"
  echo "  • Terminal at least 80x24"
  echo "  • Node.js installed"
  echo "  • In atlas project directory"
  echo ""
  echo -e "${BOLD}Press Enter to start testing, or 'q' to quit...${NC}"
  read -n 1 start_key

  if [[ "$start_key" == "q" || "$start_key" == "Q" ]]; then
    echo "Cancelled."
    exit 0
  fi

  # Initialize
  init_log
  log_ts "Starting interactive test session"

  # Run tests
  test_dashboard_launch
  test_navigation
  test_detail_view
  test_focus_mode
  test_zen_mode
  test_zen_timer_update
  test_focus_to_zen_switch
  test_theme_cycling
  test_decision_helper
  test_filter_keys
  test_search
  test_help_dialog
  test_escape_handling
  test_quit_behavior

  # Summary
  print_summary

  echo ""
  echo -e "${CYAN}Log saved to: ${BOLD}$LOG_FILE${NC}"
  echo ""
}

# Run main
main "$@"
