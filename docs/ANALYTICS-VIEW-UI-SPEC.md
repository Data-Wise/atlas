# AnalyticsView — ADHD-Friendly UI Specification

> Companion to `SPEC-analytics-view-proposals-2026-07-02.md`. This doc owns the **adversarial-reviewed, lock-solid** UI spec: component tree, keyboard map, theme tokens, loading/error/empty states, data wiring.

## 1. Layout Strategy

**Full-screen single-panel takeover** — identical to TimelineView. The view occupies the **entire main content area**, no sidebar, no inspector. Tab is locked (cycles panel focus within AnalyticsView instead of layout modes).

```
┌─────────────────────────────────────────────────────────────┐
│ [◉ project-name  │  ← / → project  │  updated 23s ago]      │  ← Header bar
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ● Focus Score: 85 (deep flow)   ○ Total: 42 sessions      │  ← Summary row
│                                                             │
│  ┌─ Focus Velocity ──────────────────────────────────────┐  │
│  │  ▁▃██▅▇▇▅▃▁▂▄▆██▇▆▅▃▂▁▂▄▅▇▆▄▃▂                        │  │  ← Sparkline (30 days)
│  │  30-day: +12% ↑     avg 47 min/day                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Weekly Breakdown ────────────────────────────────────┐  │
│  │  Week         Hours   Sessions  Trend    Note          │  │
│  │  Jun 15–21    5.2h    12        ↑ 22%   Good week     │  │
│  │  Jun 8–14     4.1h    9         ↓ 8%    ─             │  │
│  │  Jun 1–7      4.5h    10        → 0%   ─             │  │
│  │  May 25–31    3.8h    7         ↓ 15%  Travel         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Flow Patterns (90-day) ──────────────────────────────┐  │
│  │        6a 8a 10a 12p 2p 4p 6p 8p 10p                 │  │
│  │  Mon   ·  ░  ▒  ▓  █  █  ▒  ░  ·                    │  │
│  │  Tue   ·  ░  ▒  █  █  ▓  ▒  ░  ·                    │  │
│  │  Wed   ·  ░  ▒  ▓  █  █  ▒  ░  ·                    │  │
│  │  Thu   ·  ░  ▒  █  █  ▓  ▒  ░  ·                    │  │
│  │  Fri   ·  ░  ▒  ▓  █  █  ▒  ░  ·                    │  │
│  │  Sat   ░  ▒  ▓  █  █  █  ▓  ▒  ░                    │  │
│  │  Sun   ░  ▒  ▓  █  █  ▓  ▒  ░  ·                    │  │
│  │  Best: Tue 12-2p   Dead zone: Mon before 8a         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 2. Component Tree

```
<AnalyticsView>                           ← full-screen SINGLE
├── <AnalyticsHeader>                     ← project name, arrows, freshness
│   ├── <Text>◉ {projectName}</Text>      ← session indicator (◉ active / ○ idle)
│   ├── <ArrowButtons>← / →</>            ← cycle projects
│   └── <Text dim>updated {n}s ago</Text> ← freshness
│
├── <SummaryRow>                          ← focus score + session count
│   ├── <FocusScoreDisplay score={n} />
│   └── <Text>Total: {n} sessions</Text>
│
├── <FocusSparkline>                      ← 30-day daily focus minutes
│   ├── <SparklineSvg data={[30]} />      ← ASCII ▁▂▃▄▅▆▇█
│   └── <Text>30-day: +12% ↑  avg …</Text>
│
├── <WeeklyTable>                         ← 4-week focus hours
│   └── 4 × <WeekRow week={WeekSummary} />
│
├──<PatternHeatmap>                       ← 7×24 flow rate heatmap
│   ├── <PatternGrid rows={7} cols={9} />  ← ·░▒▓█ cells
│   └── <BestDeadZoneCallout />
│
├── <AnalyticsEmpty />                    ← no data
├── <AnalyticsLoading />                  ← spinner
└── <AnalyticsError />                    ← velocityError / patternError
```

## 3. Props Interface

```typescript
interface AnalyticsViewProps {
  onBack: () => void;           // → BROWSE
  onQuit: () => void;           // → exit
  onFocus: () => void;          // → FOCUS
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
}

// Data types (new — add to types.ts)
interface AnalyticsData {
  // Velocity
  velocitySparkline: number[];         // 30 daily focus minutes
  velocityTrend: number;               // % change
  velocityAvg: number;                 // avg min/day
  weeklySummaries: WeekSummary[][];     // 4 weeks

  // Patterns
  patternGrid: number[][];             // 7×24 flow rate 0-1
  patternBestDay: string;              // "Tuesday"
  patternBestHour: string;             // "12-2p"
  patternDeadZones: DeadZone[];
}

