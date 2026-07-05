# AnalyticsView — Architecture & DevOps Proposals

> Derived from `docs/grill-260702-analytics-view.md` (11 grilled decisions).

---

## Proposal A — Architecture

### A1. File plan

| Action | File | Notes |
|--------|------|-------|
| **New** | `src/cli/dashboard-ink/components/views/AnalyticsView.tsx` | Full-screen two-panel layout |
| **New** | `src/cli/dashboard-ink/hooks/useAnalytics.ts` | Merged `{ velocity, patterns, error }` hook |
| **Edit** | `src/cli/dashboard-ink/lib/stateMachine.ts` | Add `ANALYTICS` state + transitions |
| **Edit** | `src/cli/dashboard-ink/components/App.tsx` | Import AnalyticsView, wire `a` key, add ANALYTICS case |
| **Edit** | `src/cli/dashboard-ink/components/views/MainView.tsx` | Pass `onAnalytics` prop + `a` key handler |
| **Edit** | `src/cli/dashboard-ink/types.ts` | Add `AnalyticsData` type (if not inline) |

### A2. Component tree

```
App.tsx
└─ LayoutManager (SINGLE by default for AnalyticsView)
   └─ AnalyticsView
      ├─ StatusBar          (project scope, key hints, layout mode)
      ├─ LeftPanel
      │  ├─ Sparkline       (ink-chart <Sparkline> or inline)
      │  └─ WeekTable       (4 rows: week, hours, consistency, trend)
      └─ RightPanel
         └─ Heatmap         (formatHeatmapGrid from TuiPresenter)
            └─ DeadZoneCallout (conditional, below heatmap)
```

### A3. `useAnalytics` hook contract

```typescript
interface WeekData {
  label: string;       // "Jun 22–28"
  focusHours: number;  // 12.5
  consistency: number; // 5 (days with sessions)
  trend: 'up' | 'down' | 'stable';
}

interface PatternData {
  bestDay: string | null;     // "Wednesday"
  bestHour: number | null;    // 10
  deadZones: string[];        // ["Fri 15-17"]
  flowByHour: number[];       // 24 entries
  flowByDay: number[];        // 7 entries
}

interface AnalyticsData {
  velocity: { weeks: WeekData[] } | null;
  patterns: PatternData | null;
  error: Error | null;
}

function useAnalytics(projectId: string | 'all'): AnalyticsData;
```

### A4. State machine diff

```typescript
// Add to STATES
ANALYTICS: 'analytics',

// Add to TRANSITIONS
[STATES.ANALYTICS]: [STATES.BROWSE, STATES.DETAIL, STATES.FOCUS],

// Add to existing states' transition arrays
[STATES.BROWSE]: [...prev, STATES.ANALYTICS],
[STATES.DETAIL]: [...prev, STATES.ANALYTICS],
[STATES.FOCUS]: [...prev, STATES.ANALYTICS],
```

### A5. Data flow

```
┌─────────────┐   60s poll    ┌──────────────────┐
│ SessionRepo  │──────────────►│ VelocityCalculator│
│ (filesystem) │               └────────┬─────────┘
└─────────────┘                        │
                                       ▼
                              ┌──────────────────┐
                              │  useAnalytics()   │──► AnalyticsView
                              │ (SWR, merged)     │
                              └──────────────────┘
┌─────────────┐   300s poll   ▲
│ SessionRepo  │──────────────►│
│ (filesystem) │               │
└─────────────┘    ┌──────────────────┐
                   │ PatternAnalyzer  │
                   └──────────────────┘
```

### A6. Dependency decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ink-chart | **Skip for MVP** | Sparkline can be inline ASCII (`▁▂▃▄▅▆▇█`). Add ink-chart later if richer viz is needed. Avoids external dep. |
| All projects aggregate | **Defer** | MVP: selected-project only. "All" mode adds aggregation logic across repos. |
| FocusView deep-link | **Wire `f` key** | Empty state and keyboard handler both call existing `showFocusView()`. |

---

## Proposal B — DevOps & CI

### B1. Test plan

| Test layer | File | What it covers | Est. effort |
|------------|------|----------------|-------------|
| **Unit** | `test/unit/cli/dashboard-ink/hooks/useAnalytics.test.ts` | Hook returns correct shape, SWR pattern, error forwarding | 20m |
| **Component** | `test/unit/cli/dashboard-ink/components/AnalyticsView.test.tsx` | Renders heatmap + table, empty state, dead zone callout | 25m |
| **Dogfood** | `test/dogfood/analytics-view.ts` | Cross-validates rendered output against filesystem oracle (follows v0.9.2 dual-path) | 45m |

### B2. Dogfood test pattern (dual-path)

```typescript
// 1. Code path — render AnalyticsView, capture output
const output = render(<AnalyticsView data={mockData} />);

// 2. Oracle path — read ~/.atlas sessions, compute via real utils
const oracle = {
  velocity: new VelocityCalculator(sessions).calculate(),
  patterns: new PatternAnalyzer(sessions).analyze(),
};

// 3. Assert
expect(output.velocity.weeks).toEqual(oracle.velocity.weeks);
expect(output.patterns.bestDay).toBe(oracle.patterns.bestDay);
```

### B3. CI impact

| Check | Current | After | Notes |
|-------|---------|-------|-------|
| `npm run lint` | 0 warnings | Same | No new lint rules |
| `npm test` | 1,947 pass | ~1,957 pass | +~10 tests |
| `test:e2e` | Unchanged | Unchanged | No e2e changes |
| CI time | ~3 min | ~3 min | Tests are fast (no I/O in unit tests) |

### B4. Release checklist item

```
## AnalyticsView
- [ ] `a` key navigates to AnalyticsView from BROWSE/DETAIL/FOCUS
- [ ] Velocity sparkline + 4-week table renders for selected project
- [ ] Pattern heatmap renders with correct color scale
- [ ] Dead zone callout appears below heatmap (or hides if no dead zones)
- [ ] Empty state renders when no session data exists
- [ ] `q`/esc returns to BROWSE, `Enter` opens DETAIL, `f` opens FOCUS
- [ ] ink-chart NOT added as dependency (inline sparkline)
- [ ] Dogfood tests pass (dual-path verification)
```

### B5. Rollout strategy

| Phase | Scope | Gate | Est. time |
|-------|-------|------|-----------|
| **Phase 1** | `useAnalytics` hook + state machine + `a` key | Tests pass | 1.5h |
| **Phase 2** | AnalyticsView component (table + heatmap) | Renders with mock data | 1h |
| **Phase 3** | Dogfood tests + edge cases (empty, all-projects) | Full suite green | 1h |
| **Ship** | PR to dev → release | CI green + review | — |

---

## Open decisions for you

1. **ink-chart dependency** — inline sparkline (ASCII, zero deps) vs npm install ink-chart (richer, external dep)?
2. **"All projects" aggregate** — include in Phase 3 or defer entirely?
3. **Branch strategy** — `feature/analytics-view` off `dev`, one PR, or split into hook/view/dogfood PRs?
