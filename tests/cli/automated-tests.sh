#!/bin/bash
# =============================================================================
# Atlas CLI - Automated Test Suite
# Generated: 2025-12-28
# Project: @data-wise/atlas v0.5.6
# =============================================================================
#
# Non-interactive test suite for CI/CD pipelines.
# Run: bash tests/cli/automated-tests.sh
#
# Exit codes:
#   0 - All tests passed
#   1 - One or more tests failed
# =============================================================================

set -uo pipefail
# Note: Not using -e because we handle test failures explicitly

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLI="node $PROJECT_ROOT/bin/atlas.js"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/automated-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Counters
PASS=0
FAIL=0
SKIP=0
TOTAL=0

# -----------------------------------------------------------------------------
# Setup
# -----------------------------------------------------------------------------

mkdir -p "$LOG_DIR"

# Log header
cat > "$LOG_FILE" << EOF
==============================================
Atlas CLI Automated Test Run
Started: $(date)
==============================================

EOF

echo "=============================================="
echo "Atlas CLI Automated Test Run"
echo "Started: $(date)"
echo "=============================================="
echo ""

# -----------------------------------------------------------------------------
# Test Functions
# -----------------------------------------------------------------------------

# Test that a command succeeds (exit code 0)
test_success() {
    local name="$1"
    local cmd="$2"
    local pattern="${3:-}"

    ((TOTAL++))
    printf "${BLUE}[TEST %3d]${NC} %-50s " "$TOTAL" "$name"

    if output=$(eval "$cmd" 2>&1); then
        if [[ -z "$pattern" ]] || echo "$output" | grep -qE "$pattern"; then
            ((PASS++))
            echo -e "${GREEN}PASS${NC}"
            echo "[PASS] $name: $cmd" >> "$LOG_FILE"
        else
            ((FAIL++))
            echo -e "${RED}FAIL${NC} (pattern not found)"
            echo "[FAIL] $name: $cmd (pattern '$pattern' not found)" >> "$LOG_FILE"
            echo "Output: $output" >> "$LOG_FILE"
        fi
    else
        ((FAIL++))
        echo -e "${RED}FAIL${NC} (exit code $?)"
        echo "[FAIL] $name: $cmd (exit code $?)" >> "$LOG_FILE"
        echo "Output: $output" >> "$LOG_FILE"
    fi
}

# Test that a command fails (non-zero exit code)
test_failure() {
    local name="$1"
    local cmd="$2"
    local expected_pattern="${3:-}"

    ((TOTAL++))
    printf "${BLUE}[TEST %3d]${NC} %-50s " "$TOTAL" "$name"

    if output=$(eval "$cmd" 2>&1); then
        ((FAIL++))
        echo -e "${RED}FAIL${NC} (should have failed)"
        echo "[FAIL] $name: $cmd (should have failed)" >> "$LOG_FILE"
    else
        if [[ -z "$expected_pattern" ]] || echo "$output" | grep -qE "$expected_pattern"; then
            ((PASS++))
            echo -e "${GREEN}PASS${NC}"
            echo "[PASS] $name: $cmd" >> "$LOG_FILE"
        else
            ((FAIL++))
            echo -e "${RED}FAIL${NC} (pattern not found)"
            echo "[FAIL] $name: $cmd (pattern '$expected_pattern' not found)" >> "$LOG_FILE"
        fi
    fi
}

# Test that output matches exactly
test_output() {
    local name="$1"
    local cmd="$2"
    local expected="$3"

    ((TOTAL++))
    printf "${BLUE}[TEST %3d]${NC} %-50s " "$TOTAL" "$name"

    if output=$(eval "$cmd" 2>&1); then
        if [[ "$output" == *"$expected"* ]]; then
            ((PASS++))
            echo -e "${GREEN}PASS${NC}"
            echo "[PASS] $name: $cmd" >> "$LOG_FILE"
        else
            ((FAIL++))
            echo -e "${RED}FAIL${NC} (output mismatch)"
            echo "[FAIL] $name: $cmd" >> "$LOG_FILE"
            echo "Expected to contain: $expected" >> "$LOG_FILE"
            echo "Got: $output" >> "$LOG_FILE"
        fi
    else
        ((FAIL++))
        echo -e "${RED}FAIL${NC} (exit code $?)"
        echo "[FAIL] $name: $cmd (exit code $?)" >> "$LOG_FILE"
    fi
}

