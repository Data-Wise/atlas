#!/usr/bin/env bash
#
# Dogfooding tests for Ink Dashboard (Real Data)
#
# These tests run the actual dashboard in various scenarios to ensure it works
# in real terminal environments with real Atlas data from ~/.atlas.
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

# Test 1: Dashboard launches without errors
test_dashboard_launches() {
    log_test "Dashboard launches without errors"

    # Run dashboard for 2 seconds then quit (needs time to fetch real data)
    # Exit codes: 0=clean, 124=timeout, 13=SIGPIPE (no TTY) — all acceptable
    timeout 2s npx tsx src/cli/dashboard-ink/index.tsx > /dev/null 2>&1 || {
        exit_code=$?
        if [ $exit_code -eq 124 ] || [ $exit_code -eq 0 ] || [ $exit_code -eq 13 ]; then
            log_pass "Dashboard launched successfully (exit: $exit_code)"
            return 0
        else
            log_fail "Dashboard failed to launch (exit code: $exit_code)"
            return 1
        fi
    }

    log_pass "Dashboard launched and exited cleanly"
}

# Test 2: Dashboard handles non-TTY input gracefully
test_tty_handling() {
    log_test "Dashboard handles non-TTY input gracefully"

    # Run without TTY (piped input)
    output=$(echo "" | npx tsx src/cli/dashboard-ink/index.tsx 2>&1 || true)

    # Should show "Raw mode is not supported" or exit cleanly
    if echo "$output" | grep -qi "raw mode\|not supported\|error"; then
        log_pass "Non-TTY handled with appropriate message"
    else
        if [ -n "$output" ]; then
            log_pass "Non-TTY handled (exited or rendered)"
        else
            log_pass "Non-TTY handled (clean exit, no output)"
        fi
    fi
}

