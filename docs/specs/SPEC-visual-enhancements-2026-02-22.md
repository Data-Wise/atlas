# SPEC: v0.9.1 Visual Enhancements

> Status: draft
> Created: 2026-02-22
> From Brainstorm: BRAINSTORM-visual-enhancements-2026-02-22.md
> Branch: feature/visual-enhancements (single worktree, all 4 features)

## Overview

Add four visual enhancements to the Ink TUI dashboard that transform it from a text-heavy list into a glanceable, ADHD-friendly context-awareness tool. Sidebar sparklines show project momentum, focus score replaces status icons with a quality metric, an activity heatmap reveals work patterns, and a theme system enables personalization.

## Primary User Story

**As a** developer with ADHD using the Atlas dashboard,
**I want to** see at a glance which projects have momentum, which need attention, and my work patterns,
**So that** I can quickly orient myself and make progress without cognitive overload.

## Acceptance Criteria

- [ ] Sidebar rows show 5-char sparkline (▁▂▃▅█) reflecting 5-day session trends
- [ ] Focus tier symbol (○◔◑◕●) replaces status icon in sidebar, with color per tier
- [ ] InspectorPanel shows focus score breakdown (duration/flow/completion/consistency bars)
- [ ] Activity heatmap renders 13-week grid with 5-level block characters (·░▒▓█)
- [ ] Heatmap appears in InspectorPanel (full 7-day) and EcosystemView (compact 4-day)
- [ ] Theme system provides 5 built-in themes (default, nord, solarized, mono, high-contrast)
- [ ] Theme persists in `~/.atlas/config.json` under `preferences.theme`
- [ ] All existing tests pass; new tests cover focus score calculation, heatmap grid, theme context
- [ ] Dashboard renders correctly at 80x24 minimum terminal size

## Secondary User Stories

- **As a** user reviewing my weekly stats, I want the focus score included in `atlas stats` output so I can track quality over time.
- **As a** user with a custom terminal theme, I want to select a matching Atlas theme so the dashboard looks intentional.
- **As a** user with color vision deficiency, I want the mono/high-contrast themes to convey all information without relying on color.

---

## Architecture

### Data Flow

```
App.tsx (mount + 60s interval)
  → GetSessionStatsUseCase.execute({ days: 84 })
  → Single fetch, derive all:
      ├── StatsPresenter.formatHeatmapGrid(dailyBreakdown, 13)  → HeatmapComponent
      ├── StatsPresenter.projectSparklineData(sessions, name, 5) → SidebarPanel rows
      └── stats.focusScore → InspectorPanel / SidebarPanel tier icon
```

### Component Diagram

```
ThemeProvider (wraps App)
  └── App.tsx
       ├── SidebarPanel
       │    └── Row (tier icon + name + % + InlineSparkline)
       ├── InspectorPanel
       │    ├── FocusScoreBreakdown
       │    └── HeatmapComponent (7-day full)
       ├── EcosystemView
       │    └── HeatmapComponent (4-day compact)
       └── [existing views unchanged]
```

---

## Feature 1: Sidebar Sparklines

### Data

Add to `types.ts`:
```typescript
export interface Project {
  // ... existing fields
  recentActivity?: number[];  // 5-day session minutes (newest last)
}
```

Add to `StatsPresenter.js`:
```javascript
export function projectSparklineData(sessions, projectName, days = 5) {
  // Returns number[] of length `days`, each = total session minutes for that day
}
```

### Rendering

New component `InlineSparkline` in SidebarPanel.tsx:
- Characters: `▁▂▃▄▅▆▇█` (index = floor(value/max * 7))
- Zero days: `·` (middle dot)
- Color by trend: last 2 > first 2 → green, else → yellow, flat → default
- Width: 5 chars

### Layout (28-col sidebar)

```
│ ◕ name(14ch)  ##% ▂▃▅▇█│
  2  14          4   5  = 25 + 3 padding = 28
```

Fallback: when `recentActivity` is undefined, show progress `%` only (no sparkline).
Hide sparklines entirely if sidebar < 24 cols.

---

## Feature 2: Focus Score

### Domain Layer

Add to `BusinessRules.js`:
```javascript
FOCUS_SCORE_WEIGHT_DURATION: 0.30,
FOCUS_SCORE_WEIGHT_FLOW: 0.30,
FOCUS_SCORE_WEIGHT_COMPLETION: 0.25,
FOCUS_SCORE_WEIGHT_CONSISTENCY: 0.15,

FOCUS_SCORE_DURATION_EXCELLENT: 45,  // minutes -> 100 points
FOCUS_SCORE_DURATION_GOOD: 25,
FOCUS_SCORE_DURATION_FAIR: 15,
```

