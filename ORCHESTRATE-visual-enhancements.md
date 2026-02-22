# ORCHESTRATE: v0.9.1 Visual Enhancements

> Feature: Sidebar sparklines, focus score, activity heatmap, theme system
> Branch: feature/visual-enhancements
> Spec: docs/specs/SPEC-visual-enhancements-2026-02-22.md
> Worktree: ~/.git-worktrees/atlas/feature-visual-enhancements

## Increment Plan

4 increments, each independently testable and committable.

---

### Increment 1: Theme System (Infrastructure)

**Goal:** React Context theme provider with 5 built-in themes. Zero visual change on first pass — default theme matches current hardcoded colors.

**Files to create:**
- `src/cli/dashboard-ink/lib/ThemeContext.tsx` — Theme interface, 5 theme objects, ThemeProvider, useTheme hook

**Files to modify:**
- `src/cli/dashboard-ink/components/App.tsx` — Wrap root in `<ThemeProvider>`
- `src/cli/dashboard-ink/constants.ts` — Keep STATUS_ICON, deprecate STATUS_COLOR (components will use theme.status instead)
- `src/cli/dashboard-ink/components/SidebarPanel.tsx` — Replace hardcoded colors with `useTheme()`
- `src/cli/dashboard-ink/components/InspectorPanel.tsx` — Replace hardcoded colors with `useTheme()`
- `src/cli/dashboard-ink/components/views/MainView.tsx` — Replace hardcoded colors
- `src/cli/dashboard-ink/components/views/EcosystemView.tsx` — Replace hardcoded colors
- `src/cli/dashboard-ink/lib/LayoutManager.tsx` — Border colors from theme

**Tests to create:**
- `test/unit/cli/dashboard-ink/ThemeContext.test.tsx` — Theme provider renders, useTheme returns correct theme, all 5 themes have required keys

**Theme interface (from spec):**
```typescript
interface Theme {
  name: string;
  panel: { borderActive, borderInactive, headerActive, headerInactive };
  status: Record<string, string>;
  text: { primary, secondary, muted, accent };
  chart: { sparkline, sparklineUp, sparklineDown, heatmap: string[5], progressFilled, progressEmpty };
  focus: { timer, paused, break };
  focusTiers: string[5];
}
```

**5 themes:** default, nord, solarized, mono, high-contrast

**Config integration:** Read `preferences.theme` from `~/.atlas/config.json`. Default to 'default'.

**Commit:** `feat(dashboard): add theme system with 5 built-in themes`

**Verify:** All existing tests pass. Dashboard renders identically with default theme.

---

### Increment 2: Focus Score (Domain Logic)

**Goal:** Calculate weighted focus score (0-100) with tier classification. Wire into stats output.

**Files to modify:**
- `src/domain/constants/BusinessRules.js` — Add FOCUS_SCORE_* constants (weights, thresholds)
- `src/use-cases/session/GetSessionStats.js` — Add `calculateFocusScore(summary, streak)` method, include in return object

**Files to create:**
- `src/adapters/presenters/FocusScorePresenter.js` — `formatFocusScore(score)`, `focusTierIcon(score)`, `focusTierColor(score)`, `focusTierLabel(score)`

**Files to modify (display):**
- `src/adapters/presenters/StatsPresenter.js` — Include focus score in `formatStatsTable()` and `formatStatsMarkdown()`
- `src/cli/dashboard-ink/types.ts` — Add `focusScore?: number` and `focusTier?: { symbol, color, label }` to Project

**Tests to create:**
- `test/unit/use-cases/session/FocusScore.test.js` — Test calculation with various inputs:
  - All zeros → score 0, tier "drift"
  - Perfect scores → score ~100, tier "deep"
  - Mixed → appropriate tier
  - Edge cases: no sessions, single session, all incomplete

**Formula (from spec):**
```
score = duration(0.30) + flow(0.30) + completion(0.25) + consistency(0.15)
```

**Tiers:**
| 0-19 | ○ dim | drift |
| 20-39 | ◔ yellow | warming |
| 40-59 | ◑ cyan | steady |
| 60-79 | ◕ green | strong |
| 80-100 | ● bright green | deep |

**Commit:** `feat(domain): add focus score calculation with tier classification`

**Verify:** New tests pass. `atlas stats` shows focus score. Existing tests unchanged.

---

### Increment 3: Sidebar Sparklines + Focus Tier Icon

**Goal:** Replace sidebar status icon with focus tier symbol. Add 5-char sparkline per project row.

