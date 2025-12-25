#!/bin/bash
#
# Interactive Dashboard Test Script
#
# Runs through dashboard features and logs results for later analysis.
# The script launches the dashboard itself, then asks for confirmation.
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
  echo -e "${CYAN}Expected:${NC} $1"
  log "EXPECTED: $1"
}

# Print instructions (what to do in the dashboard)
print_instructions() {
  echo ""
  echo -e "${BOLD}While in dashboard:${NC}"
  for instruction in "$@"; do
    echo -e "  • $instruction"
  done
  echo -e "  • Press ${BOLD}q${NC} to quit when done"
  echo ""
}

# Ask user for result
ask_result() {
  local test_name="$1"

  TESTS_RUN=$((TESTS_RUN + 1))

  echo ""
  echo -e "${BOLD}Did it work as expected?${NC}"
  echo -e "  ${GREEN}y${NC} = Yes, it worked"
  echo -e "  ${RED}n${NC} = No, something was wrong"
  echo -e "  ${YELLOW}s${NC} = Skip this test"
  echo -e "  ${BLUE}p${NC} = Partial (worked with issues)"
  echo ""

  while true; do
    read -n 1 -p "Result [y/n/s/p]: " result
    echo ""
    case $result in
      y|Y)
        echo -e "${GREEN}✓ PASSED${NC}"
        log_ts "RESULT: PASSED"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
        ;;
      n|N)
        echo -e "${RED}✗ FAILED${NC}"
        read -p "What went wrong? " error_desc
        log_ts "RESULT: FAILED"
        log "ERROR: $error_desc"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
        ;;
      p|P)
        echo -e "${YELLOW}~ PARTIAL${NC}"
        read -p "What issues? " issue_desc
        log_ts "RESULT: PARTIAL"
        log "ISSUES: $issue_desc"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
        ;;
      s|S)
        echo -e "${YELLOW}○ SKIPPED${NC}"
        log_ts "RESULT: SKIPPED"
        TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
        TESTS_RUN=$((TESTS_RUN - 1))
        return 0
        ;;
    esac
  done
}

# Capture state before test
capture_state() {
  log ""
  log "--- State Capture ---"
  log "Terminal size: $(tput cols)x$(tput lines)"
  log "Current time: $(date '+%H:%M:%S')"
  log "---"
  log ""
}

# Launch the dashboard and wait for it to exit
launch_dashboard() {
  echo -e "${YELLOW}Launching dashboard...${NC}"
  echo ""
  log_ts "LAUNCHING: node $ATLAS_BIN dash"

  # Run dashboard in foreground - user will interact and press 'q' to quit
  node "$ATLAS_BIN" dash 2>&1 | tee -a "$LOG_FILE"
  local exit_code=$?

  echo ""
  log_ts "Dashboard exited with code: $exit_code"
  return $exit_code
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
    echo -e "  ${GREEN}${BOLD}All tests passed!${NC}"
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

  print_step "Launching dashboard to verify basic layout"
  print_expected "Project list, sidebar with stats, command bar at bottom"

  print_instructions \
    "Verify you see: project list (left), sidebar (right)" \
    "Bottom bar should show keyboard shortcuts" \
    "Projects should be listed with status icons"

  capture_state
  launch_dashboard
  ask_result "Dashboard Launch"
}

test_navigation() {
  print_header "Test 2: Navigation"

  print_step "Testing arrow key navigation in project list"
  print_expected "Up/Down arrows move selection, selection is highlighted"

  print_instructions \
    "Press Up/Down arrows to navigate projects" \
    "Selection should be highlighted (different color)" \
    "Try navigating to first and last items"

  capture_state
  launch_dashboard
  ask_result "Navigation"
}

test_detail_view() {
  print_header "Test 3: Detail View"

  print_step "Testing Enter key to open detail view"
  print_expected "Pressing Enter shows detailed project info"

  print_instructions \
    "Select a project with arrow keys" \
    "Press Enter to open detail view" \
    "Verify you see project path, status, recent files" \
    "Press Esc to go back to main view"

  capture_state
  launch_dashboard
  ask_result "Detail View"
}

test_focus_mode() {
  print_header "Test 4: Focus Mode (f key)"

  print_step "Testing focus mode with Pomodoro timer"
  print_expected "Large centered timer, progress bar, session info"

  print_instructions \
    "Press 'f' to enter focus mode" \
    "Verify timer appears (should show 25:00 or countdown)" \
    "Verify progress bar is visible" \
    "Press Space to pause/resume" \
    "Press Esc to exit focus mode"

  capture_state
  launch_dashboard
  ask_result "Focus Mode"
}

test_zen_mode() {
  print_header "Test 5: Zen Mode (z key)"

  print_step "Testing minimal Zen mode"
  print_expected "Minimal UI: project name, timer, progress bar"

  print_instructions \
    "Press 'z' to enter Zen mode" \
    "Verify minimal display with timer" \
    "Should show: project name, status indicator, timer" \
    "Press Space to pause/resume" \
    "Press Esc to exit Zen mode"

  capture_state
  launch_dashboard
  ask_result "Zen Mode"
}