### Calculation (in GetSessionStatsUseCase)

```javascript
calculateFocusScore(summary, streak) → {
  score: 0-100,
  grade: 'A'|'B'|'C'|'D'|'F',
  tier: { symbol, color, label },
  components: { duration, flow, completion, consistency }
}
```

### Display Tiers

| Score | Symbol | Color | Label |
|-------|--------|-------|-------|
| 0-19 | ○ | dim white | drift |
| 20-39 | ◔ | yellow | warming |
| 40-59 | ◑ | cyan | steady |
| 60-79 | ◕ | green | strong |
| 80-100 | ● | bright green | deep |

### Sidebar Integration

Replace `statusIcon(project.status)` call in SidebarPanel Row with `focusTierIcon(project.focusScore)`. The tier symbol replaces the status dot entirely.

### InspectorPanel Integration

New `FocusScoreBreakdown` component:
```
Focus  ◕ 72 strong
════════════════════════════════════ ··········
Duration ████████  Compl ██████  Consist ██████
```

---

## Feature 3: Activity Heatmap

### Presenter Function

Add to `StatsPresenter.js`:
```javascript
export function formatHeatmapGrid(dailyBreakdown, { weeks = 13, metric = 'minutes' } = {})
// Returns: Array<Array<{ date, value, level: 0-4 }>>  (7 rows x N cols)
// Monday=row 0, Sunday=row 6. Oldest week on left.
```

### Character + Color Mapping

| Level | Char | 256-Color | Meaning |
|-------|------|-----------|---------|
| 0 | · | 238 (dark gray) | No activity |
| 1 | ░ | 108 (muted green) | Light |
| 2 | ▒ | 71 (medium green) | Moderate |
| 3 | ▓ | 34 (bright green) | Strong |
| 4 | █ | 40 (vivid green) | Peak |

### Component

New `HeatmapComponent.tsx`:
- Props: `grid`, `weeks`, `compact` (boolean)
- Compact mode (4 rows: Mon/Wed/Fri/Sat) for EcosystemView
- Full mode (7 rows) for InspectorPanel
- Summary line: "{streak} day streak · Best: {day} · {count} sessions this quarter"
- Legend: "less ·░▒▓█ more" (right-aligned)
- Dynamic week count based on available width (min 8, max 13)

### Placement

| View | Mode | Trigger |
|------|------|---------|
| InspectorPanel | Full (7 rows) | Always visible when project selected |
| EcosystemView | Compact (4 rows) | Global across all projects |
| DetailView | Full (7 rows) | Per-project when in SINGLE layout |

---

## Feature 4: Theme System

### ThemeContext.tsx (new file)

```typescript
export interface Theme {
  name: string;
  panel: { borderActive, borderInactive, headerActive, headerInactive };
  status: Record<string, string>;  // replaces STATUS_COLOR
  text: { primary, secondary, muted, accent };
  chart: {
    sparkline: string;
    sparklineUp: string;      // green
    sparklineDown: string;    // yellow (never red)
    heatmap: string[];        // 5 levels
    progressFilled: string;
    progressEmpty: string;
  };
  focus: { timer, paused, break };
  focusTiers: string[];       // 5 tier colors
}

export const THEMES: Record<string, Theme> = { default, nord, solarized, mono, highContrast };
export const ThemeProvider: React.Provider<Theme>;
export const useTheme: () => Theme;
```

### Built-in Themes

