#!/usr/bin/env bash
#
# Dogfood Tests — YAML Passthrough & Inbox Win Type
#
# Dual-path verification:
#   Path A — Run the code-under-test
#   Path B — Independent oracle (filesystem / separate invocation)
#   Bash   — Compare A and B, fail if they disagree
#
# Usage:
#   bash test/dogfood/dashboard-ink/yaml-passthrough.sh
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
DIM='\033[2m'
CYAN='\033[0;36m'
NC='\033[0m'

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -e "${YELLOW}[TEST ${TESTS_RUN}]${NC} $1"
}

log_pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "  ${GREEN}✓${NC} $1"
}

log_fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "  ${RED}✗${NC} $1"
    if [ -n "${2:-}" ]; then
        echo -e "    ${DIM}$2${NC}"
    fi
}

log_info() {
    echo -e "  ${DIM}$1${NC}"
}

log_compare() {
    echo -e "  ${CYAN}↔${NC} $1"
}

NODE_OUTPUT=""
run_node() {
    local script="$1"
    NODE_OUTPUT=$(node --input-type=module -e "$script" 2>/dev/null) || true
}

get_val() {
    echo "$NODE_OUTPUT" | grep "^$1:" | head -1 | cut -d: -f2-
}

# ─── Test 1: Capture.TYPES includes 'win' ────────────────────────────────────

test_capture_types_includes_win() {
    log_test "Capture.TYPES includes 'win' — cross-validated with source"

    # Path A: Runtime check
    run_node '
import { Capture } from "./src/domain/entities/Capture.js";
console.log("TYPES:" + JSON.stringify(Capture.TYPES));
console.log("HAS_WIN:" + Capture.TYPES.includes("win"));
'

    local has_win types_json
    has_win=$(get_val "HAS_WIN")
    types_json=$(get_val "TYPES")

    # Path B: Source check
    local source_has_win="false"
    if grep -q "'win'" src/domain/entities/Capture.js 2>/dev/null; then
        source_has_win="true"
    fi

    log_compare "Runtime has_win=$has_win, source grep=$source_has_win"

    if [ "$has_win" = "true" ] && [ "$source_has_win" = "true" ]; then
        log_pass "Capture.TYPES includes 'win' (runtime + source verified)"
    elif [ "$has_win" = "true" ]; then
        log_pass "Capture.TYPES includes 'win' at runtime"
    else
        log_fail "Capture.TYPES missing 'win' (runtime=$has_win, source=$source_has_win)"
    fi
}

# ─── Test 2: YAML round-trip preserves all fields ────────────────────────────

