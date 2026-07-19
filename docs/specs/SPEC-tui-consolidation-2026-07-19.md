# SPEC: TUI Consolidation — delete dead dashboards, 3-view Ink

**Date:** 2026-07-19 · **Status:** approved (grilled 2026-07-19) · **Release:** v0.14.0 (deletion), v0.14.x/v0.15.0 (3-view consolidation)

## Problem (from audit)

The TUI layer is ~10,250 LOC; **~5,890 LOC (58%) is unreachable dead code** — `src/cli/dashboard-blessed.js` (2,765) and `src/cli/dashboard/` (3,125) have zero references from `bin/` or live `src/`, plus 6 test files under `test/unit/cli/dashboard/` still exercising them. The live Ink dashboard duplicates itself: 3 Pomodoro timer implementations (FocusView, ZenView, InspectorPanel), the project list rendered 3×, DetailView≈InspectorPanel, EcosystemView≈AnalyticsView, ~15 keybindings with per-view letter reuse and no central keymap.

## Goals

- **Zero dead code** in the TUI layer; test suite only exercises shipped paths.
- **3 views instead of 8** — fewer concepts to hold, one timer, one project list component, a central keymap. ADHD-cost removed: view-navigation decisions and duplicated information competing for attention.

## Target design

| View | Absorbs | Content |
|---|---|---|
| **Now** (default) | Main + Detail + Inspector + Ecosystem | Left: project list (single shared component). Right: selected project detail + focus/next + heatmap strip. `e` toggles ecosystem-wide vs single-project stats in the right pane. |
| **Timer** | Focus + Zen + Inspector timer | ONE timer component with a chrome toggle (`z` = zen density). |
| **Plan** | Plan + Analytics | Morning ritual; `a` toggles the analytics pane inside it. |

Central keymap in one module (`lib/keymap.ts`): global keys only (`1/2/3` or `n/t/p` view switch, `Tab` layout, `q` quit, `?` help overlay). Per-view keys documented in the same map — no per-view rebinding of the same letter to different meanings.

## Deliverables

1. **Deletion PR (quick win, independent):** remove `src/cli/dashboard-blessed.js`, `src/cli/dashboard/`, `test/unit/cli/dashboard/` (6 files); prune blessed from dependencies if nothing else imports it.
2. **Consolidation PR(s):** shared `ProjectList`, single `PomodoroTimer`, the 3 views above; state machine shrinks 8→3 states; `lib/keymap.ts`; `?` help overlay.
3. Docs: VISUAL-GUIDE, CLI-REFERENCE dashboard section, REFCARD keybindings table.

## Verification

- **Deletion:** full suite green after removal (proves nothing shipped imported the dead code); `grep -r "dashboard-blessed\|cli/dashboard/" src/ bin/` returns nothing; bundle/install size delta reported in PR body.
- **Consolidation:** existing ink-testing-library suites migrated, not deleted — coverage of the merged behaviors (timer controls, list nav, layout cycling) must not drop below current; new test: every key in keymap.ts is unique per scope (mechanical duplicate-binding guard).
- **E2E transcript (required in PR body):** scripted dashboard run against a fixture `ATLAS_DATA_DIR` walking all 3 views and the timer; screenshot/text capture quoted. Planted defect: a deliberately duplicated keybinding must fail the keymap test.
- **Acceptance criteria:** state machine has exactly 3 states; exactly 1 timer implementation (`grep -c` for timer logic); TUI layer LOC reduced ≥55% from the 10,250 baseline.

## Non-goals

- No retirement of the TUI (explicitly considered and rejected in grill).
- No new views, themes, or data sources; hooks layer (useProjects etc.) unchanged.
- No blessed→Ink feature archaeology: dead-code features not present in Ink are simply gone.

## Migration / compat

- None user-facing: `atlas dash` keeps working; only internal navigation changes. Keybinding changes flagged in CHANGELOG with a before/after table.

## Release mapping

- **v0.14.0:** deletion PR (ship early, zero risk).
- **v0.14.x–v0.15.0:** 3-view consolidation, split into shared-components PR then views PR.

## Execution (drivable by /craft:orch:drive or agent fleet)

**Worktree:** `~/.git-worktrees/atlas/feature-tui-dead-code-removal` · **Branch:** `feature/tui-dead-code-removal` (base `dev`) · **PR title:** `refactor(tui): remove unreachable blessed dashboards (~5.9k LOC)`

| # | Task | Acceptance |
|---|---|---|
| 1 | Delete `src/cli/dashboard-blessed.js`, `src/cli/dashboard/`, `test/unit/cli/dashboard/` | paths gone; `grep -r "dashboard-blessed\|cli/dashboard/" src/ bin/ test/` → 0 hits |
| 2 | Remove `blessed` (+ blessed-only deps) from package.json if nothing else imports them | `grep -r "require('blessed')\|from 'blessed'" src/ bin/` → 0; `npm install` clean |
| 3 | Full suite | `npm test` green, count reported |
| 4 | CHANGELOG entry + CLAUDE.md architecture tree updated | files mention removal |

**Verify gate:** `npm test && npx jest --listTests | grep -c dashboard` (only dashboard-ink tests remain). Phase-2 consolidation (3 views) executes as a separate follow-up branch `feature/tui-three-views` after this merges.
