#!/bin/bash
#
# Atlas Comprehensive Dog-fooding Test Suite
# Non-interactive, logs to file for monitoring
#
# Usage:
#   ./test/dogfood-comprehensive.sh           # Run with live output
#   ./test/dogfood-comprehensive.sh --log     # Run with logging (monitor via tail -f)
#
# Monitor log in another terminal:
#   tail -f /tmp/atlas-dogfood.log
#

set -o pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/atlas-dogfood.log"
TEST_DATA_DIR="/tmp/atlas-dogfood-data"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Use local version instead of Homebrew-installed version
ATLAS="node $PROJECT_DIR/bin/atlas.js"

# Colors (disabled when logging to file)
if [[ "$1" == "--log" ]] || [[ ! -t 1 ]]; then
  GREEN=''
  YELLOW=''
  BLUE=''
  RED=''
  CYAN=''
  NC=''
  BOLD=''
  LOG_MODE=true
else
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  RED='\033[0;31m'
  CYAN='\033[0;36m'
  NC='\033[0m'
  BOLD='\033[1m'
  LOG_MODE=false
fi

# Counters
PASSED=0
FAILED=0
SKIPPED=0
ERRORS=()

# ============================================================================
# LOGGING
# ============================================================================

log() {
  local msg="[$(date '+%H:%M:%S')] $*"
  if $LOG_MODE; then
    echo "$msg" | tee -a "$LOG_FILE"
  else
    echo -e "$msg"
  fi
}

log_raw() {
  if $LOG_MODE; then
    echo "$*" | tee -a "$LOG_FILE"
  else
    echo -e "$*"
  fi
}

# ============================================================================
# TEST UTILITIES
# ============================================================================

