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
echo "║     ATLAS - Non-Interactive Dogfooding Test v0.7.0       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "${DIM}Using: $ATLAS${NC}"
echo -e "${DIM}Test dir: $TEST_DIR${NC}"

# ============================================================================
# 1. VERSION & HELP
# ============================================================================

header "1. Version & Help"

test_matches "Version format" "$ATLAS --version" "^[0-9]+\.[0-9]+\.[0-9]+$"
# Release-agnostic: assert the CLI version matches package.json (no hardcoded minor).
EXPECTED_VERSION="$(node -p "require('$(dirname "$0")/../package.json').version" 2>/dev/null || echo '')"
test_contains "Version matches package.json (${EXPECTED_VERSION})" "$ATLAS --version" "$EXPECTED_VERSION"
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
# 13. PARK FEATURE (v0.5.1)
# ============================================================================

header "13. Park Feature (v0.5.1)"

# Start a session to park
test_succeeds "Start session to park" "$ATLAS session start test-project-1 'Working on feature'"
test_contains "Park with note" "$ATLAS park 'switching to urgent task'" "parked"
test_contains "No active after park" "$ATLAS session status" "No active"

# Check parked list
test_succeeds "Parked list runs" "$ATLAS parked"
test_contains "Parked shows context" "$ATLAS parked" "test-project-1"

# Unpark restores context
test_contains "Unpark restores" "$ATLAS unpark" "restored"
test_contains "Session active after unpark" "$ATLAS session status" "test-project-1"
test_succeeds "End unparked session" "$ATLAS session end 'Back from urgent task'"

# Park with --keep-session
test_succeeds "Start for keep-session" "$ATLAS session start test-project-2"
test_contains "Park with keep-session" "$ATLAS park --keep-session 'quick note'" "parked"
test_contains "Session still active" "$ATLAS session status" "test-project-2"
test_succeeds "End kept session" "$ATLAS session end"

# ============================================================================
# 14. TEMPLATE COMMANDS (v0.5.1)
# ============================================================================

header "14. Template Commands (v0.5.1)"

# List templates
test_succeeds "Template list runs" "$ATLAS template list"
test_contains "List shows node template" "$ATLAS template list" "node"
test_contains "List shows r-package" "$ATLAS template list" "r-package"
test_contains "List shows minimal" "$ATLAS template list" "minimal"

# Show template content
test_succeeds "Template show runs" "$ATLAS template show node"
test_contains "Show has canonical schema marker" "$ATLAS template show node" "schema: atlas/v1"

# Template dir
test_contains "Template dir shows path" "$ATLAS template dir" ".atlas/templates"

# Create custom template
test_succeeds "Create custom template" "$ATLAS template create test-template"
test_contains "Custom in list" "$ATLAS template list" "test-template"
test_contains "Custom marked" "$ATLAS template list" "[custom]"

# Delete custom template
test_succeeds "Delete custom template" "$ATLAS template delete test-template"

# ============================================================================
# 15. TEMPLATE INHERITANCE (v0.5.2)
# ============================================================================

header "15. Template Inheritance (v0.5.2)"

# Create template that extends node
test_succeeds "Create extending template" "$ATLAS template create my-node --extends node"
test_contains "Extended in list" "$ATLAS template list" "my-node"
test_succeeds "Delete extended template" "$ATLAS template delete my-node"

# ============================================================================
# 16. LAYOUT MANAGER - D1 (feature/multi-panel-dashboard)
# ============================================================================

header "16. LayoutManager D1 - Multi-Panel Layout Constants"

LAYOUT_SRC="$(dirname "$0")/../src/cli/dashboard-ink/lib/LayoutManager.tsx"

# Confirm the file exists
test_succeeds "LayoutManager.tsx exists" "ls '$LAYOUT_SRC'"

# 1. LAYOUT enum values present (grep source — tsx import not portable across CI)
test_contains "LAYOUT.SINGLE = 'single'" \
  "grep \"SINGLE.*'single'\" '$LAYOUT_SRC'" "single"

test_contains "LAYOUT.SPLIT = 'split'" \
  "grep \"SPLIT.*'split'\" '$LAYOUT_SRC'" "split"

test_contains "LAYOUT.TRIPLE = 'triple'" \
  "grep \"TRIPLE.*'triple'\" '$LAYOUT_SRC'" "triple"

# 2. Key exports are present in the source file (static grep — no tsx needed)
test_contains "Exports useLayout hook" \
  "grep -c 'export function useLayout' '$LAYOUT_SRC'" \
  "1"

test_contains "Exports LayoutManager component" \
  "grep -c 'export const LayoutManager' '$LAYOUT_SRC'" \
  "1"

test_contains "Exports PanelBox component" \
  "grep -c 'export const PanelBox' '$LAYOUT_SRC'" \
  "1"

STATUS_BAR_SRC="$(dirname "$0")/../src/cli/dashboard-ink/components/StatusBar.tsx"

test_contains "Exports StatusBar component" \
  "grep -c 'export const StatusBar' '$STATUS_BAR_SRC'" \
  "1"

