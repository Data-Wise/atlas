#!/bin/bash
#
# Atlas Interactive Dogfooding Test v2
# 
# Runs atlas commands and asks user to verify output matches expectations.
# Tests the Card Stack layout and ADHD-friendly features.
#
# Usage: bash test/dogfood-interactive-v2.sh
#

# Don't use set -e because read commands can fail in non-TTY contexts
# set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Test temp directory
TEST_DIR=$(mktemp -d)
export ATLAS_DATA_DIR="$TEST_DIR"

cleanup() {
    rm -rf "$TEST_DIR"
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}Test Summary${NC}"
    echo -e "═══════════════════════════════════════════════════════════"
    echo -e "  ${GREEN}Passed:${NC}  $PASSED"
    echo -e "  ${RED}Failed:${NC}  $FAILED"
    echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED"
    echo -e "═══════════════════════════════════════════════════════════"
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}${BOLD}All tests passed!${NC}"
    else
        echo -e "${RED}${BOLD}Some tests failed. Please review.${NC}"
    fi
}

trap cleanup EXIT

# Print header
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Print test info
print_test() {
    echo ""
    echo -e "${CYAN}┌─ Test: $1${NC}"
    echo -e "${DIM}│  Command: $2${NC}"
}

# Print expected output
print_expected() {
    echo -e "${DIM}│${NC}"
    echo -e "${DIM}│  ${YELLOW}Expected:${NC}"
    echo "$1" | while IFS= read -r line; do
        echo -e "${DIM}│${NC}    $line"
    done
}

# Run command and show output
run_command() {
    echo -e "${DIM}│${NC}"
    echo -e "${DIM}│  ${GREEN}Actual Output:${NC}"
    echo -e "${DIM}└──────────────────────────────────────────────────────────${NC}"
    echo ""
    eval "$1" 2>&1 | head -30
    echo ""
}

# Ask user to verify
ask_verify() {
    echo -e "${DIM}──────────────────────────────────────────────────────────${NC}"
    echo -en "${BOLD}Does the output match expected? ${NC}[${GREEN}y${NC}/${RED}n${NC}/${YELLOW}s${NC}kip] "
    read -r response || response="s"
    case "$response" in
        y|Y|yes|YES)
            echo -e "${GREEN}✓ PASSED${NC}"
            PASSED=$((PASSED + 1))
            ;;
        n|N|no|NO)
            echo -e "${RED}✗ FAILED${NC}"
            FAILED=$((FAILED + 1))
            ;;
        s|S|skip|SKIP)
            echo -e "${YELLOW}○ SKIPPED${NC}"
            SKIPPED=$((SKIPPED + 1))
            ;;
        *)
            echo -e "${YELLOW}○ SKIPPED (invalid input)${NC}"
            SKIPPED=$((SKIPPED + 1))
            ;;
    esac
}

# ============================================================================
# TESTS START HERE
# ============================================================================

echo ""
echo -e "${BOLD}${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║     Atlas Interactive Dogfooding Test v2                  ║${NC}"
echo -e "${BOLD}${BLUE}║     Testing Card Stack Layout & ADHD Features             ║${NC}"
echo -e "${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${DIM}Press Enter after each test to continue...${NC}"
echo -e "${DIM}Respond: y=pass, n=fail, s=skip${NC}"
echo ""
read -r -p "Press Enter to start tests..." || true

# ============================================================================
print_header "1. Basic CLI Commands"
# ============================================================================

print_test "Version Check" "atlas -v"
print_expected "0.1.0 (or current version number)"
run_command "atlas -v"
ask_verify

print_test "Help Command" "atlas --help"
print_expected "Shows command list including:
  - project (Project registry operations)
  - session (Session management)
  - catch (Quick capture)
  - dashboard (Launch TUI)"
run_command "atlas --help"
ask_verify

# ============================================================================
print_header "2. Project Management"
# ============================================================================

# Create a test project directory
mkdir -p "$TEST_DIR/test-project"
cat > "$TEST_DIR/test-project/.STATUS" << 'EOF'
## Project: test-project
## Type: node-package
## Status: active
## Progress: 75
## Focus: Testing atlas dashboard
## Next: Verify card layout
EOF

print_test "Sync Projects" "atlas sync --dry-run"
print_expected "Shows sync summary with discovered projects
Should mention 'test-project' or show scan results"
run_command "atlas sync --paths '$TEST_DIR'"
ask_verify