# Skip a test (for documentation)
skip_test() {
    local name="$1"
    local reason="$2"

    ((TOTAL++))
    ((SKIP++))
    printf "${BLUE}[TEST %3d]${NC} %-50s " "$TOTAL" "$name"
    echo -e "${YELLOW}SKIP${NC} ($reason)"
    echo "[SKIP] $name: $reason" >> "$LOG_FILE"
}

section() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━ $1 ━━━${NC}"
    echo "" >> "$LOG_FILE"
    echo "=== $1 ===" >> "$LOG_FILE"
}

# -----------------------------------------------------------------------------
# Test Categories
# -----------------------------------------------------------------------------

section "1. SMOKE TESTS"

test_success "Version flag" \
    "$CLI --version" \
    "^[0-9]+\.[0-9]+\.[0-9]+"

test_success "Help flag" \
    "$CLI --help" \
    "Usage:"

test_success "Help command" \
    "$CLI help" \
    "Commands:"

test_success "Alias: dash = dashboard" \
    "$CLI dash --help" \
    "Launch interactive dashboard"

# -----------------------------------------------------------------------------

section "2. PROJECT COMMANDS"

test_success "project --help" \
    "$CLI project --help" \
    "Project registry operations"

test_success "project list" \
    "$CLI project list" \
    ""

test_success "project list --format json" \
    "$CLI project list --format json" \
    "^\["

test_success "project list --status active" \
    "$CLI project list --status active" \
    ""

test_success "project add --help" \
    "$CLI project add --help" \
    "Register a project"

test_failure "project show (missing name)" \
    "$CLI project show" \
    "missing required argument"

test_failure "project remove (missing name)" \
    "$CLI project remove" \
    "missing required argument"

# -----------------------------------------------------------------------------

section "3. SESSION COMMANDS"

test_success "session --help" \
    "$CLI session --help" \
    "Session management"

test_success "session start --help" \
    "$CLI session start --help" \
    "Start a work session"

test_success "session end --help" \
    "$CLI session end --help" \
    "End current session"

test_success "session status" \
    "$CLI session status" \
    ""

# -----------------------------------------------------------------------------

section "4. STATS COMMAND"

test_success "stats --help" \
    "$CLI stats --help" \
    "Show session analytics"

test_success "stats (default week)" \
    "$CLI stats" \
    "Session Analytics"

test_success "stats week" \
    "$CLI stats week" \
    "Last 7 Days"

test_success "stats month" \
    "$CLI stats month" \
    "Last 30 Days"

test_success "stats --days 14" \
    "$CLI stats --days 14" \
    "Last 14 Days"

test_success "stats --format json" \
    "$CLI stats --format json" \
    '"summary"'

test_success "stats --format text" \
    "$CLI stats --format text" \
    "sessions"

test_success "stats --project atlas" \
    "$CLI stats --project atlas" \
    "atlas"

# -----------------------------------------------------------------------------

section "5. CAPTURE COMMANDS"

test_success "catch --help" \
    "$CLI catch --help" \
    "Quick capture"

test_success "inbox --help" \
    "$CLI inbox --help" \
    "Show captured items"

test_success "inbox" \
    "$CLI inbox" \
    ""

test_success "inbox --stats" \
    "$CLI inbox --stats" \
    ""

# -----------------------------------------------------------------------------

section "6. CONTEXT COMMANDS"

test_success "where --help" \
    "$CLI where --help" \
    ""

test_success "crumb --help" \
    "$CLI crumb --help" \
    "Leave a breadcrumb"

test_success "trail --help" \
    "$CLI trail --help" \
    "Show breadcrumb trail"

test_success "trail" \
    "$CLI trail" \
    ""

# -----------------------------------------------------------------------------

section "7. PARK/UNPARK COMMANDS"

test_success "park --help" \
    "$CLI park --help" \
    "Park current context"

test_success "unpark --help" \
    "$CLI unpark --help" \
    "Restore a parked context"

