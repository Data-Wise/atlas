#!/usr/bin/env bash
#
# Interactive Dogfood Test — Atlas Ink Dashboard (Real Data)
#
# A guided walkthrough that launches the dashboard and prompts you to verify
# each feature manually. Run this in a real terminal (not piped).
#
# Usage:
#   bash test/dogfood/dashboard-ink/interactive.sh
#

set -euo pipefail

# Colors
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# Counters
PASS=0
FAIL=0
SKIP=0

# ─── Helpers ────────────────────────────────────────────────────────────────────

banner() {
  echo ""
  echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  Atlas Ink Dashboard — Interactive Dogfood Test${NC}"
  echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${DIM}This script launches the dashboard repeatedly so you can"
  echo -e "  visually verify each feature. Press ${NC}${BOLD}q${NC}${DIM} in the dashboard to"
  echo -e "  return here after each check.${NC}"
  echo ""
}

section() {
  echo ""
  echo -e "${CYAN}──────────────────────────────────────────────────${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}──────────────────────────────────────────────────${NC}"
  echo ""
}

prompt_check() {
  local description="$1"
  local detail="${2:-}"

  echo -e "  ${YELLOW}CHECK:${NC} $description"
  if [ -n "$detail" ]; then
    echo -e "  ${DIM}$detail${NC}"
  fi
  echo ""

  while true; do
    echo -ne "  ${BOLD}Result?${NC} [${GREEN}p${NC}]ass / [${RED}f${NC}]ail / [${DIM}s${NC}]kip: "
    read -r -n 1 result
    echo ""
    case "$result" in
      p|P) PASS=$((PASS + 1)); echo -e "  ${GREEN}✓ Pass${NC}"; return 0 ;;
      f|F) FAIL=$((FAIL + 1)); echo -ne "  ${RED}✗ Fail${NC} — note (optional): "; read -r note; return 0 ;;
      s|S) SKIP=$((SKIP + 1)); echo -e "  ${DIM}⊘ Skipped${NC}"; return 0 ;;
      *) echo -e "  ${DIM}(press p, f, or s)${NC}" ;;
    esac
  done
}

launch_dashboard() {
  local hint="${1:-}"
  echo ""
  if [ -n "$hint" ]; then
    echo -e "  ${BOLD}Launching dashboard...${NC} ${DIM}($hint)${NC}"
  else
    echo -e "  ${BOLD}Launching dashboard...${NC}"
  fi
  echo -e "  ${DIM}Press q to quit and return here.${NC}"
  echo ""

  # Run in foreground so the user interacts with it directly
  npx tsx src/cli/dashboard-ink/index.tsx 2>/dev/null || true
  echo ""
}

# ─── Pre-flight ─────────────────────────────────────────────────────────────────

preflight() {
  section "Pre-flight Checks"

  # Check TTY
  if [ ! -t 0 ]; then
    echo -e "  ${RED}ERROR:${NC} This script must be run in an interactive terminal."
    echo -e "  ${DIM}(stdin is not a TTY — don't pipe into this script)${NC}"
    exit 1
  fi

  # Check ~/.atlas
  if [ ! -d "$HOME/.atlas" ]; then
    echo -e "  ${RED}ERROR:${NC} ~/.atlas directory not found."
    echo -e "  ${DIM}Run 'atlas init' first to set up real data.${NC}"
    exit 1
  fi

  # Check node_modules
  if [ ! -d "node_modules/ink" ]; then
    echo -e "  ${RED}ERROR:${NC} node_modules/ink not found. Run 'npm install' first."
    exit 1
  fi

  echo -e "  ${GREEN}✓${NC} Interactive terminal"
  echo -e "  ${GREEN}✓${NC} ~/.atlas exists"
  echo -e "  ${GREEN}✓${NC} Dependencies installed"
  echo ""

  echo -e "  ${DIM}Ready. The dashboard will launch several times."
  echo -e "  After each launch, you'll grade what you saw.${NC}"
  echo ""
  echo -ne "  ${BOLD}Press Enter to begin...${NC} "
  read -r
}

# ─── Test Sections ──────────────────────────────────────────────────────────────

test_1_startup_and_projects() {
  section "1/7 — Startup & Real Project Data"

  echo -e "  ${DIM}Verify the dashboard starts and shows YOUR real projects"
  echo -e "  from ~/.atlas (not mock data like 'atlas-core' or 'web-app').${NC}"
  echo ""

  launch_dashboard "Look at the project list"

  prompt_check "Dashboard launched without errors"
  prompt_check "Project list shows YOUR real projects (names you recognize)" \
    "Should NOT show mock names like 'atlas-core', 'web-app', 'mobile-ui'"
  prompt_check "Project count in header matches your actual project count"
  prompt_check "Status icons (●/◐/◆/✓/○/✗) appear next to projects"
}

test_2_navigation_and_keybinds() {
  section "2/7 — Keyboard Navigation"

  echo -e "  ${DIM}Test all navigation keys. Try each one during the session:${NC}"
  echo ""
  echo -e "  ${BOLD}j/↓${NC}  Move down         ${BOLD}k/↑${NC}  Move up"
  echo -e "  ${BOLD}Enter${NC} Detail view        ${BOLD}Esc${NC}  Back"
  echo -e "  ${BOLD}f${NC}     Focus mode         ${BOLD}z${NC}    Zen mode"
  echo -e "  ${BOLD}T${NC}     Timeline           ${BOLD}e${NC}    Ecosystem"
  echo -e "  ${BOLD}p${NC}     Plan view          ${BOLD}q${NC}    Quit"
  echo ""

  launch_dashboard "Try all the keys above"

  prompt_check "j/k (or arrows) navigate the project list"
  prompt_check "Enter opens Detail view for the selected project"
  prompt_check "Esc returns to Browse view from Detail"
  prompt_check "f opens Focus view, z opens Zen view"
  prompt_check "T opens Timeline, e opens Ecosystem, p opens Plan"
}