test_zen_timer_update() {
  print_header "Test 6: Zen Mode Timer Updates"

  print_step "Verifying timer updates in Zen mode"
  print_expected "Timer counts down every second, progress bar advances"

  print_instructions \
    "Press 'z' to enter Zen mode" \
    "Wait 5-10 seconds watching the timer" \
    "Verify timer is counting down (seconds change)" \
    "Verify progress bar is advancing" \
    "Press Esc to exit"

  capture_state
  launch_dashboard
  ask_result "Zen Mode Timer Updates"
}

test_focus_to_zen_switch() {
  print_header "Test 7: Switch from Focus to Zen"

  print_step "Testing switching between Focus and Zen modes"
  print_expected "Can switch from Focus to Zen with 'z', timer state preserved"

  print_instructions \
    "Press 'f' to enter Focus mode" \
    "Note the timer value" \
    "Press 'z' to switch to Zen mode" \
    "Verify timer is approximately the same" \
    "Press Esc to exit"

  capture_state
  launch_dashboard
  ask_result "Focus to Zen Switch"
}

test_theme_cycling() {
  print_header "Test 8: Theme Cycling (t key)"

  print_step "Testing theme switching"
  print_expected "Colors change when pressing 't'"

  print_instructions \
    "Note the current colors (should be blue/default)" \
    "Press 't' to cycle themes" \
    "Colors should change (dark, minimal, etc.)" \
    "Press 't' multiple times to cycle through all themes"

  capture_state
  launch_dashboard
  ask_result "Theme Cycling"
}

test_session_start() {
  print_header "Test 9: Session Start (s key)"

  print_step "Testing session start functionality"
  print_expected "Pressing 's' starts a work session for selected project"

  print_instructions \
    "Select a project with arrow keys" \
    "Press 's' to start a session" \
    "Timer should appear or session indicator should update" \
    "Sidebar stats may update"

  capture_state
  launch_dashboard
  ask_result "Session Start"
}

test_session_end() {
  print_header "Test 10: Session End (e key)"

  print_step "Testing session end functionality"
  print_expected "Pressing 'e' ends the current work session"

  print_instructions \
    "If a session is active, press 'e' to end it" \
    "Session should end, stats should update" \
    "Timer should stop if running"

  capture_state
  launch_dashboard
  ask_result "Session End"
}

test_project_open() {
  print_header "Test 11: Open in Editor (o key)"

  print_step "Testing open in editor functionality"
  print_expected "Pressing 'o' opens project in default editor"

  print_instructions \
    "Select a project with arrow keys" \
    "Press 'o' to open in editor" \
    "Editor should open with project directory" \
    "(This may open VS Code, Cursor, etc.)"

  capture_state
  launch_dashboard
  ask_result "Open in Editor"
}

test_filter_toggle() {
  print_header "Test 12: Filter Toggle (/ key)"

  print_step "Testing filter/search functionality"
  print_expected "Pressing '/' opens filter mode for project search"

  print_instructions \
    "Press '/' to open filter" \
    "Type part of a project name" \
    "List should filter to matching projects" \
    "Press Esc to clear filter"

  capture_state
  launch_dashboard
  ask_result "Filter Toggle"
}

test_refresh() {
  print_header "Test 13: Refresh (r key)"

  print_step "Testing refresh functionality"
  print_expected "Pressing 'r' refreshes the project list"

  print_instructions \
    "Press 'r' to refresh" \
    "List should reload (may flash briefly)" \
    "Stats should update if any changes"

  capture_state
  launch_dashboard
  ask_result "Refresh"
}

test_help_toggle() {
  print_header "Test 14: Help Toggle (? key)"

  print_step "Testing help overlay"
  print_expected "Pressing '?' shows keyboard shortcuts help"

  print_instructions \
    "Press '?' to show help" \
    "Help overlay should appear with all shortcuts" \
    "Press '?' or Esc to close help"

  capture_state
  launch_dashboard
  ask_result "Help Toggle"
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  clear
  echo -e "${BOLD}${BLUE}"
  echo "╔════════════════════════════════════════════════════════════════════════════╗"
  echo "║             ATLAS DASHBOARD - INTERACTIVE TEST SUITE                       ║"
  echo "╚════════════════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo ""
  echo "This script will launch the dashboard for each test."
  echo "After each test, you'll confirm whether it worked correctly."
  echo ""
  echo -e "Log file: ${CYAN}$LOG_FILE${NC}"
  echo ""
  echo -e "${YELLOW}Press any key to start testing...${NC}"
  read -n 1 -s
  echo ""

  init_log
  log_ts "Starting interactive test session"

  # Run all tests
  test_dashboard_launch
  test_navigation
  test_detail_view
  test_focus_mode
  test_zen_mode
  test_zen_timer_update
  test_focus_to_zen_switch
  test_theme_cycling
  test_session_start
  test_session_end
  test_project_open
  test_filter_toggle
  test_refresh
  test_help_toggle

  print_summary

  echo ""
  echo -e "${CYAN}Full log saved to: $LOG_FILE${NC}"
  echo ""
}

# Run main
main "$@"
