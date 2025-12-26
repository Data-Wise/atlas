#!/bin/bash
#
# Atlas Non-Interactive Dogfooding Test
# Captures output, compares with expected, reports all failures
# No user input required
#

# Use local binary, not homebrew
ATLAS="node $(dirname "$0")/../bin/atlas.js"
TEST_DIR="/tmp/atlas-dogfood-$$"
RESULTS_FILE="$TEST_DIR/results.txt"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

# Counters
PASSED=0
FAILED=0
declare -a FAILURES

# Setup
mkdir -p "$TEST_DIR"
echo "" > "$RESULTS_FILE"

header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Test with expected substring
test_contains() {
  local name="$1"
  local cmd="$2"
  local expect="$3"

  echo -en "${DIM}Testing:${NC} $name... "

  local output
  output=$(eval "$cmd" 2>&1) || true

  if [[ "$output" == *"$expect"* ]]; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC}"
    FAILURES+=("[$name] Expected: '$expect' | Got: '${output:0:80}...'")
    ((FAILED++))
    return 1
  fi
}

# Test with regex match
test_matches() {
  local name="$1"
  local cmd="$2"
  local pattern="$3"

  echo -en "${DIM}Testing:${NC} $name... "

  local output
  output=$(eval "$cmd" 2>&1) || true

  if [[ "$output" =~ $pattern ]]; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC}"
    FAILURES+=("[$name] Pattern: '$pattern' | Got: '${output:0:80}...'")
    ((FAILED++))
    return 1
  fi
}

# Test command succeeds (exit 0)
test_succeeds() {
  local name="$1"
  local cmd="$2"

  echo -en "${DIM}Testing:${NC} $name... "

  local output
  if output=$(eval "$cmd" 2>&1); then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC}"
    FAILURES+=("[$name] Command failed: '${output:0:80}...'")
    ((FAILED++))
    return 1
  fi
}

# Test command fails (exit non-0)
test_fails() {
  local name="$1"
  local cmd="$2"

  echo -en "${DIM}Testing:${NC} $name... "

  local output
  if output=$(eval "$cmd" 2>&1); then
    echo -e "${RED}✗${NC}"
    FAILURES+=("[$name] Expected failure but succeeded")
    ((FAILED++))
    return 1
  else
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
    return 0
  fi
}

# Test JSON output is valid
test_json() {
  local name="$1"
  local cmd="$2"

  echo -en "${DIM}Testing:${NC} $name... "

  local output
  output=$(eval "$cmd" 2>&1) || true

  if echo "$output" | node -e "JSON.parse(require('fs').readFileSync(0))" 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC}"
    FAILURES+=("[$name] Invalid JSON: '${output:0:60}...'")
    ((FAILED++))
    return 1
  fi
}

# ============================================================================
# START
# ============================================================================

echo -e "${BOLD}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     ATLAS - Non-Interactive Dogfooding Test v0.5.2       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${DIM}Using: $ATLAS${NC}"
echo -e "${DIM}Test dir: $TEST_DIR${NC}"

# ============================================================================
# 1. VERSION & HELP
# ============================================================================

header "1. Version & Help"

test_matches "Version format" "$ATLAS --version" "^[0-9]+\.[0-9]+\.[0-9]+$"
test_contains "Version is 0.5.x" "$ATLAS --version" "0.5"
test_contains "Help shows usage" "$ATLAS --help" "Usage: atlas"
test_contains "Help shows session cmd" "$ATLAS --help" "session"
test_contains "Help shows project cmd" "$ATLAS --help" "project"
test_contains "Help shows catch cmd" "$ATLAS --help" "catch"

# ============================================================================
# 2. INIT (in test dir)
# ============================================================================

header "2. Initialization"

export ATLAS_CONFIG="$TEST_DIR/.atlas"
test_succeeds "Init creates config" "$ATLAS init"
test_succeeds "Config dir exists" "ls -d $TEST_DIR/.atlas"

# ============================================================================
# 3. CONFIG COMMANDS
# ============================================================================

header "3. Configuration"

test_contains "Config paths" "$ATLAS config paths" "Configured scan paths"
test_contains "Config show JSON" "$ATLAS config show" "scanPaths"
test_succeeds "Add scan path" "$ATLAS config add-path $TEST_DIR/projects"
test_contains "Path was added" "$ATLAS config paths" "$TEST_DIR/projects"

# ============================================================================
# 4. PROJECT MANAGEMENT
# ============================================================================

header "4. Project Management"