test_3_layout_modes() {
  section "3/7 — Layout Modes (Tab Key)"

  echo -e "  ${DIM}Press Tab to cycle through layout modes:${NC}"
  echo ""
  echo -e "  ${BOLD}SINGLE${NC}  → just the main panel"
  echo -e "  ${BOLD}SPLIT${NC}   → sidebar + main panel"
  echo -e "  ${BOLD}TRIPLE${NC}  → sidebar + main + inspector"
  echo ""
  echo -e "  ${DIM}Press Shift+Tab to cycle panel focus (border highlight).${NC}"
  echo ""

  launch_dashboard "Press Tab several times, then Shift+Tab"

  prompt_check "Tab cycles through SINGLE → SPLIT → TRIPLE layouts"
  prompt_check "Layout status bar at bottom shows current mode"
  prompt_check "Shift+Tab moves the active panel highlight"
}

test_4_sidebar_real_data() {
  section "4/7 — Sidebar Panel (Real Data)"

  echo -e "  ${DIM}Switch to SPLIT or TRIPLE layout (Tab), then inspect the sidebar.${NC}"
  echo ""

  launch_dashboard "Tab to TRIPLE mode, look at the sidebar"

  prompt_check "Sidebar shows real project names with status icons"
  prompt_check "Selecting a project in sidebar updates the main/inspector panels"
  prompt_check "Active session badge (if any) highlights the active project" \
    "Only visible if you have a running 'atlas session start' somewhere"
  prompt_check "Pending captures badge shows inbox count (may be 0)" \
    "The number at the top of the sidebar — reflects unprocessed captures"
}

test_5_inspector_panel() {
  section "5/7 — Inspector Panel (Stats & Heatmap)"

  echo -e "  ${DIM}In TRIPLE layout, check the right-side inspector panel.${NC}"
  echo ""

  launch_dashboard "Tab to TRIPLE, select a project with sessions"

  prompt_check "Inspector shows project details for the selected project"
  prompt_check "Heatmap grid renders (dots/blocks pattern, not blank)" \
    "Should show activity pattern using ·░▒▓█ characters"
  prompt_check "Streak days count appears (may be 0 if no recent sessions)"
  prompt_check "Total sessions count appears"
  prompt_check "Breadcrumbs trail shows recent context entries (or empty)"
}

test_6_active_session() {
  section "6/7 — Active Session Detection"

  echo -e "  ${DIM}This test checks if the dashboard detects a running session."
  echo -e "  If you have NO active session, skip the session-specific checks.${NC}"
  echo ""

  # Check if there's an active session
  local has_session="unknown"
  if command -v atlas &>/dev/null; then
    if atlas session status 2>/dev/null | grep -qi "active\|running\|in progress"; then
      has_session="yes"
      echo -e "  ${GREEN}✓${NC} Active session detected via 'atlas session status'"
    else
      has_session="no"
      echo -e "  ${DIM}No active session detected. Some checks may be skipped.${NC}"
    fi
  else
    echo -e "  ${DIM}Cannot detect — 'atlas' command not found. Check manually.${NC}"
  fi
  echo ""

  launch_dashboard "Tab to TRIPLE, check session timer in inspector"

  prompt_check "Session timer ticks up if a session is active" \
    "Inspector panel should show elapsed time counting up every second"

  if [ "$has_session" = "no" ]; then
    echo -e "  ${DIM}(No active session — timer should show 0:00 or be absent)${NC}"
  fi

  prompt_check "Active project is highlighted in sidebar (if session exists)" \
    "The project with the running session should have a distinct marker"
}

test_7_visual_quality() {
  section "7/7 — Visual Quality & Theme"

  echo -e "  ${DIM}Final check — overall look and feel.${NC}"
  echo ""

  launch_dashboard "Take a final look at the overall dashboard"

  prompt_check "No rendering glitches (overlapping text, broken borders)"
  prompt_check "Colors render correctly (not raw ANSI codes visible)"
  prompt_check "Text is readable and properly truncated (no overflow)"
  prompt_check "Command bar at bottom shows available keys"
}

# ─── Summary ────────────────────────────────────────────────────────────────────

summary() {
  local total=$((PASS + FAIL + SKIP))

  echo ""
  echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  Results${NC}"
  echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${GREEN}Passed:${NC}  $PASS"
  echo -e "  ${RED}Failed:${NC}  $FAIL"
  echo -e "  ${DIM}Skipped:${NC} $SKIP"
  echo -e "  ${BOLD}Total:${NC}   $total"
  echo ""

  if [ "$FAIL" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}All checks passed!${NC}"
  else
    echo -e "  ${RED}${BOLD}$FAIL check(s) failed — review above for notes.${NC}"
  fi
  echo ""
}

# ─── Main ───────────────────────────────────────────────────────────────────────

main() {
  # Change to project root
  cd "$(dirname "$0")/../../.."

  banner
  preflight

  test_1_startup_and_projects
  test_2_navigation_and_keybinds
  test_3_layout_modes
  test_4_sidebar_real_data
  test_5_inspector_panel
  test_6_active_session
  test_7_visual_quality

  summary
}

main