interface WeekSummary {
  label: string;                       // "Jun 15–21"
  totalMinutes: number;
  sessionCount: number;
  trend: number;                       // % change
  note?: string;
}

interface DeadZone {
  day: string;
  hour: string;
  intensity: number;                   // 0-1 (how dead)
}
```

## 4. Keyboard Map

| Key | From ANALYTICS → | Notes |
|-----|------------------|-------|
| `q` | BROWSE | Always returns to main list |
| `Enter` | DETAIL (selected project) | Same as global Enter behavior |
| `f` | FOCUS | Jump to focus with current project |
| `←` | — (prev project) | Cycle within AnalyticsView only |
| `→` | — (next project) | Cycle within AnalyticsView only |
| `Tab` | — (cycle panel focus) | Locked — only cycles left/right panels within view |

**Transitions matrix**: From ANALYTICS, only BROWSE (`q`), DETAIL (`Enter`), FOCUS (`f`). All other transitions are handled by App-level dispatch.

## 5. State Machine Integration

Add to `STATES` enum + transitions in `stateMachine.ts`:

```typescript
// states
ANALYTICS = 'analytics'

// transitions from ANALYTICS
machine.addTransition(STATES.ANALYTICS, STATES.BROWSE,   { key: 'q' });
machine.addTransition(STATES.ANALYTICS, STATES.DETAIL,   { key: 'Enter' });
machine.addTransition(STATES.ANALYTICS, STATES.FOCUS,    { key: 'f' });

// transitions TO ANALYTICS (from all 7 states)
ALL_STATES.forEach(s => {
  if (s !== STATES.ANALYTICS) {
    machine.addTransition(s, STATES.ANALYTICS, { key: 'a' });
  }
});
```

## 6. Theme Tokens

Add to `Theme` interface in `ThemeContext.tsx`:

```typescript
chart: {
  sparkline: string;       // already exists
  sparklineUp: string;     // already exists (green)
  sparklineDown: string;   // already exists (yellow — not red!)
  heatmap: [string, string, string, string, string];  // already exists
  progressFilled: string;  // already exists
  progressEmpty: string;   // already exists
};
panel: {
  borderActive: string;    // already exists
  borderInactive: string;  // already exists
  headerActive: string;    // already exists
  headerInactive: string;  // already exists
  highlightBg: string;     // NEW — for hover/selected table rows
};
```

**New tokens for all 5 themes** (example: default):

```typescript
// default
panel.highlightBg = '#1a3a1a';       // dark green highlight row
heatmap[0] = '#3a3a3a';              // high dead zone (was #626262)
heatmap[4] = '#00d700';              // peak flow
```

**Rationale for 3 colors max (no red, no rainbow):**
- `sparklineUp` / `heatmap[4]` / `progressFilled` → green family (good)
- `sparklineDown` / `progressEmpty` → yellow (attention, not alarm)
- `heatmap[0–3]` → gray-to-green ramp (intensity, not category)

## 7. Loading / Error / Empty States

### Loading (first data fetch)
```
┌────────────────────────────────────────┐
│  ◉ my-project                          │
│                                        │
│       ⠋ Loading analytics data...       │
│                                        │
└────────────────────────────────────────┘
```

### Velocity loading + pattern ready (split)
```
┌────────────────────────────────────────┐
│  ◉ my-project                          │
│                                        │
│  ┌─ Focus Velocity ─────────────────┐  │
│  │  ⠋ Loading...                     │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌─ Flow Patterns ──────────────────┐  │
│  │  Mon  ░ ▒ █ ▓ █ █ ▒ ░ ·         │  │
│  │  ...                              │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Error
```
┌────────────────────────────────────────┐
│  ◉ my-project                          │
│                                        │
│  ⚠ Could not load velocity data        │
│  ⚠ Could not load pattern data         │
│                                        │
│  [Retry]  [Back]                       │
│                                        │
└────────────────────────────────────────┘
```

**Design rules:**
- Errors never use red (ADHD principle)
- Split errors: one source failing does not hide the other
- Empty state invites action (start a session)

## 8. Data Wiring

```typescript
// useAnalytics.ts — NEW hook
function useAnalytics(projectId: string | null): {
  data: AnalyticsData | null;
  velocityLoading: boolean;
  patternLoading: boolean;
  velocityError: Error | null;
  patternError: Error | null;
}
```

**Polling strategy:**
- Single `setInterval` at 60s
- On each tick, fetch BOTH data sources
- Use `useRef` for last-good data (SWR pattern like `useProjectStats`)
- Refresh is "fire and forget" — stale data persists until new data arrives

