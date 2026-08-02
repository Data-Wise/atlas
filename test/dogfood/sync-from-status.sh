#!/usr/bin/env bash
#
# Dogfood — atlas sync --from-status (isolated HOME)
#
# Runs the real atlas CLI end-to-end against temporary .STATUS files,
# including the frontmatter non-numeric `priority` regression that used to
# crash summarize() ("Cannot read properties of undefined (reading 'push')").
#
# Unlike dogfood-comprehensive.sh this script never touches the real ~/.atlas:
# every invocation gets an isolated HOME + ATLAS_CONFIG.
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ATLAS="node $PROJECT_DIR/bin/atlas.js"

WORK_ROOT=""
HOME_DIR=""

log_test() {
  TESTS_RUN=$((TESTS_RUN + 1))
  printf "${YELLOW}[TEST]${NC} %s\n" "$1"
}

log_pass() {
  TESTS_PASSED=$((TESTS_PASSED + 1))
  printf "${GREEN}[PASS]${NC} %s\n" "$1"
}

log_fail() {
  TESTS_FAILED=$((TESTS_FAILED + 1))
  printf "${RED}[FAIL]${NC} %s\n" "$1"
}

setup() {
  WORK_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/atlas-dogfood-fsscan-XXXXXX")
  HOME_DIR=$(mktemp -d "${TMPDIR:-/tmp}/atlas-dogfood-fshome-XXXXXX")
}

cleanup() {
  if [ -n "$WORK_ROOT" ] && [ -d "$WORK_ROOT" ]; then
    rm -rf "$WORK_ROOT"
  fi
  if [ -n "$HOME_DIR" ] && [ -d "$HOME_DIR" ]; then
    rm -rf "$HOME_DIR"
  fi
}

# Run atlas with the isolated HOME/ATLAS_CONFIG. Always exits 0 (caller must
# inspect $?) so `set -e` cannot abort the suite on an expected failure.
run_atlas() {
  HOME="$HOME_DIR" ATLAS_CONFIG="$HOME_DIR/.atlas" $ATLAS "$@" 2>&1
}

check_contains() {
  local haystack="$1" needle="$2" label="$3"
  case "$haystack" in
    *"$needle"*) return 0 ;;
    *) log_fail "$label: expected output to contain '$needle'"; return 1 ;;
  esac
}

check_not_contains() {
  local haystack="$1" needle="$2" label="$3"
  case "$haystack" in
    *"$needle"*) log_fail "$label: expected output NOT to contain '$needle'"; return 1 ;;
    *) return 0 ;;
  esac
}

write_frontmatter_status() {
  local dir="$1" name="$2" priority="$3"
  mkdir -p "$dir"
  cat > "$dir/.STATUS" <<EOF
---
schema: atlas/v1
name: $name
status: active
progress: 40
priority: $priority
---

# $name
EOF
}

write_markdown_status() {
  local dir="$1" name="$2" priority="$3"
  mkdir -p "$dir"
  cat > "$dir/.STATUS" <<EOF
## Project: $name
## Type: node-package
## Status: active
## Priority: $priority
## Progress: 30
EOF
}

test_frontmatter_p1_does_not_crash() {
  log_test "sync --from-status with frontmatter priority P1 does not crash"
  local out exit_code
  write_frontmatter_status "$WORK_ROOT/proj-p1" "proj-p1" "P1"
  out=$(run_atlas sync --from-status --paths "$WORK_ROOT") && exit_code=0 || exit_code=$?
  if [ $exit_code -ne 0 ]; then
    log_fail "sync --from-status exited $exit_code"
    printf '%s\n' "$out"
    return 1
  fi
  check_contains "$out" "Found 1 projects" "sync summary" || return 1
  check_contains "$out" "proj-p1" "project listing" || return 1
  check_not_contains "$out" "undefined" "no undefined leakage" || return 1
  check_not_contains "$out" "NaN" "no NaN leakage" || return 1
  log_pass "frontmatter priority P1 syncs cleanly"
}

test_persists_registry_file() {
  log_test "sync --from-status persists a project registry entry"
  local registry="$HOME_DIR/.atlas/projects.json"
  if [ ! -f "$registry" ]; then
    log_fail "registry file not written at .atlas/projects.json"
    return 1
  fi
  check_contains "$(cat "$registry")" '"name": "proj-p1"' "registry entry" || return 1
  log_pass "registry entry exists"
}

test_mixed_formats() {
  log_test "sync --from-status with mixed frontmatter + markdown formats"
  local out exit_code
  write_markdown_status "$WORK_ROOT/proj-md" "proj-md" "2"
  out=$(run_atlas sync --from-status --paths "$WORK_ROOT") && exit_code=0 || exit_code=$?
  if [ $exit_code -ne 0 ]; then
    log_fail "sync --from-status exited $exit_code"
    printf '%s\n' "$out"
    return 1
  fi
  check_contains "$out" "Found 2 projects" "sync summary" || return 1
  check_contains "$out" "proj-md" "markdown project listing" || return 1
  check_contains "$out" "Created: 1 projects" "created count" || return 1
  log_pass "mixed formats sync together"
}

test_report_mode() {
  log_test "sync --from-status --report (no registry write) handles non-numeric priority"
  local out exit_code
  out=$(run_atlas sync --from-status --report --paths "$WORK_ROOT") && exit_code=0 || exit_code=$?
  if [ $exit_code -ne 0 ]; then
    log_fail "sync --report exited $exit_code"
    printf '%s\n' "$out"
    return 1
  fi
  check_contains "$out" "Found 2 projects" "report summary" || return 1
  check_not_contains "$out" "undefined" "no undefined leakage" || return 1
  log_pass "--report mode is clean"
}

test_empty_scan_root() {
  log_test "sync --from-status on an empty scan root"
  local out exit_code
  out=$(run_atlas sync --from-status --paths "$HOME_DIR") && exit_code=0 || exit_code=$?
  if [ $exit_code -ne 0 ]; then
    log_fail "sync on empty root exited $exit_code"
    printf '%s\n' "$out"
    return 1
  fi
  check_contains "$out" "Found 0 projects" "empty summary" || return 1
  log_pass "empty scan root reports zero projects"
}

main() {
  printf "━━━ sync --from-status dogfood ━━━\n"
  setup
  trap cleanup EXIT
  test_frontmatter_p1_does_not_crash || true
  test_persists_registry_file || true
  test_mixed_formats || true
  test_report_mode || true
  test_empty_scan_root || true
  printf "═══════════════════════════\n"
  printf "  RESULTS\n"
  printf "═══════════════════════════\n"
  printf "  Tests run:   %d\n" "$TESTS_RUN"
  printf "  Passed:      %d\n" "$TESTS_PASSED"
  printf "  Failed:      %d\n" "$TESTS_FAILED"
  if [ $TESTS_FAILED -eq 0 ]; then
    printf "\n✅ ALL TESTS PASSED\n"
    exit 0
  fi
  printf "\n❌ SOME TESTS FAILED\n"
  exit 1
}

main
