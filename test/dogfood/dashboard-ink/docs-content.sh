#!/usr/bin/env bash
#
# Dogfooding tests for Documentation Content
#
# Tests that the documentation is complete, accurate, and up-to-date.
# These tests verify the content itself, not just the build.

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

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

# Change to project root
cd "$(dirname "$0")/../../.."

# Test 1: All nav entries in mkdocs.yml point to existing files
test_nav_entries_exist() {
    log_test "All nav entries point to existing files"
    local missing=0
    while IFS= read -r line; do
        if [[ $line =~ :\ *([^#\s]+\.md) ]]; then
            local file="${BASH_REMATCH[1]}"
            if [[ ! -f "docs/$file" ]]; then
                echo "  Missing: docs/$file"
                missing=1
            fi
        fi
    done < <(grep -A 100 '^nav:' mkdocs.yml | head -n 100)

    if [[ $missing -eq 0 ]]; then
        log_pass "All nav files exist"
    else
        log_fail "Some nav files are missing"
        return 1
    fi
}

# Test 2: Cookbook has 28 recipes (1-28)
test_cookbook_recipes() {
    log_test "Cookbook has 28 recipes"
    local count=$(grep -c "^## Recipe " docs/user-guide/cookbook/COOKBOOK.md)
    if [[ $count -eq 28 ]]; then
        log_pass "Cookbook has $count recipes"
    else
        log_fail "Cookbook has $count recipes (expected 28)"
        return 1
    fi
}

# Test 3: All cookbook recipes have the required structure
test_cookbook_structure() {
    log_test "All cookbook recipes follow required structure"
    local issues=0
    local recipe_num=1
    while IFS= read -r line; do
        if [[ $line =~ ^##\ Recipe\ ([0-9]+)\ \-\ (.+)$ ]]; then
            local num="${BASH_REMATCH[1]}"
            local title="${BASH_REMATCH[2]}"
            if [[ $num -ne $recipe_num ]]; then
                echo "  Recipe numbering gap: expected $recipe_num, got $num ($title)"
                issues=1
            fi
            recipe_num=$((num + 1))
        fi
    done < docs/user-guide/cookbook/COOKBOOK.md

    if [[ $issues -eq 0 ]]; then
        log_pass "All recipes properly numbered and structured"
    else
        log_fail "Recipe structure issues found"
        return 1
    fi
}

# Test 4: Workflows docs have the new guides
test_workflow_guides() {
    log_test "Workflow guides exist (Weekly Review, Multi-Project, Automation)"
    local guides=(
        "docs/user-guide/workflows/WEEKLY-REVIEW.md"
        "docs/user-guide/workflows/MULTI-PROJECT.md"
        "docs/user-guide/workflows/AUTOMATION.md"
    )
    local missing=0
    for guide in "${guides[@]}"; do
        if [[ ! -f "$guide" ]]; then
            echo "  Missing: $guide"
            missing=1
        fi
    done

    if [[ $missing -eq 0 ]]; then
        log_pass "All workflow guides exist"
    else
        log_fail "Some workflow guides missing"
        return 1
    fi
}

# Test 5: Tutorials in user-guide/tutorials/
test_tutorials_exist() {
    log_test "Tutorials exist in user-guide/tutorials/"
    local tutorials=(
        "docs/user-guide/tutorials/visual-features.md"
        "docs/user-guide/tutorials/research-registry.md"
    )
    local missing=0
    for tut in "${tutorials[@]}"; do
        if [[ ! -f "$tut" ]]; then
            echo "  Missing: $tut"
            missing=1
        fi
    done

    if [[ $missing -eq 0 ]]; then
        log_pass "All tutorials exist"
    else
        log_fail "Some tutorials missing"
        return 1
    fi
}

# Test 6: No v0.13.0 references in non-historical contexts (except WHAT-S-NEW, ROADMAP, REFCARD)
test_version_consistency() {
    log_test "Version consistency - no v0.13.0 in current docs"
    local files=$(find docs -name "*.md" -not -path "docs/WHAT-S-NEW.md" -not -path "docs/ROADMAP.md" -not -path "docs/REFCARD.md" -not -path "docs/specs/*" -not -path "docs/prompts/*" -not -path "docs/plans/*" -not -path "docs/internal/*" -not -path "docs/superpowers/*")
    local issues=0

    for file in $files; do
        if grep -q "0\.13\.0" "$file" 2>/dev/null; then
            # Check if it's in historical context
            local context=$(grep -B3 -A3 "0\.13\.0" "$file" 2>/dev/null | head -20)
            if ! echo "$context" | grep -qi -E "(v0\.13\.0\s*[—-]|release|history|changelog|version history|what.{0,3}s\.new|introduced in|added in|feature.*v0\.13|new in v0\.13|since v0\.13|roadmap|architectural history|v0\.9\.1 and v0\.13\.0|v0\.13\.0\+|v0\.13\.0\.|part [0-9]:.*\(v0\.13\.0\)|### .*\(v0\.13\.0\)|task management.*\(v0\.13\.0\)|agenda view.*\(v0\.13\.0\)|schedule push.*\(v0\.13\.0\)|analyticsview.*\(v0\.13\.0\))"; then
                echo "  Non-historical v0.13.0 in $file:"
                echo "    $context"
                issues=1
            fi
        fi
    done

    if [[ $issues -eq 0 ]]; then
        log_pass "No non-historical v0.13.0 references"
    else
        log_fail "Found non-historical v0.13.0 references"
        return 1
    fi
}

# Test 7: Shell completions install docs are correct (zsh uses fpath)
test_shell_completions_docs() {
    log_test "Shell completions docs use correct zsh install method"
    local issues=0

    # Check installation.md
    if grep -q "atlas completions zsh >> ~/.zshrc" docs/getting-started/installation.md; then
        echo "  installation.md: uses broken >> ~/.zshrc method"
        issues=1
    fi

    # Check CLI-REFERENCE.md
    if grep -q "atlas completions zsh >> ~/.zshrc" docs/CLI-REFERENCE.md; then
        echo "  CLI-REFERENCE.md: uses broken >> ~/.zshrc method"
        issues=1
    fi

    # Check for correct fpath method
    if ! grep -q "fpath=" docs/getting-started/installation.md; then
        echo "  installation.md: missing fpath method"
        issues=1
    fi

    if [[ $issues -eq 0 ]]; then
        log_pass "Shell completions docs use correct install method"
    else
        log_fail "Shell completions docs have issues"
        return 1
    fi
}

# Test 8: All man pages have v0.13.1
test_man_pages_version() {
    log_test "All man pages show v0.13.1"
    local issues=0
    for man in man/man1/atlas.1 man/man1/session.1 man/man1/project.1 man/man1/status.1; do
        if ! grep -q "0\.13\.1" "$man"; then
            echo "  $man: missing 0.13.1 version"
            issues=1
        fi
    done

    if [[ $issues -eq 0 ]]; then
        log_pass "All man pages show v0.13.1"
    else
        log_fail "Some man pages have wrong version"
        return 1
    fi
}

# Test 9: Cheatsheet has correct version badge
test_cheatsheet_version() {
    log_test "Cheatsheet shows v0.13.1"
    if grep -q "v0.13.1" docs/CHEATSHEET.md && grep -q "v0.13.1" docs/REFCARD.md; then
        log_pass "Cheatsheet and Refcard show v0.13.1"
    else
        log_fail "Cheatsheet or Refcard has wrong version"
        return 1
    fi
}

# Test 10: All internal links in moved files are correct
test_internal_links() {
    log_test "Internal links in moved files are correct"
    local issues=0

    # COOKBOOK.md links
    if grep -q "tutorials/research-registry.md" docs/user-guide/cookbook/COOKBOOK.md; then
        if ! grep -q "../tutorials/research-registry.md" docs/user-guide/cookbook/COOKBOOK.md; then
            echo "  COOKBOOK.md: link to research-registry.md may be wrong"
            issues=1
        fi
    fi

    # Check visual-features.md links
    if grep -q "\.\./\.\./VISUAL-GUIDE.md" docs/user-guide/tutorials/visual-features.md; then
        log_pass "visual-features.md links are correct"
    else
        echo "  visual-features.md: VISUAL-GUIDE.md link may be wrong"
        issues=1
    fi

    if [[ $issues -eq 0 ]]; then
        log_pass "Internal links appear correct"
    else
        log_fail "Some internal links may be broken"
        return 1
    fi
}

# Test 11: CSS custom properties are defined
test_css_custom_properties() {
    log_test "CSS custom properties defined"
    if grep -q "\-\-atlas-" docs/stylesheets/extra.css && grep -q "\-\-atlas-focus-ring" docs/stylesheets/extra.css; then
        log_pass "Custom CSS properties present"
    else
        log_fail "Missing custom CSS properties"
        return 1
    fi
}

# Test 12: Navigation features enabled in mkdocs.yml
test_nav_features() {
    log_test "Navigation features enabled (path, toc.follow)"
    if grep -q "navigation.path" mkdocs.yml && grep -q "toc.follow" mkdocs.yml; then
        log_pass "Navigation features enabled"
    else
        log_fail "Missing navigation features"
        return 1
    fi
}

# Test 13: Exclude internal docs from build
test_exclude_internal() {
    log_test "Internal docs excluded from build"
    if grep -q "exclude_docs:" mkdocs.yml; then
        log_pass "exclude_docs configured"
    else
        log_fail "exclude_docs not configured"
        return 1
    fi
}

# Test 14: Foldable sidebar chevron CSS exists
test_foldable_css() {
    log_test "Foldable sidebar chevron CSS exists"
    if grep -q "md-nav__item--nested.*::before" docs/stylesheets/extra.css && grep -q "transform: rotate" docs/stylesheets/extra.css; then
        log_pass "Foldable CSS present"
    else
        log_fail "Missing foldable sidebar CSS"
        return 1
    fi
}

# Test 15: Section headers styled distinctly
test_section_headers_styled() {
    log_test "Section headers styled distinctly from page links"
    if grep -q "md-nav__item--nested > .md-nav__link" docs/stylesheets/extra.css; then
        log_pass "Section header styling present"
    else
        log_fail "Missing section header styling"
        return 1
    fi
}

# Main runner
main() {
    echo "========================================"
    echo "Documentation Dogfooding Tests"
    echo "========================================"
    echo ""

    test_nav_entries_exist || true
    test_cookbook_recipes || true
    test_cookbook_structure || true
    test_workflow_guides || true
    test_tutorials_exist || true
    test_version_consistency || true
    test_shell_completions_docs || true
    test_man_pages_version || true
    test_cheatsheet_version || true
    test_internal_links || true
    test_css_custom_properties || true
    test_nav_features || true
    test_exclude_internal || true
    test_foldable_css || true
    test_section_headers_styled || true

    echo ""
    echo "========================================"
    echo "Test Summary"
    echo "========================================"
    echo "Tests run:    $TESTS_RUN"
    echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
    echo ""

    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed${NC}"
        exit 1
    fi
}

main