test_success "parked --help" \
    "$CLI parked --help" \
    "List parked contexts"

test_success "parked" \
    "$CLI parked" \
    ""

# -----------------------------------------------------------------------------

section "8. TEMPLATE COMMANDS"

test_success "template --help" \
    "$CLI template --help" \
    "Manage project templates"

test_success "template list" \
    "$CLI template list" \
    ""

test_success "template show node" \
    "$CLI template show node" \
    "Status:"

test_success "template show r-package" \
    "$CLI template show r-package" \
    "Status:"

test_success "template show python" \
    "$CLI template show python" \
    "Status:"

test_success "template show quarto" \
    "$CLI template show quarto" \
    "Status:"

test_success "template show research" \
    "$CLI template show research" \
    "Status:"

test_success "template show minimal" \
    "$CLI template show minimal" \
    "Status:"

test_output "template show invalid" \
    "$CLI template show nonexistent-template-xyz" \
    "Template not found"

test_success "template dir" \
    "$CLI template dir" \
    "templates"

# -----------------------------------------------------------------------------

section "9. CONFIG COMMANDS"

test_success "config --help" \
    "$CLI config --help" \
    "Manage atlas configuration"

test_success "config paths" \
    "$CLI config paths" \
    ""

test_success "config show" \
    "$CLI config show" \
    ""

test_success "config prefs --help" \
    "$CLI config prefs --help" \
    ""

# -----------------------------------------------------------------------------

section "9. SYNC & MIGRATE"

test_success "sync --help" \
    "$CLI sync --help" \
    "Sync registry"

test_success "sync --dry-run" \
    "$CLI sync --dry-run" \
    ""

test_success "migrate --help" \
    "$CLI migrate --help" \
    "Migrate data"

# -----------------------------------------------------------------------------

section "10. COMPLETIONS"

test_success "completions" \
    "$CLI completions" \
    "Shell completions"

test_success "completions zsh" \
    "$CLI completions zsh" \
    "_atlas"

test_success "completions bash" \
    "$CLI completions bash" \
    "atlas"

test_success "completions fish" \
    "$CLI completions fish" \
    "complete"

test_failure "completions invalid" \
    "$CLI completions invalid-shell" \
    "Unsupported shell"

# -----------------------------------------------------------------------------

section "11. INIT COMMAND"

test_success "init --help" \
    "$CLI init --help" \
    "Initialize atlas"

# -----------------------------------------------------------------------------

section "12. DASHBOARD COMMAND"

test_success "dashboard --help" \
    "$CLI dashboard --help" \
    "Launch interactive dashboard"

test_success "dash --help" \
    "$CLI dash --help" \
    "Launch interactive dashboard"

# -----------------------------------------------------------------------------

section "13. ERROR HANDLING"

test_failure "Unknown command" \
    "$CLI unknowncommand123" \
    "unknown command"

test_failure "Invalid storage option" \
    "$CLI --storage invalid project list" \
    ""

# -----------------------------------------------------------------------------

section "15. STATUS & FOCUS COMMANDS"

test_success "status --help" \
    "$CLI status --help" \
    ""

test_success "focus --help" \
    "$CLI focus --help" \
    ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}                    TEST SUMMARY${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC}  $PASS"
echo -e "  ${RED}Failed:${NC}  $FAIL"
echo -e "  ${YELLOW}Skipped:${NC} $SKIP"
echo -e "  ${BLUE}Total:${NC}   $TOTAL"
echo ""
echo "  Log: $LOG_FILE"
echo ""

# Log summary
{
    echo ""
    echo "=============================================="
    echo "SUMMARY"
    echo "=============================================="
    echo "Passed:  $PASS"
    echo "Failed:  $FAIL"
    echo "Skipped: $SKIP"
    echo "Total:   $TOTAL"
    echo "Finished: $(date)"
    echo "=============================================="
} >> "$LOG_FILE"

# Exit with failure if any tests failed
if [[ $FAIL -gt 0 ]]; then
    echo -e "${RED}${BOLD}TESTS FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}${BOLD}ALL TESTS PASSED${NC}"
    exit 0
fi