print_test "Project List" "atlas project list"
print_expected "Table or list showing registered projects
Should include test-project if sync worked"
run_command "atlas project list"
ask_verify

# ============================================================================
print_header "3. Session Management"
# ============================================================================

print_test "Start Session" "atlas session start test-project"
print_expected "Message like:
  🎯 Session started: test-project
  (may show focus if set)"
run_command "atlas session start test-project"
ask_verify

print_test "Session Status" "atlas session status"
print_expected "Shows active session:
  Active: test-project (Xm)
  with duration in minutes"
run_command "atlas session status"
ask_verify

print_test "End Session" "atlas session end 'Test complete'"
print_expected "Message like:
  ✓ Session ended (Xm)
  with duration shown"
run_command "atlas session end 'Test complete'"
ask_verify

# ============================================================================
print_header "4. Quick Capture"
# ============================================================================

print_test "Capture Idea" "atlas catch 'Test idea for dogfooding'"
print_expected "Message like:
  📥 Captured: \"Test idea for dogfooding\""
run_command "atlas catch 'Test idea for dogfooding'"
ask_verify

print_test "View Inbox" "atlas inbox"
print_expected "Shows captured items including:
  - Test idea for dogfooding
  with type icon (💡 or ☐)"
run_command "atlas inbox"
ask_verify

print_test "Inbox Stats" "atlas inbox --stats"
print_expected "Shows inbox statistics:
  📊 INBOX STATS
  📥 Inbox: X
  with counts by type"
run_command "atlas inbox --stats"
ask_verify

# ============================================================================
print_header "5. Context & Breadcrumbs"
# ============================================================================

print_test "Leave Breadcrumb" "atlas crumb 'Testing breadcrumb feature'"
print_expected "Message like:
  🍞 Breadcrumb: \"Testing breadcrumb feature\""
run_command "atlas crumb 'Testing breadcrumb feature'"
ask_verify

print_test "View Trail" "atlas trail"
print_expected "Shows recent breadcrumbs including:
  - Testing breadcrumb feature
  with timestamps"
run_command "atlas trail"
ask_verify

print_test "Where Command" "atlas where"
print_expected "Shows current context:
  - Current/recent project info
  - Session status
  - Recent breadcrumbs"
run_command "atlas where"
ask_verify

# ============================================================================
print_header "6. Status Updates"
# ============================================================================

print_test "Show Status" "atlas status test-project"
print_expected "Shows project status from .STATUS file:
  - Name, Type, Status
  - Progress (75%)
  - Focus and Next action"
run_command "atlas status test-project"
ask_verify

print_test "Update Progress" "atlas status test-project --progress 80"
print_expected "Message confirming update:
  ✓ Updated test-project
  with change details"
run_command "atlas status test-project --progress 80"
ask_verify

print_test "Increment Progress" "atlas status test-project --increment 5"
print_expected "Message like:
  ✓ Progress incremented to 85%"
run_command "atlas status test-project --increment 5"
ask_verify

# ============================================================================
print_header "7. Dashboard (Interactive)"
# ============================================================================

echo ""
echo -e "${YELLOW}${BOLD}Dashboard Test Instructions:${NC}"
echo ""
echo "The dashboard will launch. Please verify:"
echo ""
echo -e "  ${CYAN}1. Card Stack Layout:${NC}"
echo "     - Projects shown as cards (not table rows)"
echo "     - Each card has border and multiple lines"
echo ""
echo -e "  ${CYAN}2. Card Content:${NC}"
echo "     - Status icon (● for active)"
echo "     - Project name in bold"
echo "     - Type • Status • Time ago"
echo "     - Progress bar with percentage (if set)"
echo "     - Next action preview (yellow →)"
echo ""
echo -e "  ${CYAN}3. Navigation:${NC}"
echo "     - ↑↓ moves between cards"
echo "     - Selected card has cyan border"
echo "     - Title shows position (e.g., '1/5')"
echo ""
echo -e "  ${CYAN}4. Keyboard Shortcuts:${NC}"
echo "     - Press ? for help overlay"
echo "     - Press f for focus mode"
echo "     - Press z for zen mode"
echo "     - Press q to quit"
echo ""
echo -e "${DIM}Press Enter to launch dashboard, then q to quit when done...${NC}"
read -r || true

run_command "timeout 60 atlas dashboard || true"