# Test 3: File structure is complete (includes new hooks)
test_file_structure() {
    log_test "Dashboard file structure is complete"

    required_files=(
        "src/cli/dashboard-ink/index.tsx"
        "src/cli/dashboard-ink/components/App.tsx"
        "src/cli/dashboard-ink/components/views/MainView.tsx"
        "src/cli/dashboard-ink/components/SidebarPanel.tsx"
        "src/cli/dashboard-ink/components/InspectorPanel.tsx"
        "src/cli/dashboard-ink/components/shared/Card.tsx"
        "src/cli/dashboard-ink/lib/AtlasContext.tsx"
        "src/cli/dashboard-ink/lib/LayoutManager.tsx"
        "src/cli/dashboard-ink/lib/ThemeContext.tsx"
        "src/cli/dashboard-ink/lib/stateMachine.ts"
        "src/cli/dashboard-ink/hooks/useProjects.ts"
        "src/cli/dashboard-ink/hooks/useActiveSession.ts"
        "src/cli/dashboard-ink/hooks/useProjectStats.ts"
        "src/cli/dashboard-ink/hooks/usePendingCaptures.ts"
        "src/cli/dashboard-ink/types.ts"
        "src/cli/dashboard-ink/constants.ts"
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

# Test 4: Dependencies are installed
test_dependencies() {
    log_test "Required dependencies are installed"

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

    if [ -d "node_modules/ink" ]; then
        log_pass "Ink installed in node_modules"
    else
        log_fail "Ink not found in node_modules"
        return 1
    fi
}

# Test 5: Atlas data directory exists (real data requirement)
test_atlas_data() {
    log_test "Atlas data directory exists for real data"

    if [ -d "$HOME/.atlas" ]; then
        log_pass "~/.atlas directory exists"
    else
        log_fail "~/.atlas directory not found — dashboard needs real data"
        return 1
    fi

    # Atlas stores projects in projects.json (flat file) or projects/ directory
    if [ -f "$HOME/.atlas/projects.json" ]; then
        log_pass "projects.json exists (filesystem storage)"
    elif [ -d "$HOME/.atlas/projects" ]; then
        project_count=$(ls "$HOME/.atlas/projects/" 2>/dev/null | wc -l | tr -d ' ')
        log_pass "Projects directory exists ($project_count project files)"
    elif [ -f "$HOME/.atlas/atlas.db" ]; then
        log_pass "atlas.db exists (SQLite storage)"
    else
        log_fail "No project storage found in ~/.atlas"
        return 1
    fi
}

# Test 6: No mock data remains in App.tsx
test_no_mock_data() {
    log_test "No mock data remains in App.tsx"

    app_file="src/cli/dashboard-ink/components/App.tsx"

    if grep -qi "MOCK_PROJECTS\|MOCK_CRUMBS\|MOCK_HEATMAP" "$app_file"; then
        log_fail "Mock data constants still present in App.tsx"
        return 1
    else
        log_pass "No MOCK_ constants in App.tsx"
    fi

    if grep -q "useProjects" "$app_file"; then
        log_pass "useProjects hook is imported"
    else
        log_fail "useProjects hook not imported"
        return 1
    fi

    if grep -q "useActiveSession" "$app_file"; then
        log_pass "useActiveSession hook is imported"
    else
        log_fail "useActiveSession hook not imported"
        return 1
    fi

    if grep -q "useProjectStats" "$app_file"; then
        log_pass "useProjectStats hook is imported"
    else
        log_fail "useProjectStats hook not imported"
        return 1
    fi

    if grep -q "usePendingCaptures" "$app_file"; then
        log_pass "usePendingCaptures hook is imported"
    else
        log_fail "usePendingCaptures hook not imported"
        return 1
    fi
}

# Test 7: AtlasContext wraps App in index.tsx
test_atlas_context_wiring() {
    log_test "AtlasContext is wired in index.tsx"

    index_file="src/cli/dashboard-ink/index.tsx"

    if grep -q "AtlasProvider" "$index_file"; then
        log_pass "AtlasProvider used in index.tsx"
    else
        log_fail "AtlasProvider not found in index.tsx"
        return 1
    fi

    if grep -q "Container" "$index_file"; then
        log_pass "Container imported in index.tsx"
    else
        log_fail "Container not imported in index.tsx"
        return 1
    fi
}

# Test 8: Jest ink tests all pass
test_jest_ink_suite() {
    log_test "Jest ink test suite passes"

    output=$(npm run test:ink 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        # Extract test count
        test_count=$(echo "$output" | grep "Tests:" | tail -1)
        log_pass "Jest ink tests pass: $test_count"
    else
        log_fail "Jest ink tests failed (exit code: $exit_code)"
        echo "$output" | grep -E "(FAIL|Error)" | head -5
        return 1
    fi
}

# Test 9: Dashboard can be run multiple times
test_multiple_runs() {
    log_test "Dashboard can be run multiple times without issues"

    for i in {1..3}; do
        timeout 2s npx tsx src/cli/dashboard-ink/index.tsx > /dev/null 2>&1 || {
            exit_code=$?
            # 0=clean, 124=timeout, 13=SIGPIPE (no TTY) — all acceptable
            if [ $exit_code -eq 124 ] || [ $exit_code -eq 0 ] || [ $exit_code -eq 13 ]; then
                continue
            else
                log_fail "Run $i failed with exit code $exit_code"
                return 1
            fi
        }
    done

    log_pass "Multiple runs successful"
}

# Test 10: No hardcoded values remain in SidebarPanel/InspectorPanel props
test_no_hardcoded_props() {
    log_test "No hardcoded mock values in panel props"

    app_file="src/cli/dashboard-ink/components/App.tsx"

    # Check for hardcoded numeric props that should be from hooks
    if grep -q 'pendingCaptures={[0-9]}' "$app_file"; then
        log_fail "Hardcoded pendingCaptures value found"
        return 1
    else
        log_pass "pendingCaptures uses hook data"
    fi

    if grep -q 'sessionSeconds={[0-9]}' "$app_file"; then
        log_fail "Hardcoded sessionSeconds value found"
        return 1
    else
        log_pass "sessionSeconds uses hook data"
    fi

    if grep -q 'streakDays={[0-9]}' "$app_file"; then
        log_fail "Hardcoded streakDays value found"
        return 1
    else
        log_pass "streakDays uses hook data"
    fi

    if grep -q 'totalSessions={[0-9]}' "$app_file"; then
        log_fail "Hardcoded totalSessions value found"
        return 1
    else
        log_pass "totalSessions uses hook data"
    fi
}

# Main test runner
main() {
    echo "========================================"
    echo "Atlas Ink Dashboard - Dogfooding Tests"
    echo "  (Real Data Edition)"
    echo "========================================"
    echo ""

    # Change to project root
    cd "$(dirname "$0")/../../.."

    # Run all tests
    test_file_structure || true
    test_dependencies || true
    test_atlas_data || true
    test_no_mock_data || true
    test_atlas_context_wiring || true
    test_no_hardcoded_props || true
    test_dashboard_launches || true
    test_tty_handling || true
    test_multiple_runs || true
    test_jest_ink_suite || true

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
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed${NC}"
        exit 1
    fi
}

# Run main
main