header() {
  log_raw ""
  log_raw "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  log_raw "${BOLD}$1${NC}"
  log_raw "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

subheader() {
  log_raw ""
  log_raw "${CYAN}── $1 ──${NC}"
}

# Test that command succeeds and output contains expected string
check() {
  local name="$1"
  local cmd="$2"
  local expect="$3"

  log_raw "${YELLOW}[TEST]${NC} $name"
  log_raw "       ${CYAN}CMD:${NC} $cmd"

  local output
  local exit_code
  output=$(eval "$cmd" 2>&1) && exit_code=0 || exit_code=$?

  if [[ "$output" == *"$expect"* ]]; then
    log_raw "       ${GREEN}✓ PASS${NC} (found: '$expect')"
    ((PASSED++))
    return 0
  else
    log_raw "       ${RED}✗ FAIL${NC} - Expected '$expect'"
    log_raw "       ${RED}GOT:${NC} ${output:0:200}"
    ((FAILED++))
    ERRORS+=("$name: expected '$expect'")
    return 1
  fi
}

# Test that command succeeds (exit code 0)
run() {
  local name="$1"
  local cmd="$2"

  log_raw "${YELLOW}[RUN]${NC} $name"
  log_raw "      ${CYAN}CMD:${NC} $cmd"

  local output
  local exit_code
  output=$(eval "$cmd" 2>&1) && exit_code=0 || exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    log_raw "      ${GREEN}✓ OK${NC} (exit: $exit_code)"
    # Show first 3 lines of output
    echo "$output" | head -3 | while read -r line; do
      log_raw "      $line"
    done
    ((PASSED++))
    return 0
  else
    log_raw "      ${RED}✗ ERROR${NC} (exit: $exit_code)"
    echo "$output" | head -5 | while read -r line; do
      log_raw "      $line"
    done
    ((FAILED++))
    ERRORS+=("$name: exit code $exit_code")
    return 1
  fi
}

# Test that command fails (non-zero exit)
run_expect_fail() {
  local name="$1"
  local cmd="$2"

  log_raw "${YELLOW}[FAIL-TEST]${NC} $name"
  log_raw "            ${CYAN}CMD:${NC} $cmd"

  local output
  local exit_code
  output=$(eval "$cmd" 2>&1) && exit_code=0 || exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    log_raw "            ${GREEN}✓ PASS${NC} (correctly failed with exit: $exit_code)"
    ((PASSED++))
    return 0
  else
    log_raw "            ${RED}✗ FAIL${NC} - Expected failure but succeeded"
    ((FAILED++))
    ERRORS+=("$name: expected failure but got success")
    return 1
  fi
}

# Test command output does NOT contain string
check_not() {
  local name="$1"
  local cmd="$2"
  local not_expect="$3"

  log_raw "${YELLOW}[NOT-TEST]${NC} $name"
  log_raw "           ${CYAN}CMD:${NC} $cmd"

  local output
  output=$(eval "$cmd" 2>&1) || true

  if [[ "$output" != *"$not_expect"* ]]; then
    log_raw "           ${GREEN}✓ PASS${NC} (correctly missing: '$not_expect')"
    ((PASSED++))
    return 0
  else
    log_raw "           ${RED}✗ FAIL${NC} - Should NOT contain '$not_expect'"
    ((FAILED++))
    ERRORS+=("$name: should not contain '$not_expect'")
    return 1
  fi
}

# Measure command execution time (macOS compatible)
benchmark() {
  local name="$1"
  local cmd="$2"
  local max_ms="$3"

  log_raw "${YELLOW}[BENCH]${NC} $name (max: ${max_ms}ms)"

  # Use perl for millisecond precision on macOS
  local start=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
  eval "$cmd" > /dev/null 2>&1
  local end=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
  local duration=$((end - start))

  if [[ $duration -le $max_ms ]]; then
    log_raw "        ${GREEN}✓ PASS${NC} (${duration}ms)"
    ((PASSED++))
  else
    log_raw "        ${RED}✗ SLOW${NC} (${duration}ms > ${max_ms}ms)"
    ((FAILED++))
    ERRORS+=("$name: took ${duration}ms, expected < ${max_ms}ms")
  fi
}

skip() {
  local name="$1"
  local reason="$2"
  log_raw "${YELLOW}[SKIP]${NC} $name - $reason"
  ((SKIPPED++))
}

# ============================================================================
# SETUP
# ============================================================================

setup() {
  header "Test Setup"

  if $LOG_MODE; then
    echo "" > "$LOG_FILE"
    log "Logging to: $LOG_FILE"
    log "Monitor with: tail -f $LOG_FILE"
  fi

  log "Project dir: $PROJECT_DIR"
  log "Test data: $TEST_DATA_DIR"
  log "Timestamp: $TIMESTAMP"

  # Create test data directory
  mkdir -p "$TEST_DATA_DIR"

  # Create a mock project for testing
  mkdir -p "$TEST_DATA_DIR/mock-project"
  echo "status: active" > "$TEST_DATA_DIR/mock-project/.STATUS"
  echo "progress: 50" >> "$TEST_DATA_DIR/mock-project/.STATUS"
  echo "next: Test next action" >> "$TEST_DATA_DIR/mock-project/.STATUS"

  log "Created mock project at $TEST_DATA_DIR/mock-project"
}

cleanup() {
  header "Cleanup"

  # Remove test path from config
  $ATLAS config remove-path "$TEST_DATA_DIR" 2>/dev/null || true
  log "Removed test path from config"

  # Remove test data
  rm -rf "$TEST_DATA_DIR"
  log "Removed test data directory"

  # End any active session
  $ATLAS session end "Dogfood cleanup" 2>/dev/null || true
  log "Ended any active session"
}

# ============================================================================
# TEST SUITES
# ============================================================================

test_basic_commands() {
  header "1. Basic Commands"

  subheader "Version & Help"
  check "Version flag" "$ATLAS --version" "0.1.0"
  check "Version short" "$ATLAS -v" "0.1.0"
  check "Help flag" "$ATLAS --help" "Usage: atlas"
  check "Help short" "$ATLAS -h" "Usage: atlas"
  check "Help lists project" "$ATLAS --help" "project"
  check "Help lists session" "$ATLAS --help" "session"
  check "Help lists status" "$ATLAS --help" "status"
  check "Help lists catch" "$ATLAS --help" "catch"

  subheader "Unknown Commands"
  run_expect_fail "Unknown command fails" "$ATLAS unknown-command-xyz"
  run_expect_fail "Unknown subcommand fails" "$ATLAS project unknown-sub"
}

test_config() {
  header "2. Configuration"

  subheader "Config Display"
  check "Config paths" "$ATLAS config paths" "Configured scan paths"
  check "Config show" "$ATLAS config show" "scanPaths"
  check "Config show JSON" "$ATLAS config show" "["

  subheader "Config Modification"
  run "Add test path" "$ATLAS config add-path $TEST_DATA_DIR"
  check "Test path added" "$ATLAS config paths" "$TEST_DATA_DIR"
  run "Add duplicate path (idempotent)" "$ATLAS config add-path $TEST_DATA_DIR"

  # Will be removed in cleanup
}

test_sync() {
  header "3. Project Sync"

  subheader "Dry Run"
  run "Sync dry-run" "$ATLAS sync --dry-run"
  check "Dry-run shows projects" "$ATLAS sync --dry-run" "projects"
  check_not "Dry-run no error" "$ATLAS sync --dry-run" "Error"
  check_not "Dry-run no undefined" "$ATLAS sync --dry-run" "undefined"

  subheader "Full Sync"
  run "Full sync" "$ATLAS sync"
  # Note: mock project may not appear in sync if path wasn't scanned yet
  run "Check project count" "$ATLAS project list --format names | wc -l"

  subheader "Sync Performance"
  benchmark "Sync speed (dry-run)" "$ATLAS sync --dry-run" 10000  # Allow more time for large project trees
}

test_projects() {
  header "4. Project Management"

  subheader "List Projects"
  run "List projects (table)" "$ATLAS project list --format table"
  run "List projects (json)" "$ATLAS project list --format json"
  run "List projects (names)" "$ATLAS project list --format names"
  check "JSON is array" "$ATLAS project list --format json | head -1" "["

  subheader "Project Filtering"
  run "List with status filter" "$ATLAS project list --status active" || true
  run "List with tag filter" "$ATLAS project list --tag test" || true

  subheader "Project Details"
  # May not exist, so we just test the command works
  run "Show project help" "$ATLAS project show --help" || true
}

test_status() {
  header "5. Status Commands"

  subheader "Global Status"
  run "Global status" "$ATLAS status"
  check "Status shows workflow" "$ATLAS status" "WORKFLOW STATUS"
  check_not "Status no undefined" "$ATLAS status" "undefined"
  check_not "Status no object Object" "$ATLAS status" "[object Object]"

  subheader "Project Status"
  run "Project status (atlas)" "$ATLAS status atlas" || true
  run "Status help" "$ATLAS status --help"
  check "Status has --set option" "$ATLAS status --help" "--set"
  check "Status has --progress option" "$ATLAS status --help" "--progress"
  check "Status has --focus option" "$ATLAS status --help" "--focus"

  subheader "Status Modification"
  # These may fail if project doesn't exist, that's OK
  run "Set focus" "$ATLAS status atlas --focus 'Testing dogfood'" || true
}

test_sessions() {
  header "6. Session Management"

  subheader "Session Lifecycle"

  # End any existing session first
  $ATLAS session end "Pre-test cleanup" 2>/dev/null || true
  sleep 0.5  # Brief pause to let session state settle

  run "Start session" "$ATLAS session start atlas"
  check "Session started" "$ATLAS session status" "atlas"  # Session status shows project name

  run "Session status" "$ATLAS session status"
  check_not "Session status no error" "$ATLAS session status" "Error"

  run "End session" "$ATLAS session end 'Dogfood test complete'"
  check "Session ended" "$ATLAS session status" "No active session"

  subheader "Session Edge Cases"
  run_expect_fail "End without active session" "$ATLAS session end 'No session'" || true
  run "Start another session" "$ATLAS session start atlas"
  # Leave it active for other tests
}

test_capture() {
  header "7. Quick Capture"

  subheader "Basic Capture"
  run "Capture idea" "$ATLAS catch 'Dogfood test idea $TIMESTAMP'"
  check "Capture confirms" "$ATLAS catch 'Another idea'" "Captured"
  check_not "Capture no error" "$ATLAS catch 'Test capture'" "Error"
  check_not "Capture no toJSON error" "$ATLAS catch 'Test capture 2'" "toJSON"

  subheader "Capture with Options"
  run "Capture for project" "$ATLAS catch atlas 'Project-specific capture'"
  run "Capture with type" "$ATLAS catch --type task 'Task capture'" || true

  subheader "Inbox"
  run "View inbox" "$ATLAS inbox"
  check "Inbox shows items" "$ATLAS inbox" "INBOX"
  run "Inbox stats" "$ATLAS inbox --stats"
  check "Stats shows count" "$ATLAS inbox --stats" "Inbox"
}

test_context() {
  header "8. Context & Breadcrumbs"

  subheader "Breadcrumbs"
  run "Leave breadcrumb" "$ATLAS crumb 'Test breadcrumb $TIMESTAMP'"
  check "Crumb confirms" "$ATLAS crumb 'Another crumb'" "Breadcrumb"
  check_not "Crumb no toJSON error" "$ATLAS crumb 'Test crumb'" "toJSON"

  subheader "Where Am I"
  run "Where command" "$ATLAS where"
  check "Where shows context" "$ATLAS where" "CONTEXT"
  check_not "Where no object Object" "$ATLAS where" "[object Object]"
  check_not "Where no undefined" "$ATLAS where" ": undefined"

  subheader "Trail"
  run "Trail command" "$ATLAS trail --days 1"
  check "Trail shows breadcrumbs" "$ATLAS trail --days 1" "TRAIL"
  check_not "Trail no Invalid Date" "$ATLAS trail --days 1" "Invalid Date"
  run "Trail for project" "$ATLAS trail atlas --days 7" || true
}

test_completions() {
  header "9. Shell Completions"

  subheader "ZSH Completions"
  check "ZSH header" "$ATLAS completions zsh | head -1" "#compdef"
  check "ZSH has commands" "$ATLAS completions zsh" "_atlas"

  subheader "Bash Completions"
  check "Bash has function" "$ATLAS completions bash" "_atlas_completions"
  check "Bash has complete" "$ATLAS completions bash" "complete"

  subheader "Fish Completions"
  check "Fish has complete" "$ATLAS completions fish" "complete -c atlas"
  check "Fish has atlas" "$ATLAS completions fish" "atlas"
}

test_edge_cases() {
  header "10. Edge Cases & Error Handling"

  subheader "Empty/Invalid Input"
  run_expect_fail "Empty catch" "$ATLAS catch ''"
  run_expect_fail "Catch without text" "$ATLAS catch"
  run_expect_fail "Crumb without text" "$ATLAS crumb"

  subheader "Long Input"
  local long_text=$(printf 'x%.0s' {1..300})
  run "Long capture (300 chars)" "$ATLAS catch '$long_text'" || true

  subheader "Special Characters"
  run "Capture with quotes" "$ATLAS catch \"Test with 'quotes' inside\""
  run "Capture with newline" "$ATLAS catch 'Line1
Line2'" || true
}

test_data_integrity() {
  header "11. Data Integrity"

  subheader "JSON Output Validity"
  check "Project list valid JSON" "$ATLAS project list --format json | python3 -c 'import json,sys; json.load(sys.stdin)' && echo 'valid'" "valid"
  check "Config show valid JSON" "$ATLAS config show | python3 -c 'import json,sys; json.load(sys.stdin)' && echo 'valid'" "valid"

  subheader "Persistence"
  local test_id="persist_$TIMESTAMP"
  run "Create capture" "$ATLAS catch 'Persistence test $test_id'"
  check "Capture persisted" "$ATLAS inbox" "$test_id" || true
}

test_performance() {
  header "12. Performance Benchmarks"

  subheader "Command Startup"
  benchmark "Version (cold)" "$ATLAS --version" 500
  benchmark "Help (cold)" "$ATLAS --help" 500

  subheader "Read Operations"
  benchmark "Status read" "$ATLAS status" 1000
  benchmark "Inbox read" "$ATLAS inbox" 1000
  benchmark "Where read" "$ATLAS where" 1000

  subheader "Write Operations"
  benchmark "Capture write" "$ATLAS catch 'Benchmark capture'" 1000
  benchmark "Crumb write" "$ATLAS crumb 'Benchmark crumb'" 1000
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  local start_time=$(date +%s)

  log_raw ""
  log_raw "${BOLD}"
  log_raw "╔═══════════════════════════════════════════════════════════════════════════╗"
  log_raw "║           ATLAS - Comprehensive Dog-fooding Test Suite                    ║"
  log_raw "║                         $(date '+%Y-%m-%d %H:%M:%S')                              ║"
  log_raw "╚═══════════════════════════════════════════════════════════════════════════╝"
  log_raw "${NC}"

  # Trap for cleanup on exit
  trap cleanup EXIT

  # Run setup
  setup

  # Run all test suites
  test_basic_commands
  test_config
  test_sync
  test_projects
  test_status
  test_sessions
  test_capture
  test_context
  test_completions
  test_edge_cases
  test_data_integrity
  test_performance

  # Final summary
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))

  header "Test Summary"

  log_raw ""
  log_raw "  ${GREEN}Passed:${NC}  $PASSED"
  log_raw "  ${RED}Failed:${NC}  $FAILED"
  log_raw "  ${YELLOW}Skipped:${NC} $SKIPPED"
  log_raw "  ${BOLD}Total:${NC}   $((PASSED + FAILED + SKIPPED))"
  log_raw "  ${CYAN}Time:${NC}    ${duration}s"
  log_raw ""

  if [[ ${#ERRORS[@]} -gt 0 ]]; then
    log_raw "${RED}Failed Tests:${NC}"
    for err in "${ERRORS[@]}"; do
      log_raw "  • $err"
    done
    log_raw ""
  fi

  if [[ $FAILED -eq 0 ]]; then
    log_raw "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════════════${NC}"
    log_raw "${GREEN}${BOLD}  ✓ All dog-fooding tests passed!${NC}"
    log_raw "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════════════${NC}"
    exit 0
  else
    log_raw "${RED}${BOLD}══════════════════════════════════════════════════════════════════════════${NC}"
    log_raw "${RED}${BOLD}  ✗ $FAILED tests failed${NC}"
    log_raw "${RED}${BOLD}══════════════════════════════════════════════════════════════════════════${NC}"
    exit 1
  fi
}

# Run main
main "$@"
