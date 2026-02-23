# Visual Guide

> Theme system, focus score, sparklines, and activity heatmap — everything added in v0.9.1.

**Last Updated:** 2026-02-22

---

## Overview

v0.9.1 adds four visual enhancement layers to the Atlas dashboard:

| Feature | Location | Purpose |
|---------|----------|---------|
| [Theme System](#theme-system) | All panels | Consistent color tokens across 5 themes |
| [Focus Score](#focus-score) | Inspector, `atlas stats` | Weighted quality metric with tier classification |
| [Sparklines](#sparklines) | Sidebar rows | 5-day inline activity charts |
| [Activity Heatmap](#activity-heatmap) | Inspector, Ecosystem | 13-week GitHub-style activity grid |

---

## Theme System

### Using Themes

Press `t` in the dashboard to cycle through themes. Five built-in themes are available:

| Theme | Description | Best for |
|-------|-------------|----------|
| `default` | Purple accents, warm grays | General use |
| `nord` | Arctic blue palette | Dark terminal backgrounds |
| `solarized` | Ethan Schoonover's classic | Light or dark terminals |
| `mono` | Pure grayscale | Minimal distraction |
| `high-contrast` | Maximum readability | Accessibility, bright rooms |

### Theme Architecture

Themes are managed through React Context:

```
ThemeContext.tsx
├── Theme interface      — color token contract
├── THEMES object        — 5 theme definitions
├── ThemeProvider         — React context provider
└── useTheme()           — hook to access current theme
```

### Theme Interface

Every theme provides these color tokens:

```typescript
interface Theme {
  name: string;
  panel: {
    borderActive: string;      // Focused panel border
    borderInactive: string;    // Unfocused panel border
    headerActive: string;      // Active panel header text
    headerInactive: string;    // Inactive panel header text
  };
  status: Record<string, string>;  // active, stable, paused, etc.
  text: {
    primary: string;           // Main text
    secondary: string;         // Labels, headers
    muted: string;             // Dim text, hints
    accent: string;            // Highlighted text, keybinds
  };
  chart: {
    sparkline: string;         // Default sparkline color
    sparklineUp: string;       // Upward trend
    sparklineDown: string;     // Downward trend
    heatmap: [string, string, string, string, string];  // Levels 0-4
    progressFilled: string;    // Progress bar filled
    progressEmpty: string;     // Progress bar empty
  };
  focus: {
    timer: string;             // Active timer color
    paused: string;            // Paused state
    break: string;             // Break time
  };
  focusTiers: [string, string, string, string, string];  // 5 tier colors
}
```

### Using Themes in Components

```tsx
import { useTheme } from '../lib/ThemeContext.js';

const MyComponent = () => {
  const theme = useTheme();
  return <Text color={theme.text.accent}>Highlighted</Text>;
};
```

### Design Principle: Never Red

All themes follow the ADHD-friendly principle of **never using red** for status or priority indicators. Yellow means "needs attention" — red is reserved for nothing, reducing anxiety in the interface.

---

## Focus Score

### What It Measures

Focus score is a 0-100 quality metric calculated from four weighted components:

| Component | Weight | What it measures | Excellent threshold |
|-----------|--------|------------------|---------------------|
| Duration | 30% | Average session length | ≥ 45 minutes |
| Flow | 30% | % of sessions ≥ 15 min | High flow % |
| Completion | 25% | Session completion rate | High completion |
| Consistency | 15% | Streak-based regularity | Active streak |

### Tier Classification

The score maps to five tiers with progressive Unicode symbols:

| Tier | Score Range | Symbol | Color | Meaning |
|------|-------------|--------|-------|---------|
| Deep | 80-100 | ● | Green bright | Sustained, flow-rich sessions |
| Strong | 60-79 | ◕ | Green | Good balance of duration and flow |
| Steady | 40-59 | ◑ | Cyan | Regular engagement |
| Warming | 20-39 | ◔ | Yellow | Building momentum |
| Drift | 0-19 | ○ | Gray | Getting started |

### Where Focus Score Appears

1. **`atlas stats` output** — "Focus Score: ◕ 72 strong" in the table
2. **Inspector Panel** — Focus score breakdown below progress bar
3. **Sidebar rows** — Tier symbol replaces status icon when available

### Domain Constants

Thresholds are defined in `src/domain/constants/BusinessRules.js`:

```javascript
FOCUS_SCORE_WEIGHT_DURATION: 0.30,
FOCUS_SCORE_WEIGHT_FLOW: 0.30,
FOCUS_SCORE_WEIGHT_COMPLETION: 0.25,
FOCUS_SCORE_WEIGHT_CONSISTENCY: 0.15,

FOCUS_SCORE_DURATION_EXCELLENT: 45,  // minutes
FOCUS_SCORE_DURATION_GOOD: 25,
FOCUS_SCORE_DURATION_FAIR: 15,

FOCUS_TIER_DEEP: 80,
FOCUS_TIER_STRONG: 60,
FOCUS_TIER_STEADY: 40,
FOCUS_TIER_WARMING: 20,
```

### Presenter API

Format focus score for display:

```javascript
import {
  formatFocusScore,    // "◕ 72 strong"
  focusTierIcon,       // "◕"
  focusTierColor,      // "green"
  focusTierLabel,      // "strong"
  getTierFromScore,    // { symbol, label, color, index }
} from './adapters/presenters/FocusScorePresenter.js';

formatFocusScore(72);  // "◕ 72 strong"
focusTierIcon(85);     // "●"
getTierFromScore(45);  // { symbol: "◑", label: "steady", color: "cyan", index: 2 }
```

---

## Sparklines

### Sidebar Sparklines

Each project row in the sidebar shows a 5-character inline sparkline representing the last 5 days of activity:

```
● atlas       75% ▂▃▅▆█   ← upward trend (green)
◔ flow-cli    95% █▅▃▂▁   ← downward trend (yellow)
◑ mcp-server  80% ▃▃▅▅▆   ← stable (default)
```

### Characters

The sparkline uses 8 Unicode block elements:

```
▁ ▂ ▃ ▄ ▅ ▆ ▇ █
```

Values are normalized to the max in the dataset, then mapped to the closest character.

### Trend Coloring

| Trend | Color | Detection |
|-------|-------|-----------|
| Upward | `theme.chart.sparklineUp` (green) | Last value > first value |
| Downward | `theme.chart.sparklineDown` (yellow) | Last value < first value |
| Stable | `theme.chart.sparkline` (default) | Equal or no data |

### Data API

Generate sparkline data from session history:

```javascript
import { projectSparklineData } from './adapters/presenters/StatsPresenter.js';

// Returns array of minute-totals per day [oldest, ..., newest]
const data = projectSparklineData(sessions, 'atlas', 5);
// [20, 35, 60, 80, 90]
```

---

## Activity Heatmap

### Overview

A GitHub-style contribution heatmap showing activity over the last 13 weeks. Uses 5 Unicode block characters with theme-aware coloring:

```
Activity (13w)
Mon ·░▒▓█·░▒▓█·░▒
Tue ·····░░▒▒▓▓██
Wed ░░··░░▒▒▓▓████
Thu ·····░░░▒▒▓▓██
Fri ····░░░▒▒▓█████
Sat ·····░░░▒▒▓▓██
Sun ░░·····░░▒▓████
    less ·░▒▓█ more
🔥 4d streak  23 sessions
```

### Display Modes

| Mode | Rows | Used in | Purpose |
|------|------|---------|---------|
| Full | 7 (Mon-Sun) | InspectorPanel | Complete weekly view |
| Compact | 4 (Mon/Wed/Fri/Sat) | EcosystemView | Space-efficient overview |

### Character Levels

| Level | Character | Meaning |
|-------|-----------|---------|
| 0 | `·` | No activity |
| 1 | `░` | Light activity |
| 2 | `▒` | Moderate activity |
| 3 | `▓` | High activity |
| 4 | `█` | Peak activity |

Colors are theme-aware via `theme.chart.heatmap[0..4]`.

### Grid Layout

- **Rows** = days of the week (Monday = row 0, Sunday = row 6)
- **Columns** = weeks (oldest on left, newest on right)
- **Default** = 13 weeks (1 quarter)

### Summary Line

Below the heatmap, a summary shows:

- Current streak in days (e.g., "4d streak")
- Total session count
- Best day (when provided)

### Data API

Generate the heatmap grid from daily breakdown data:

```javascript
import { formatHeatmapGrid } from './adapters/presenters/StatsPresenter.js';

// dailyBreakdown from GetSessionStatsUseCase
const grid = formatHeatmapGrid(dailyBreakdown, {
  weeks: 13,        // default: 13 weeks
  metric: 'minutes' // or 'sessions'
});

// Returns: HeatmapCell[7][13]
// Each cell: { date: string, value: number, level: 0-4 }
```

### Component Props

```tsx
import { HeatmapComponent } from './shared/HeatmapComponent.js';

<HeatmapComponent
  grid={heatmapGrid}        // 7×N grid from formatHeatmapGrid
  weeks={13}                 // Number of weeks to display
  compact={false}            // true = 4-row mode
  streakDays={4}             // Current streak
  totalSessions={23}         // Total count
  bestDay="Thu 2h15m"        // Best day label
/>
```

---

## Integration Points

### Stats Command → Focus Score

`GetSessionStatsUseCase.execute()` returns a `focusScore` object:

```javascript
const stats = await getSessionStats.execute({ days: 7 });

stats.focusScore = {
  score: 72,
  grade: 'B',
  tier: { symbol: '◕', label: 'strong', index: 3 },
  components: {
    duration: 80,
    flow: 70,
    completion: 65,
    consistency: 60,
  },
};
```

### Stats Command → Heatmap Grid

```javascript
const stats = await getSessionStats.execute({ days: 91 });
const grid = formatHeatmapGrid(stats.dailyBreakdown, { weeks: 13 });
```

### Dashboard Real Data Pipeline (v0.9.2)

The dashboard uses real data from `~/.atlas` via four React hooks:

| Hook | Data | Poll |
|------|------|------|
| `useProjects` | Project list + focus scores + sparklines | 5s |
| `useActiveSession` | Active session detection + elapsed timer | 5s + 1s tick |
| `useProjectStats` | Heatmap, streak, breadcrumbs for selected project | 10s |
| `usePendingCaptures` | Inbox count from CaptureRepository | 10s |

All hooks access the DI Container via `AtlasContext` (React Context wrapping `Container.js`).
Projects are filtered to remove `tmp.*` junk, archived entries, and duplicates.
Domain value objects (`ProjectType`) are extracted to primitives before rendering.

---

## File Reference

| File | Layer | Purpose |
|------|-------|---------|
| `src/domain/constants/BusinessRules.js` | Domain | Focus score weights and tier thresholds |
| `src/use-cases/session/GetSessionStatsUseCase.js` | Use Case | `calculateFocusScore()` method |
| `src/adapters/presenters/FocusScorePresenter.js` | Adapter | Tier formatting (icon, color, label) |
| `src/adapters/presenters/StatsPresenter.js` | Adapter | `projectSparklineData()`, `formatHeatmapGrid()` |
| `src/cli/dashboard-ink/lib/ThemeContext.tsx` | Presentation | Theme definitions, provider, hook |
| `src/cli/dashboard-ink/components/shared/HeatmapComponent.tsx` | Presentation | Heatmap React component |
| `src/cli/dashboard-ink/components/SidebarPanel.tsx` | Presentation | Sparklines + focus tier icons |
| `src/cli/dashboard-ink/components/InspectorPanel.tsx` | Presentation | Focus score breakdown + heatmap |
| `src/cli/dashboard-ink/types.ts` | Presentation | `focusScore`, `focusTier`, `recentActivity` fields |

### Test Files

| Test | Tests | Coverage |
|------|-------|----------|
| `test/unit/cli/dashboard-ink/lib/ThemeContext.test.tsx` | 19 | Theme definitions, provider, hook |
| `test/unit/use-cases/session/FocusScore.test.js` | 10 | Score calculation, tier assignment |
| `test/unit/adapters/presenters/FocusScorePresenter.test.js` | 14 | Formatting, edge cases |
| `test/unit/adapters/presenters/SparklineData.test.js` | 8 | Data generation, normalization |
| `test/unit/cli/dashboard-ink/components/SidebarSparkline.test.tsx` | 7 | Sparkline rendering |
| `test/unit/adapters/presenters/HeatmapGrid.test.js` | 8 | Grid generation, levels |
| `test/unit/cli/dashboard-ink/components/HeatmapComponent.test.tsx` | 10 | Component rendering, modes |
