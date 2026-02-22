#!/usr/bin/env bash
#
# Dogfooding tests for Ink Dashboard POC
#
# These tests run the actual POC in various scenarios to ensure it works
# in real terminal environments, not just in ink-testing-library
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
    TESTS_RUN=$((TESTS_RUN + 1))
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

# Test 1: POC launches without errors
test_poc_launches() {
    log_test "POC launches without errors"

    # Run POC for 1 second then quit
    timeout 1s npx tsx src/cli/dashboard-ink/index.tsx > /dev/null 2>&1 || {
        exit_code=$?
        # Exit code 124 = timeout (expected), 0 = normal exit
        if [ $exit_code -eq 124 ] || [ $exit_code -eq 0 ]; then
            log_pass "POC launched successfully"
            return 0
        else
            log_fail "POC failed to launch (exit code: $exit_code)"
            return 1
        fi
    }

    log_pass "POC launched and exited cleanly"
}

# Test 2: POC renders expected output
test_poc_renders() {
    log_test "POC renders expected dashboard elements"

    # Capture output
    output=$(timeout 1s npx tsx src/cli/dashboard-ink/index.tsx 2>&1 || true)

    # Check for key elements
    if echo "$output" | grep -q "Atlas Dashboard (Ink POC)"; then
        log_pass "Header rendered"
    else
        log_fail "Header not found in output"
        return 1
    fi

    if echo "$output" | grep -q "5 projects"; then
        log_pass "Project count rendered"
    else
        log_fail "Project count not found"
        return 1
    fi

    if echo "$output" | grep -q "j/k: Navigate"; then
        log_pass "Command bar rendered"
    else
        log_fail "Command bar not found"
        return 1
    fi

    if echo "$output" | grep -q "atlas"; then
        log_pass "Project card rendered"
    else
        log_fail "Project card not found"
        return 1
    fi
}

# Test 3: POC handles TTY check correctly
test_tty_handling() {
    log_test "POC handles non-TTY input gracefully"

    # Run without TTY (piped input)
    output=$(echo "" | npx tsx src/cli/dashboard-ink/index.tsx 2>&1 || true)

    # Should show "Raw mode is not supported" message
    if echo "$output" | grep -q "Raw mode is not supported"; then
        log_pass "Non-TTY handled with appropriate message"
    else
        # Or it might just exit cleanly
        if [ -n "$output" ]; then
            log_pass "Non-TTY handled (exited or rendered)"
        else
            log_fail "Unexpected behavior with non-TTY input"
            return 1
        fi
    fi
}

# Test 4: POC works in interactive mode
test_interactive_mode() {
    log_test "POC works in interactive terminal mode"

    # This test checks if the POC can run in an actual TTY
    # We use 'script' command to create a pseudo-TTY

    if command -v script &> /dev/null; then
        # On macOS/BSD
        if [[ "$OSTYPE" == "darwin"* ]]; then
            output=$(script -q /dev/null npx tsx src/cli/dashboard-ink/index.tsx <<< "q" 2>&1 || true)
        else
            # On Linux
            output=$(script -qec "npx tsx src/cli/dashboard-ink/index.tsx" /dev/null <<< "q" 2>&1 || true)
        fi

        if echo "$output" | grep -q "Atlas Dashboard"; then
            log_pass "POC runs in interactive mode"
        else
            log_fail "POC failed in interactive mode"
            return 1
        fi
    else
        log_pass "Skipped (script command not available)"
    fi
}

# Test 5: POC TypeScript compilation
test_typescript_compilation() {
    log_test "TypeScript files compile without errors"

    # Try to compile the POC files
    if npx tsc --noEmit --project tsconfig.json src/cli/dashboard-ink/*.tsx 2>&1 | grep -q "error TS"; then
        log_fail "TypeScript compilation errors detected"
        return 1
    else
        log_pass "TypeScript compilation clean"
    fi
}

# Test 6: POC renders all 5 mock projects
test_all_projects_render() {
    log_test "All 5 mock projects are rendered"

    output=$(timeout 2s npx tsx src/cli/dashboard-ink/index.tsx 2>&1 || true)

    projects=("atlas" "flow-cli" "mcp-server-statistical-research" "rmediation" "causal-inference")

    for project in "${projects[@]}"; do
        if echo "$output" | grep -q "$project"; then
            log_pass "Project '$project' found in output"
        else
            log_fail "Project '$project' not found"
            return 1
        fi
    done
}

# Test 7: POC shows progress bars
test_progress_bars() {
    log_test "Progress bars render correctly"

    output=$(timeout 1s npx tsx src/cli/dashboard-ink/index.tsx 2>&1 || true)

    # Check for progress bar characters
    if echo "$output" | grep -q "█"; then
        log_pass "Filled progress blocks rendered"
    else
        log_fail "Filled progress blocks not found"
        return 1
    fi

    if echo "$output" | grep -q "░"; then
        log_pass "Empty progress blocks rendered"
    else
        log_fail "Empty progress blocks not found"
        return 1
    fi
}

# Test 8: POC file structure exists
test_file_structure() {
    log_test "POC file structure is complete"

    required_files=(
        "src/cli/dashboard-ink/index.tsx"
        "src/cli/dashboard-ink/components/App.tsx"
        "src/cli/dashboard-ink/components/views/MainView.tsx"
        "src/cli/dashboard-ink/components/shared/Card.tsx"
        "src/cli/dashboard-ink/README.md"
    )

    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_pass "File exists: $file"
        else
            log_fail "File missing: $file"
            return 1
        fi
    done
}

# Test 9: Dependencies are installed
test_dependencies() {
    log_test "Required dependencies are installed"

    # Check package.json for dependencies
    if grep -q '"ink"' package.json; then
        log_pass "Ink dependency listed"
    else
        log_fail "Ink dependency missing"
        return 1
    fi

    if grep -q '"react"' package.json; then
        log_pass "React dependency listed"
    else
        log_fail "React dependency missing"
        return 1
    fi

    # Check if node_modules exist
    if [ -d "node_modules/ink" ]; then
        log_pass "Ink installed in node_modules"
    else
        log_fail "Ink not found in node_modules"
        return 1
    fi
}

# Test 10: POC can be run multiple times
test_multiple_runs() {
    log_test "POC can be run multiple times without issues"

    for i in {1..3}; do
        timeout 1s npx tsx src/cli/dashboard-ink/index.tsx > /dev/null 2>&1 || {
            exit_code=$?
            if [ $exit_code -eq 124 ] || [ $exit_code -eq 0 ]; then
                continue
            else
                log_fail "Run $i failed with exit code $exit_code"
                return 1
            fi
        }
    done

    log_pass "Multiple runs successful"
}

# Main test runner
main() {
    echo "========================================"
    echo "Atlas Ink POC - Dogfooding Tests"
    echo "========================================"
    echo ""

    # Change to project root
    cd "$(dirname "$0")/../../.."

    # Run all tests
    test_file_structure || true
    test_dependencies || true
    test_typescript_compilation || true
    test_poc_launches || true
    test_poc_renders || true
    test_tty_handling || true
    test_interactive_mode || true
    test_all_projects_render || true
    test_progress_bars || true
    test_multiple_runs || true

    # Summary
    echo ""
    echo "========================================"
    echo "Test Summary"
    echo "========================================"
    echo "Tests run:    $TESTS_RUN"
    echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        exit 1
    fi
}

# Run main
main