| Theme | Momentum | Attention | Neutral | Dormant |
|-------|----------|-----------|---------|---------|
| default | green | yellow | cyan | gray |
| nord | teal (#8FBCBB) | aurora yellow (#EBCB8B) | frost blue (#81A1C1) | polar (#4C566A) |
| solarized | green (#859900) | yellow (#B58900) | blue (#268BD2) | base01 (#586E75) |
| mono | white | bright white | gray | dim gray |
| high-contrast | bright green | bright yellow | bright cyan | white |

### Migration Path

1. Define `THEMES.default` with current hardcoded values (zero visual change)
2. Wrap `<App>` in `<ThemeProvider value={THEMES[config.theme]}>`
3. Replace hardcoded colors in components incrementally via `useTheme()`
4. `constants.ts` keeps `STATUS_ICON`; `STATUS_COLOR` migrates to `theme.status`
5. Store selection in `~/.atlas/config.json` → `preferences.theme`

### Dashboard Key Binding

`t` key cycles through themes (or opens theme picker in a future version).

---

## Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| React Ink | TUI rendering | Already installed |
| chalk | 256-color ANSI output for heatmap | Already available via Ink |
| No new deps | All features use existing Unicode characters + ANSI colors | N/A |

---

## UI/UX Specifications

### ADHD Design Principles

1. **One Number Per Context** — sidebar: tier symbol. Inspector: score + breakdown. Heatmap: streak.
2. **Color as Emotion** — green=momentum, yellow=attention, cyan=neutral, gray=dormant. **Never red.**
3. **Progressive Disclosure** — glance(symbol) → scan(sparkline) → examine(heatmap)
4. **Celebrate Momentum** — show streaks prominently. Gaps are gray dots, not "streak lost!"
5. **Reduce Decision Points** — sparklines appear automatically when sidebar is wide enough

### Full Dashboard Mockup (80x24 SPLIT)

```
┌ Projects ──────────────┐┌ atlas ──────────────────────────────────────────┐
│ ◕ atlas        75% ▂▃▇██│ Focus  ◕ 72 strong                             │
│ ◑ zsh-config   40% ▇▅▃▂▁││ ══════════════════════════════════ ··········  │
│ ● homebrew-tap 90% ▅▅▅▇▇││ Duration ████████ Compl ██████ Consist ██████ │
│ ◔ dotfiles     60% ▁▁▂▃▅││                                               │
│ ○ blog         20% ▃▁···││ Streak: 4d  Best: 2h15m (Thu)  Avg: 48m      │
│                         ││                                               │
│                         ││ Activity (13w)               less ░▒▓█ more   │
│                         ││ Mon │░ ░░ ░░▒░░░▒▒░▒▒▒▓▒▓▓█▓▒▓▒│             │
│                         ││ Wed │  ░ ░░░▒▒▒░▒▒▓▒▒▓▒▓▓▓█▓█▓▓▒│             │
│                         ││ Fri │░░ ░ ░░░▒░▒▒▒▒▒▓▒▒▓▓█▓▓█▓▒▓│             │
│                         ││ Sat │    ░     ░  ░  ░ ░▒ ░▒░▒ ░ │             │
│                         ││                                               │
│                         ││ Pomodoro  ████████████░░░░░░  18:42           │
├─────────────────────────┤│                                               │
│ 5 projects · 4d streak  ││                                               │
└─────────────────────────┘└───────────────────────────────────────────────┘
```

### Accessibility

- Block density (·░▒▓█) conveys intensity even without color (WCAG compliant)
- `mono` and `high-contrast` themes for vision accessibility
- Focus tier symbols use shape progression (○◔◑◕●), not just color
- Never use red — yellow for "needs attention" to avoid anxiety triggers

---

## Open Questions

1. Should `atlas stats` CLI output also show the focus score? (Recommended: yes)
2. Should the heatmap support a `--weeks N` flag in CLI mode? (Nice-to-have)
3. Should theme selection be a dashboard keybind (`t`) or config-only for v0.9.1? (Recommended: config-only, add keybind in v0.9.2)

---

## Review Checklist

- [ ] Spec reviewed and approved
- [ ] Worktree created on feature/visual-enhancements
- [ ] ORCHESTRATE file written with increment plan
- [ ] Focus score weights validated against real session data
- [ ] Heatmap renders correctly at 80-col minimum
- [ ] All 5 themes defined and tested
- [ ] Tests written for: focus score calculation, heatmap grid, sparkline data, theme context
- [ ] Existing 1,750+ tests still pass
- [ ] CLAUDE.md updated with v0.9.1 entry

---

## Implementation Notes

**Suggested increment order within the feature branch:**
1. **Theme system** (ThemeContext.tsx + 5 themes + wrap App) — infrastructure for all colors
2. **Focus score** (BusinessRules + use case calculation + tests) — pure domain logic
3. **Sidebar sparklines** (Project type update + presenter + SidebarPanel Row) — visible UI change
4. **Heatmap** (presenter grid + HeatmapComponent + wire into Inspector/Ecosystem) — largest piece

**Key constraint:** The dashboard currently uses mock data in App.tsx. Features 1, 3, and 4 need real session data. This means wiring `GetSessionStatsUseCase` into App.tsx is a prerequisite (or continuing with mock data for the visual components and wiring later).

**Data strategy:** Fetch once with `days: 84`, derive all visuals from the single response. 60-second refresh interval. No new repository methods needed.

---

## History

| Date | Change |
|------|--------|
| 2026-02-22 | Initial spec from max brainstorm session |