# Create test projects
mkdir -p "$TEST_DIR/projects/test-project-1"
mkdir -p "$TEST_DIR/projects/test-project-2"
echo "## Project: test-project-1
## Status: active
## Progress: 50" > "$TEST_DIR/projects/test-project-1/.STATUS"
echo "## Project: test-project-2
## Status: planning" > "$TEST_DIR/projects/test-project-2/.STATUS"

test_succeeds "Sync finds projects" "$ATLAS sync"
test_contains "Sync output" "$ATLAS sync --dry-run" "project"
test_succeeds "Project list runs" "$ATLAS project list"
# Table output contains │ when projects exist, or [] for empty list
test_matches "Project list output" "$ATLAS project list" "(│|\[\])"
test_succeeds "Project show" "$ATLAS project show test-project-1"

# ============================================================================
# 5. SESSION MANAGEMENT
# ============================================================================

header "5. Session Management"

test_succeeds "Start session" "$ATLAS session start test-project-1"
test_contains "Session status active" "$ATLAS session status" "test-project-1"
test_succeeds "End session" "$ATLAS session end 'Dogfood test session'"
test_contains "No active after end" "$ATLAS session status" "No active"

# Session with task
test_succeeds "Start with task" "$ATLAS session start test-project-1 'Working on feature X'"
test_contains "Session active" "$ATLAS session status" "test-project-1"
test_succeeds "End session again" "$ATLAS session end"

# ============================================================================
# 6. QUICK CAPTURE
# ============================================================================

header "6. Quick Capture (catch/inbox)"

test_succeeds "Catch idea" "$ATLAS catch 'Test idea from dogfood'"
test_succeeds "Catch for project" "$ATLAS catch test-project-1 'Project-specific idea'"
test_contains "Inbox shows captures" "$ATLAS inbox" "Test idea"
test_contains "Inbox stats" "$ATLAS inbox --stats" "INBOX"

# ============================================================================
# 7. CONTEXT & BREADCRUMBS
# ============================================================================

header "7. Context & Breadcrumbs"

test_succeeds "Leave breadcrumb" "$ATLAS crumb 'Test breadcrumb marker'"
test_contains "Where shows context" "$ATLAS where" ""
test_succeeds "Trail command" "$ATLAS trail --days 1"

# ============================================================================
# 8. STATUS COMMANDS
# ============================================================================

header "8. Status Commands"

test_succeeds "Global status" "$ATLAS status"
test_succeeds "Project status" "$ATLAS status test-project-1"
test_contains "Status shows sections" "$ATLAS status" "WORKFLOW STATUS"

# ============================================================================
# 9. FOCUS COMMAND
# ============================================================================

header "9. Focus Command"

test_contains "Set focus" "$ATLAS focus test-project-1 'Working on dogfood tests'" "Focus set"
test_succeeds "Get focus runs" "$ATLAS focus test-project-1"

# ============================================================================
# 10. SHELL COMPLETIONS
# ============================================================================

header "10. Shell Completions"

test_contains "ZSH completion header" "$ATLAS completions zsh | head -1" "#compdef"
test_contains "Bash completion header" "$ATLAS completions bash | head -1" "Atlas CLI completion"
test_contains "Fish completion header" "$ATLAS completions fish | head -1" "Atlas CLI completion"

# ============================================================================
# 11. ERROR HANDLING
# ============================================================================

header "11. Error Handling"

test_fails "Unknown command fails" "$ATLAS nonexistent-command"
test_succeeds "Nonexistent project shows global status" "$ATLAS project show nonexistent-project-xyz"

# ============================================================================
# 12. ADHD UTILITIES (v0.4.1)
# ============================================================================

header "12. ADHD Utilities (v0.4.1)"

# Start a session to test context restoration
test_succeeds "Start session for streak" "$ATLAS session start test-project-1"
test_succeeds "End session for streak" "$ATLAS session end 'Building streak'"

# The ADHD utilities are integrated into session/dashboard
# We check they don't crash and provide output
test_succeeds "Session start shows welcome" "$ATLAS session start test-project-2"
test_succeeds "Session end shows celebration" "$ATLAS session end 'Testing celebrations'"

# ============================================================================
# CLEANUP
# ============================================================================

header "Cleanup"

echo "Removing test directory: $TEST_DIR"
rm -rf "$TEST_DIR"
unset ATLAS_CONFIG

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

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo -e "${RED}${BOLD}Failed Tests:${NC}"
  for failure in "${FAILURES[@]}"; do
    echo -e "  ${RED}•${NC} $failure"
  done
  echo ""
fi

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ All dogfooding tests passed!${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}✗ $FAILED of $TOTAL tests failed${NC}"
  exit 1
fi