echo ""
echo -e "${BOLD}Dashboard Verification:${NC}"
echo ""
echo -en "1. Did cards display with borders and multiple lines? [y/n/s] "
read -r r1 || r1="s"
echo -en "2. Did cards show progress bars and/or next actions? [y/n/s] "
read -r r2 || r2="s"
echo -en "3. Did navigation (↑↓) work and update title position? [y/n/s] "
read -r r3 || r3="s"
echo -en "4. Did the command bar show contextual shortcuts? [y/n/s] "
read -r r4 || r4="s"

for r in "$r1" "$r2" "$r3" "$r4"; do
    case "$r" in
        y|Y) PASSED=$((PASSED + 1)) ;;
        n|N) FAILED=$((FAILED + 1)) ;;
        *) SKIPPED=$((SKIPPED + 1)) ;;
    esac
done

# ============================================================================
print_header "8. Focus Mode Test"
# ============================================================================

echo ""
echo -e "${YELLOW}${BOLD}Focus Mode Test:${NC}"
echo ""
echo "When dashboard launches:"
echo "  1. Press 'f' to enter focus mode"
echo "  2. Verify: Large timer display, Pomodoro countdown"
echo "  3. Press Space to pause/resume"
echo "  4. Press 'z' to switch to Zen mode"
echo "  5. Press Esc to exit, then q to quit"
echo ""
echo -e "${DIM}Press Enter to launch...${NC}"
read -r || true

run_command "timeout 60 atlas dashboard || true"

echo -en "Did focus mode show large timer with Pomodoro? [y/n/s] "
read -r r5 || r5="s"
echo -en "Did zen mode show minimal UI (just timer/project)? [y/n/s] "
read -r r6 || r6="s"

for r in "$r5" "$r6"; do
    case "$r" in
        y|Y) PASSED=$((PASSED + 1)) ;;
        n|N) FAILED=$((FAILED + 1)) ;;
        *) SKIPPED=$((SKIPPED + 1)) ;;
    esac
done

# ============================================================================
print_header "9. Filter & Search Test"
# ============================================================================

echo ""
echo -e "${YELLOW}${BOLD}Filter & Search Test:${NC}"
echo ""
echo "When dashboard launches:"
echo "  1. Press 'a' to filter active projects"
echo "  2. Title should show 'active' filter"
echo "  3. Press '*' to clear filter"
echo "  4. Press '/' to open search"
echo "  5. Type a project name, press Enter"
echo "  6. Press Esc to clear, then q to quit"
echo ""
echo -e "${DIM}Press Enter to launch...${NC}"
read -r || true

run_command "timeout 60 atlas dashboard || true"

echo -en "Did filter keys (a/p/*) update the title bar? [y/n/s] "
read -r r7 || r7="s"
echo -en "Did search (/) filter projects by name? [y/n/s] "
read -r r8 || r8="s"

for r in "$r7" "$r8"; do
    case "$r" in
        y|Y) PASSED=$((PASSED + 1)) ;;
        n|N) FAILED=$((FAILED + 1)) ;;
        *) SKIPPED=$((SKIPPED + 1)) ;;
    esac
done

# ============================================================================
print_header "10. Decision Helper & Themes"
# ============================================================================

echo ""
echo -e "${YELLOW}${BOLD}Decision Helper & Theme Test:${NC}"
echo ""
echo "When dashboard launches:"
echo "  1. Press 'd' for decision helper"
echo "  2. Should show 'What Should I Work On?' dialog"
echo "  3. Press any key to close"
echo "  4. Press 't' to cycle themes"
echo "  5. Colors should change (default → dark → minimal)"
echo "  6. Press q to quit"
echo ""
echo -e "${DIM}Press Enter to launch...${NC}"
read -r || true

run_command "timeout 60 atlas dashboard || true"

echo -en "Did decision helper show project suggestions? [y/n/s] "
read -r r9 || r9="s"
echo -en "Did theme cycling change the color scheme? [y/n/s] "
read -r r10 || r10="s"

for r in "$r9" "$r10"; do
    case "$r" in
        y|Y) PASSED=$((PASSED + 1)) ;;
        n|N) FAILED=$((FAILED + 1)) ;;
        *) SKIPPED=$((SKIPPED + 1)) ;;
    esac
done

echo ""
echo -e "${GREEN}${BOLD}All tests complete!${NC}"