**Files to modify:**
- `src/adapters/presenters/StatsPresenter.js` — Add `projectSparklineData(sessions, projectName, days = 5)` function
- `src/cli/dashboard-ink/types.ts` — Add `recentActivity?: number[]` to Project interface
- `src/cli/dashboard-ink/components/SidebarPanel.tsx`:
  - New `InlineSparkline` component (5-char, trend-colored)
  - Replace `statusIcon()` with `focusTierIcon()` in Row
  - Layout: `│ ◕ name(14ch)  ##% ▂▃▅▇█│`
  - Fallback: show % only when no recentActivity data
  - Hide sparklines if sidebar < 24 cols
- `src/cli/dashboard-ink/components/InspectorPanel.tsx`:
  - Add `FocusScoreBreakdown` section showing score + component bars

**Tests to create:**
- `test/unit/adapters/presenters/SparklineData.test.js` — Bucket aggregation, empty sessions, single project filter
- `test/unit/cli/dashboard-ink/SidebarSparkline.test.tsx` — Renders sparkline chars, trend coloring, fallback behavior

**Sparkline chars:** `▁▂▃▄▅▆▇█` (index = floor(value/max * 7)), zero → `·`

**Trend color (from theme):**
- Rising (last 2 > first 2): theme.chart.sparklineUp (green)
- Falling: theme.chart.sparklineDown (yellow, never red)
- Flat: theme.text.primary

**Commit:** `feat(dashboard): add sidebar sparklines and focus tier icons`

**Verify:** Dashboard sidebar shows sparklines with mock data. InspectorPanel shows focus breakdown. All tests pass.

---

### Increment 4: Activity Heatmap

**Goal:** GitHub-style contribution grid in InspectorPanel (full 7-day) and EcosystemView (compact 4-day).

**Files to modify:**
- `src/adapters/presenters/StatsPresenter.js` — Add `formatHeatmapGrid(dailyBreakdown, { weeks, metric })` function

**Files to create:**
- `src/cli/dashboard-ink/components/shared/HeatmapComponent.tsx`:
  - Props: `grid`, `weeks`, `compact`, `streakDays`, `bestDay`, `totalSessions`
  - Full mode: 7 rows (Mon-Sun), row labels
  - Compact mode: 4 rows (Mon/Wed/Fri/Sat)
  - Characters: `· ░ ▒ ▓ █` (5 levels) with theme.chart.heatmap[0-4] colors
  - Legend: "less ·░▒▓█ more" right-aligned
  - Summary: "{streak} day streak · Best: {day} · {count} sessions"
  - Dynamic week count: min(13, floor(availableWidth / 2))

**Files to modify (integration):**
- `src/cli/dashboard-ink/components/InspectorPanel.tsx` — Add HeatmapComponent (full mode) below focus breakdown
- `src/cli/dashboard-ink/components/views/EcosystemView.tsx` — Add HeatmapComponent (compact mode) as global activity section

**Tests to create:**
- `test/unit/adapters/presenters/HeatmapGrid.test.js` — Grid dimensions, level calculation, date alignment, empty data
- `test/unit/cli/dashboard-ink/HeatmapComponent.test.tsx` — Full vs compact rendering, legend, summary line

**Grid algorithm (from spec):**
```
1. Build date → value map from dailyBreakdown
2. Normalize: level = ceil((value / max) * 4), 0 for no activity
3. Reshape into 7 rows × N cols (Mon=row 0, oldest week = col 0)
```

**Commit:** `feat(dashboard): add activity heatmap with compact and full modes`

**Verify:** All tests pass (existing + new). Heatmap renders in InspectorPanel and EcosystemView.

---

## Final Steps (after all 4 increments)

1. Run full test suite: `npm test` (expect 1,750+ passing + new tests)
2. Update `package.json` version to `0.9.1`
3. Update `CLAUDE.md` version history with v0.9.1 entry
4. Update `.STATUS` file
5. Commit: `chore: bump version to v0.9.1`
6. Create PR: `gh pr create --base dev`

## Key Architecture Constraints

- **Mock data:** Dashboard currently uses mock data in App.tsx. These features work with mock data for now. Wiring real session data (via GetSessionStatsUseCase) is a separate concern tracked in SPEC-ink-data-integration.
- **Single fetch:** When real data is wired, fetch once with `days: 84` and derive all visuals (sparklines, heatmap, focus score) from one response. 60-second refresh.
- **No new dependencies:** All features use Unicode characters + ANSI colors already available via Ink/chalk.
- **Never use red:** Yellow for "needs attention" — ADHD-friendly design principle.
- **Backward compat:** `statusIcon()` and `statusColor()` functions stay in constants.ts for any non-dashboard callers. Theme system is additive.