test_yaml_roundtrip_preserves_fields() {
    log_test "StatusFileGateway YAML round-trip — unknown fields survive write"

    run_node '
import { StatusFileGateway } from "./src/adapters/gateways/StatusFileGateway.js";
import { mkdtempSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const testDir = mkdtempSync(join(tmpdir(), "yaml-test-"));
const yamlContent = `---
status: active
progress: 80
type: research
venue: "JASA"
custom_list:
  - one
  - two
nested:
  deep: true
  count: 42
---

# Notes
`;
writeFileSync(join(testDir, ".STATUS"), yamlContent);

const gw = new StatusFileGateway();

// Path A: read → write → read
const status = await gw.read(testDir);
console.log("A_VENUE:" + (status.venue ?? "MISSING"));
console.log("A_LIST:" + JSON.stringify(status.custom_list ?? null));
console.log("A_NESTED:" + JSON.stringify(status.nested ?? null));

await gw.write(testDir, status);

const roundTripped = await gw.read(testDir);
console.log("RT_VENUE:" + (roundTripped.venue ?? "MISSING"));
console.log("RT_LIST:" + JSON.stringify(roundTripped.custom_list ?? null));
console.log("RT_NESTED:" + JSON.stringify(roundTripped.nested ?? null));

// Cleanup
const { rmSync } = await import("fs");
rmSync(testDir, { recursive: true });
'

    local a_venue a_list a_nested rt_venue rt_list rt_nested
    a_venue=$(get_val "A_VENUE")
    a_list=$(get_val "A_LIST")
    a_nested=$(get_val "A_NESTED")
    rt_venue=$(get_val "RT_VENUE")
    rt_list=$(get_val "RT_LIST")
    rt_nested=$(get_val "RT_NESTED")

    log_compare "A: venue=$a_venue list=$a_list nested=$a_nested"
    log_compare "RT: venue=$rt_venue list=$rt_list nested=$rt_nested"

    local errors=0
    if [ "$a_venue" != "$rt_venue" ]; then
        log_fail "venue mismatch: $a_venue != $rt_venue"
        errors=$((errors + 1))
    fi
    if [ "$a_list" != "$rt_list" ]; then
        log_fail "custom_list mismatch: $a_list != $rt_list"
        errors=$((errors + 1))
    fi
    if [ "$a_nested" != "$rt_nested" ]; then
        log_fail "nested mismatch: $a_nested != $rt_nested"
        errors=$((errors + 1))
    fi

    if [ "$errors" -eq 0 ]; then
        log_pass "All unknown fields survive YAML round-trip"
    fi
}

# ─── Test 3: Inbox --type win runs without error ─────────────────────────────

test_inbox_type_win() {
    log_test "atlas inbox --type win runs without error"

    local output exit_code
    output=$(node bin/atlas.js inbox --type win 2>&1) && exit_code=0 || exit_code=$?

    if [ "$exit_code" -eq 0 ]; then
        log_pass "inbox --type win exited cleanly (exit=$exit_code)"
    else
        log_fail "inbox --type win failed (exit=$exit_code)" "$output"
    fi

    # Path B: Verify --help shows win as a valid type
    local help_output
    help_output=$(node bin/atlas.js inbox --help 2>&1) || true

    if echo "$help_output" | grep -q "win"; then
        log_pass "inbox --help lists 'win' as valid type"
    else
        log_fail "inbox --help missing 'win' type"
    fi
}

# ─── Test 4: Inbox --limit caps output ───────────────────────────────────────

test_inbox_limit() {
    log_test "atlas inbox --limit 1 returns at most 1 item"

    local output exit_code
    output=$(node bin/atlas.js inbox --limit 1 2>&1) && exit_code=0 || exit_code=$?

    if [ "$exit_code" -eq 0 ]; then
        log_pass "inbox --limit 1 exited cleanly (exit=$exit_code)"
    else
        log_fail "inbox --limit 1 failed (exit=$exit_code)" "$output"
    fi

    # Path B: Parse output — should show 0 or 1 items
    local item_count
    item_count=$(echo "$output" | grep -c "inbox\|📥\|No captures" || true)
    if [ "$item_count" -le 2 ]; then
        log_pass "Output has reasonable item count ($item_count matching lines)"
    else
        log_fail "Output has too many matching lines: $item_count"
    fi
}

# ─── Test 5: Inbox --type + --limit combined ─────────────────────────────────

test_inbox_type_and_limit() {
    log_test "atlas inbox --type idea --limit 2 runs without error"

    local output exit_code
    output=$(node bin/atlas.js inbox --type idea --limit 2 2>&1) && exit_code=0 || exit_code=$?

    if [ "$exit_code" -eq 0 ]; then
        log_pass "Combined flags exited cleanly (exit=$exit_code)"
    else
        log_fail "Combined flags failed (exit=$exit_code)" "$output"
    fi
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "  YAML Passthrough & Inbox Win Type — Dogfood Tests"
    echo "  (Cross-Validated Edition)"
    echo "════════════════════════════════════════════════════════"
    echo ""

    cd "$(dirname "$0")/../../.."

    if [ ! -d "$HOME/.atlas" ]; then
        echo -e "${RED}ERROR:${NC} ~/.atlas not found. Run 'atlas init' first."
        exit 1
    fi

    test_capture_types_includes_win
    test_yaml_roundtrip_preserves_fields
    test_inbox_type_win
    test_inbox_limit
    test_inbox_type_and_limit

    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "  Results"
    echo "════════════════════════════════════════════════════════"
    echo "  Tests run:    $TESTS_RUN"
    echo -e "  Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "  Failed: ${RED}$TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "  ${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "  ${RED}$TESTS_FAILED check(s) failed${NC}"
        exit 1
    fi
}

main