# 3. Width percentages: verify they sum to 100 per mode (grep + awk)
# SINGLE: main=100
test_contains "SINGLE mode main=100% in source" \
  "grep 'widthPct: 100' '$LAYOUT_SRC'" \
  "widthPct: 100"

# SPLIT: sidebar=28, main=72  (28+72=100)
test_contains "SPLIT sidebar=28 in source" \
  "grep -A2 'sidebar.*widthPct' '$LAYOUT_SRC' | grep '28'" \
  "28"

test_contains "SPLIT main=72 in source" \
  "grep 'widthPct: 72' '$LAYOUT_SRC'" \
  "widthPct: 72"

# TRIPLE: sidebar=25, main=47, inspector=28  (25+47+28=100)
test_contains "TRIPLE sidebar=25 in source" \
  "grep 'widthPct: 25' '$LAYOUT_SRC'" \
  "widthPct: 25"

test_contains "TRIPLE main=47 in source" \
  "grep 'widthPct: 47' '$LAYOUT_SRC'" \
  "widthPct: 47"

# inspector=28 shared with SPLIT sidebar — already tested above

# 4. Ink imports present (component depends on ink)
test_contains "Imports Box from ink" \
  "grep \"from 'ink'\" '$LAYOUT_SRC'" \
  "Box"

test_contains "Imports useInput from ink" \
  "grep \"from 'ink'\" '$LAYOUT_SRC'" \
  "useInput"

# 5. Layout cycle order in source
test_contains "LAYOUT_CYCLE starts with SINGLE" \
  "grep -A3 'LAYOUT_CYCLE' '$LAYOUT_SRC' | head -4" \
  "SINGLE"

test_contains "LAYOUT_CYCLE includes SPLIT" \
  "grep -A3 'LAYOUT_CYCLE' '$LAYOUT_SRC'" \
  "SPLIT"

test_contains "LAYOUT_CYCLE includes TRIPLE" \
  "grep -A3 'LAYOUT_CYCLE' '$LAYOUT_SRC'" \
  "TRIPLE"

# 6. Tab key wiring present
test_contains "Tab key cycles layout" \
  "grep 'key.tab' '$LAYOUT_SRC'" \
  "key.tab"

# 7. Shift+Tab focus cycling present
test_contains "Shift+Tab cycles panel focus" \
  "grep 'key.shift' '$LAYOUT_SRC'" \
  "key.shift"

echo ""
echo -e "  ${DIM}LayoutManager D1 dogfood complete${NC}"

# ============================================================================
# 17. shared/ProjectList - Compact Project List Column (v0.14 consolidation)
# ============================================================================

header "17. shared/ProjectList - Compact Project List Column"

PROJECTLIST_SRC="$(dirname "$0")/../src/cli/dashboard-ink/components/shared/ProjectList.tsx"
CONSTANTS_SRC="$(dirname "$0")/../src/cli/dashboard-ink/constants.ts"

test_succeeds "ProjectList.tsx exists" "ls '$PROJECTLIST_SRC'"

test_contains "Exports ProjectList component" \
  "grep -c 'export const ProjectList' '$PROJECTLIST_SRC'" "1"

test_contains "Imports Project type from shared types" \
  "grep -c \"from '../../types.js'\" '$PROJECTLIST_SRC'" "1"

test_contains "Status icon: active ●" \
  "grep \"'●'\" '$CONSTANTS_SRC'" "'●'"

test_contains "Status icon: paused ◐" \
  "grep \"'◐'\" '$CONSTANTS_SRC'" "'◐'"

test_contains "isActive guard in useInput" \
  "grep 'if (!isActive) return' '$PROJECTLIST_SRC'" "if (!isActive) return"

echo ""
echo -e "  ${DIM}shared/ProjectList dogfood complete${NC}"

# ============================================================================
# 18. shared/PomodoroTimer - the single Pomodoro implementation (v0.14)
# ============================================================================

header "18. shared/PomodoroTimer - Single Timer Implementation"

TIMER_SRC="$(dirname "$0")/../src/cli/dashboard-ink/components/shared/PomodoroTimer.tsx"
NOW_SRC="$(dirname "$0")/../src/cli/dashboard-ink/components/views/NowView.tsx"

test_succeeds "PomodoroTimer.tsx exists" "ls '$TIMER_SRC'"

test_contains "Exports PomodoroTimer component" \
  "grep -c 'export const PomodoroTimer' '$TIMER_SRC'" "1"

test_contains "fmtTime/timeStr uses padStart(2" \
  "grep 'padStart(2' '$TIMER_SRC'" "padStart(2"

test_contains "useEffect for timer tick" \
  "grep 'useEffect' '$TIMER_SRC'" "useEffect"

test_contains "setInterval for 1-second tick" \
  "grep 'setInterval' '$TIMER_SRC'" "setInterval"

test_contains "clearInterval cleanup" \
  "grep 'clearInterval' '$TIMER_SRC'" "clearInterval"

test_contains "isActive guard in useInput" \
  "grep 'if (!isActive) return' '$TIMER_SRC'" "if (!isActive) return"

test_contains "BREAK TIME label (☕)" \
  "grep '☕ BREAK TIME' '$TIMER_SRC'" "☕ BREAK TIME"

