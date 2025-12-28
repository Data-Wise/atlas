#!/bin/bash
# =============================================================================
# Atlas CLI - Interactive Test Suite
# Generated: 2025-12-28
# Project: @data-wise/atlas v0.5.6
# =============================================================================
#
# Human-guided QA with expected/actual comparison.
# Run: bash tests/cli/interactive-tests.sh
#
# Controls:
#   y - Test passed
#   n - Test failed
#   s - Skip test
#   q - Quit early
#   r - Re-run current test
# =============================================================================

set -uo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLI="node $PROJECT_ROOT/bin/atlas.js"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/interactive-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

# Counters
PASS=0
FAIL=0
SKIP=0
CURRENT=0
TOTAL_TESTS=0

# Test definitions (populated by add_test)
declare -a TEST_NAMES
declare -a TEST_COMMANDS
declare -a TEST_EXPECTED

# -----------------------------------------------------------------------------
# Setup
# -----------------------------------------------------------------------------

mkdir -p "$LOG_DIR"

# Log header
{
    echo "=============================================="
    echo "Atlas CLI Interactive Test Run"
    echo "Started: $(date)"
    echo "=============================================="
    echo ""
} > "$LOG_FILE"

# -----------------------------------------------------------------------------
# Test Registration
# -----------------------------------------------------------------------------

add_test() {
    local name="$1"
    local cmd="$2"
    local expected="$3"

    TEST_NAMES+=("$name")
    TEST_COMMANDS+=("$cmd")
    TEST_EXPECTED+=("$expected")
    ((TOTAL_TESTS++))
}

# -----------------------------------------------------------------------------
# UI Functions
# -----------------------------------------------------------------------------

clear_screen() {
    printf '\033[2J\033[H'
}

draw_header() {
    local test_num=$1
    local test_name=$2

    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║${NC}  ${BOLD}ATLAS CLI${NC} ${DIM}Interactive Test Suite${NC}                                      ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}                                                                          ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}  Test ${YELLOW}$test_num${NC} of ${TOTAL_TESTS}                                                          ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BOLD}${MAGENTA}$test_name${NC}"
    echo ""
}

draw_separator() {
    echo -e "${DIM}────────────────────────────────────────────────────────────────────────────${NC}"
}

show_expected() {
    local expected="$1"
    echo -e "  ${BOLD}Expected:${NC}"
    echo -e "  ${GREEN}$expected${NC}"
    echo ""
}

show_command() {
    local cmd="$1"
    echo -e "  ${BOLD}Command:${NC}"
    echo -e "  ${CYAN}\$ $cmd${NC}"
    echo ""
}

show_output() {
    local output="$1"
    echo -e "  ${BOLD}Actual Output:${NC}"
    echo "$output" | head -20 | sed 's/^/  /'
    local lines=$(echo "$output" | wc -l)
    if [[ $lines -gt 20 ]]; then
        echo -e "  ${DIM}... ($((lines - 20)) more lines)${NC}"
    fi
    echo ""
}

show_controls() {
    draw_separator
    echo ""
    echo -e "  ${GREEN}y${NC} Pass  │  ${RED}n${NC} Fail  │  ${YELLOW}s${NC} Skip  │  ${BLUE}r${NC} Re-run  │  ${MAGENTA}q${NC} Quit"
    echo ""
    printf "  Your verdict: "
}

show_progress_bar() {
    local current=$1
    local total=$2
    local pass=$3
    local fail=$4
    local skip=$5

    local pct=$((current * 100 / total))
    local filled=$((pct / 2))
    local empty=$((50 - filled))

    printf "\n  Progress: ["
    printf "${GREEN}%${filled}s${NC}" | tr ' ' '█'
    printf "${DIM}%${empty}s${NC}" | tr ' ' '░'
    printf "] %d%%\n" "$pct"
    printf "  ${GREEN}✓ %d${NC}  ${RED}✗ %d${NC}  ${YELLOW}○ %d${NC}\n\n" "$pass" "$fail" "$skip"
}

# -----------------------------------------------------------------------------
# Test Execution
# -----------------------------------------------------------------------------

run_test() {
    local idx=$1
    local name="${TEST_NAMES[$idx]}"
    local cmd="${TEST_COMMANDS[$idx]}"
    local expected="${TEST_EXPECTED[$idx]}"

    while true; do
        clear_screen
        draw_header "$((idx + 1))" "$name"
        show_expected "$expected"
        show_command "$cmd"

        draw_separator
        echo ""
        echo -e "  ${DIM}Running command...${NC}"

        # Run the command
        local output
        local exit_code
        output=$(eval "$cmd" 2>&1) || exit_code=$?

        clear_screen
        draw_header "$((idx + 1))" "$name"
        show_expected "$expected"
        show_command "$cmd"
        show_output "$output"
        show_progress_bar "$((idx))" "$TOTAL_TESTS" "$PASS" "$FAIL" "$SKIP"
        show_controls

        # Read single character
        read -rsn1 verdict

        case "$verdict" in
            y|Y)
                ((PASS++))
                echo -e "${GREEN}PASS${NC}"
                echo "[PASS] $name" >> "$LOG_FILE"
                echo "  Command: $cmd" >> "$LOG_FILE"
                return 0
                ;;
            n|N)
                ((FAIL++))
                echo -e "${RED}FAIL${NC}"
                echo "[FAIL] $name" >> "$LOG_FILE"
                echo "  Command: $cmd" >> "$LOG_FILE"
                echo "  Expected: $expected" >> "$LOG_FILE"
                echo "  Output: $output" >> "$LOG_FILE"
                return 0
                ;;
            s|S)
                ((SKIP++))
                echo -e "${YELLOW}SKIP${NC}"
                echo "[SKIP] $name" >> "$LOG_FILE"
                return 0
                ;;
            r|R)
                echo -e "${BLUE}Re-running...${NC}"
                continue
                ;;
            q|Q)
                echo -e "${MAGENTA}Quitting...${NC}"
                return 1
                ;;
            *)
                echo -e "${DIM}Invalid input. Use y/n/s/r/q${NC}"
                sleep 1
                ;;
        esac
    done
}