**Data sources:**

| Data | Source | Considerations |
|------|--------|---------------|
| 30-day sparkline | SessionRepository.getDailyFocusMinutes(projectId, 30) | New method — not in VelocityCalculator |
| 4-week summaries | VelocityCalculator.calculate(projectId) | Already exists; returns `{ weeksData, trend, sparkline }` |
| 7×24 pattern grid | Raw sessions → joint bucketing in hook | PatternAnalyzer returns marginal rates only — new computation needed |
| Best day/hour | PatternAnalyzer.calculate(projectId) | Already exists: `bestDay`, `bestHour` |
| Dead zones | PatternAnalyzer.calculate(projectId) | Already exists: `deadZones` |

## 9. Implementation Notes

### 9a. Joint 7×24 hour×day bucketing

PatternAnalyzer returns `flowRateByHour` and `flowRateByDay` as **marginal rates** — not a joint grid.

The hook must compute the 7×24 grid:
```typescript
// In useAnalytics.ts
const sessions = await sessionRepo.findByProjectId(projectId, 90);
const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

for (const s of sessions) {
  const day = s.startTime.getDay();     // 0=Sun..6=Sat
  const hour = s.startTime.getHours();
  grid[day][hour] += s.durationMinutes;
  counts[day][hour]++;
}

// Normalize to [0,1] flow rate (account for zero-division)
for (let d = 0; d < 7; d++) {
  for (let h = 0; h < 24; h++) {
    grid[d][h] = counts[d][h] > 0
      ? Math.min(grid[d][h] / counts[d][h] / 60, 1)  // rate relative to 1h
      : 0;
  }
}
```

### 9b. ASCII sparkline

Inline function — no external dep for MVP:
```typescript
function sparkline(values: number[]): string {
  const max = Math.max(...values, 1);
  const chars = ['▁','▂','▃','▄','▅','▆','▇','█'];
  return values.map(v => chars[Math.min(
    Math.floor((v / max) * (chars.length - 1)),
    chars.length - 1
  )]).join('');
}
```

### 9c. Pattern grid rendering

Use `formatPatternGrid()` in new `PatternPresenter.js`:
```typescript
function formatPatternGrid(grid: number[][]): string {
  const symbols = ['·','░','▒','▓','█'];
  return grid.map(row =>
    row.map(cell => symbols[Math.min(
      Math.floor(cell * (symbols.length - 1)),
      symbols.length - 1
    )]).join('')
  ).join('\n');
}
```

## 10. Aesthetic Risk: Borderless Panels

**Risk:** Every other dashboard view uses `borderStyle="single"` with Ink's `<BorderBox>`. AnalyticsView omits these borders, relying on **whitespace + color contrast** to separate sections.

**Mitigation:**
- Section headers are bold + theme accent color (cyan)
- Color-coded sparkline (green up, yellow down)
- Table rows alternate background tint (even rows get subtle highlight)
- Heatmap uses visual density (·░▒▓█) — inherently perceptually separated

If borderless looks wrong during dogfood testing, the fallback is wrapping each panel in `<Box borderStyle="round" borderColor={theme.panel.borderInactive}>`.

## 11. Testing Plan

| Test | Type | What it validates |
|------|------|-------------------|
| `useAnalytics` loads velocity | dogfood | Real session data → sparkline + table match |
| `useAnalytics` loads patterns | dogfood | Real session data → 7×24 grid computes |
| `useAnalytics` split error | dogfood | Bad velocity data still shows patterns |
| `AnalyticsHeader` cycles projects | component | ← → arrows change selected project |
| `FocusSparkline` renders | component | 30 values → 30 ASCII chars |
| `PatternHeatmap` formats | component | 7×24 grid → 7-line pattern output |
| Empty state renders | component | No sessions → invite message |
| Keyboard `a` → ANALYTICS | dogfood | App-level key dispatch works |

## 12. Effort Breakdown

| Task | Est. (h) | Depends on |
|------|----------|------------|
| Wire `a` key + state machine | 0.25 | — |
| `useAnalytics` hook + joint bucketing | 1.0 | — |
| `formatPatternGrid()` in PatternPresenter | 0.25 | — |
| `SessionRepository.getDailyFocusMinutes()` | 0.5 | — |
| AnalyticsView shell + header | 0.5 | — |
| FocusSparkline component | 0.25 | sparkline function |
| WeeklyTable component | 0.25 | — |
| PatternHeatmap component | 0.5 | — |
| FocusScore callout | 0.25 | — |
| Theme tokens (highlightBg) | 0.1 | — |
| Tests (dogfood + component) | 1.0 | all above |
| **Total** | **4.85** | — |