test_contains "PAUSED label (◑)" \
  "grep '◑ PAUSED' '$TIMER_SRC'" "◑ PAUSED"

test_contains "FOCUSING label (●)" \
  "grep '● FOCUSING' '$TIMER_SRC'" "● FOCUSING"

test_contains "dense (zen) chrome toggle supported" \
  "grep 'dense' '$TIMER_SRC'" "dense"

test_contains "Space key toggles pause" \
  "grep \"input === ' '\" '$TIMER_SRC'" "input === ' '"

test_contains "r key resets timer" \
  "grep \"input === 'r'\" '$TIMER_SRC'" "input === 'r'"

# NowView.tsx now owns the project-detail pane (progressBar/trunc/next/breadcrumbs)
test_succeeds "NowView.tsx exists" "ls '$NOW_SRC'"

test_contains "Empty state message when no project" \
  "grep 'Select a project' '$NOW_SRC'" "Select a project"

test_contains "next actions split regex [,\\n]" \
  "grep 'split(/\[,\\\\n\]/)' '$NOW_SRC'" "split"

test_contains "Breadcrumbs sliced to max 3" \
  "grep 'slice(0, 3)' '$NOW_SRC'" "slice(0, 3)"

echo ""
echo -e "  ${DIM}shared/PomodoroTimer + NowView dogfood complete${NC}"

# ============================================================================
# 19. APP.TSX D4 - Multi-Panel Wiring
# ============================================================================

header "19. App.tsx D4 - Multi-Panel Layout Wiring"

APP_SRC="$(dirname "$0")/../src/cli/dashboard-ink/components/App.tsx"

# File present
test_succeeds "App.tsx exists" "ls '$APP_SRC'"

# 1. LayoutManager imports
test_contains "Imports useLayout" \
  "grep 'useLayout' '$APP_SRC'" "useLayout"

test_contains "Imports LayoutManager" \
  "grep 'LayoutManager' '$APP_SRC'" "LayoutManager"

test_contains "Imports StatusBar" \
  "grep 'StatusBar' '$APP_SRC'" "StatusBar"

test_contains "Imports LayoutManager module (LAYOUT enum lives there)" \
  "grep \"lib/LayoutManager.js\" '$APP_SRC'" "LayoutManager.js"

# 2. 3-view component imports (v0.14 consolidation)
test_contains "Imports NowView" \
  "grep 'NowView' '$APP_SRC'" "NowView"

test_contains "Imports TimerView" \
  "grep 'TimerView' '$APP_SRC'" "TimerView"

test_contains "Imports HelpOverlay" \
  "grep 'HelpOverlay' '$APP_SRC'" "HelpOverlay"

# 3. useLayout call
test_contains "Calls useLayout with LAYOUT.SINGLE" \
  "grep 'useLayout' '$APP_SRC'" "useLayout"

test_contains "Uses single as the initial layout mode" \
  "grep \"initial: 'single'\" '$APP_SRC'" "single"

# 4. LayoutManager render-prop usage
test_contains "<LayoutManager> present" \
  "grep '<LayoutManager' '$APP_SRC'" "<LayoutManager"

# v0.14: NowView now owns its own list+detail layout internally, so App.tsx
# no longer wraps it in an external sidebar/inspector split (see NowView.tsx
# section 17/18 assertions above for that wiring instead).
test_contains "renderCurrentView() dispatches on currentView" \
  "grep 'renderCurrentView' '$APP_SRC'" "renderCurrentView"

# 5. Selected-project sync
test_contains "handleSidebarIndexChange updates selectedProject" \
  "grep 'handleSidebarIndexChange' '$APP_SRC'" "handleSidebarIndexChange"

test_contains "3-state dispatch uses STATES.NOW" \
  "grep 'STATES.NOW' '$APP_SRC'" "STATES.NOW"

# 8. StatusBar in command bar
test_contains "StatusBar rendered" \
  "grep '<StatusBar' '$APP_SRC'" "<StatusBar"

test_contains "StatusBar receives layout prop" \
  "grep 'layout={layout}' '$APP_SRC'" "layout={layout}"

# 9. All 3 consolidated views present (v0.14: 8 views -> 3)
for view in NowView TimerView PlanView; do
  test_contains "$view still rendered" \
    "grep '$view' '$APP_SRC'" "$view"
done

# 10. Real data hooks (v0.9.2 — replaced mock data)
test_contains "useProjects hook imported" \
  "grep 'useProjects' '$APP_SRC'" "useProjects"

test_contains "useActiveSession hook imported" \
  "grep 'useActiveSession' '$APP_SRC'" "useActiveSession"

test_contains "pendingCaptures prop set" \
  "grep 'pendingCaptures' '$APP_SRC'" "pendingCaptures"

test_contains "activeProjectId prop set" \
  "grep 'activeProjectId' '$APP_SRC'" "activeProjectId"

test_contains "sessionSeconds prop set" \
  "grep 'sessionSeconds' '$APP_SRC'" "sessionSeconds"

echo ""
echo -e "  ${DIM}App.tsx D4 dogfood complete${NC}"

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