show_summary() {
    clear_screen
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║${NC}                          ${BOLD}TEST SUMMARY${NC}                                  ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${GREEN}Passed:${NC}  $PASS"
    echo -e "  ${RED}Failed:${NC}  $FAIL"
    echo -e "  ${YELLOW}Skipped:${NC} $SKIP"
    echo -e "  ${BLUE}Total:${NC}   $TOTAL_TESTS"
    echo ""
    echo -e "  Log file: ${DIM}$LOG_FILE${NC}"
    echo ""

    if [[ $FAIL -eq 0 ]]; then
        echo -e "  ${GREEN}${BOLD}All tests passed!${NC} 🎉"
    else
        echo -e "  ${RED}${BOLD}$FAIL test(s) failed${NC}"
    fi
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
        echo "Total:   $TOTAL_TESTS"
        echo "Finished: $(date)"
    } >> "$LOG_FILE"
}

# -----------------------------------------------------------------------------
# Test Definitions
# -----------------------------------------------------------------------------

# Section 1: Smoke Tests
add_test "Version Output" \
    "$CLI --version" \
    "Shows version number (e.g., 0.5.6)"

add_test "Main Help" \
    "$CLI --help" \
    "Shows usage info with all commands listed"

# Section 2: Project Commands
add_test "Project List" \
    "$CLI project list" \
    "Lists registered projects (may be empty or show project table)"

add_test "Project List JSON" \
    "$CLI project list --format json" \
    "Returns valid JSON array of projects"

add_test "Project Add Help" \
    "$CLI project add --help" \
    "Shows options for registering a project"

# Section 3: Session Commands
add_test "Session Status" \
    "$CLI session status" \
    "Shows current session or 'no active session' message"

add_test "Session Start Help" \
    "$CLI session start --help" \
    "Shows how to start a work session"

# Section 4: Capture Commands
add_test "View Inbox" \
    "$CLI inbox" \
    "Shows captured items (may be empty)"

add_test "Inbox JSON Format" \
    "$CLI inbox --format json" \
    "Returns valid JSON (empty array [] or items)"

# Section 5: Context Commands
add_test "Trail History" \
    "$CLI trail" \
    "Shows breadcrumb trail (may be empty)"

add_test "Parked Contexts" \
    "$CLI parked" \
    "Lists parked contexts (may be empty)"

# Section 6: Template Commands
add_test "Template List" \
    "$CLI template list" \
    "Shows available templates (node, python, r-package, etc.)"

add_test "Template Show Node" \
    "$CLI template show node" \
    "Shows .STATUS template content for Node.js projects"

add_test "Template Show Research" \
    "$CLI template show research" \
    "Shows .STATUS template content for research projects"

add_test "Template Directory" \
    "$CLI template dir" \
    "Shows path to custom templates directory"

# Section 7: Config Commands
add_test "Config Show" \
    "$CLI config show" \
    "Shows current configuration (scan paths, preferences)"

add_test "Config Paths" \
    "$CLI config paths" \
    "Shows configured scan paths"

# Section 8: Sync & Migrate
add_test "Sync Dry Run" \
    "$CLI sync --dry-run" \
    "Shows what would be synced without making changes"

add_test "Migrate Help" \
    "$CLI migrate --help" \
    "Shows migration options between storage backends"

# Section 9: Completions
add_test "Completions ZSH" \
    "$CLI completions zsh | head -5" \
    "Shows ZSH completion script (starts with #compdef or function)"

add_test "Completions Bash" \
    "$CLI completions bash | head -5" \
    "Shows Bash completion script"

# Section 10: Error Handling
add_test "Invalid Command" \
    "$CLI notarealcommand 2>&1 || true" \
    "Shows error: unknown command"

add_test "Missing Required Arg" \
    "$CLI project show 2>&1 || true" \
    "Shows error about missing project name"

# Section 11: Dashboard
add_test "Dashboard Help" \
    "$CLI dash --help" \
    "Shows dashboard command info (alias for dashboard)"

# Section 12: Status & Focus
add_test "Status Help" \
    "$CLI status --help" \
    "Shows status command options"

add_test "Focus Help" \
    "$CLI focus --help" \
    "Shows focus command usage"

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    # Welcome screen
    clear_screen
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║${NC}                                                                          ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}         ${BOLD}ATLAS CLI${NC} - Interactive Test Suite                             ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}                                                                          ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}         $TOTAL_TESTS tests ready to run                                          ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}                                                                          ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}         Controls:                                                        ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}         ${GREEN}y${NC} = Pass    ${RED}n${NC} = Fail    ${YELLOW}s${NC} = Skip                            ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}         ${BLUE}r${NC} = Re-run  ${MAGENTA}q${NC} = Quit                                         ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}║${NC}                                                                          ${CYAN}║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Press ${GREEN}Enter${NC} to begin or ${MAGENTA}q${NC} to quit..."
    read -rsn1 key
    if [[ "$key" == "q" || "$key" == "Q" ]]; then
        echo "Cancelled."
        exit 0
    fi

    # Run tests
    for ((i = 0; i < TOTAL_TESTS; i++)); do
        if ! run_test "$i"; then
            break
        fi
    done

    # Show summary
    show_summary
}

main "$@"
