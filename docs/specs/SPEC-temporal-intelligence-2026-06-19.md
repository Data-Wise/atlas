# SPEC: Temporal Intelligence — v0.10.0

**Date:** 2026-06-19
**Status:** Draft
**Target release:** v0.10.0

---

## Purpose

Atlas v0.10.0 adds temporal intelligence: three read-only utility classes that mine
existing session history to surface velocity trends, productivity patterns, and
per-project time calibration. No schema changes. No new data collection. Pure
analytical layer over data already written by `FileSystemSessionRepository`.

Goals:
- Give users a factual picture of their working rhythm (when, how long, how consistently)
- Surface flow-state windows so users can schedule deep work more intentionally
- Improve time estimation accuracy per project through Bayesian calibration

---

## Architecture Notes

- All three classes are **pure reads** — they call `FileSystemSessionRepository.findByDateRange()` and perform in-memory computation only.
- No writes to `~/.atlas/`. No migrations. No new entity types.
- Placed in `src/utils/` alongside existing ADHD helpers (`StreakCalculator`, `TimeBlindnessHelper`, etc.).
- Consumed by two surfaces: CLI (`atlas stats` new flags) and the Ink dashboard (new `AnalyticsView` or extended `EcosystemView`).
- All three classes receive a session array as input — callers own the repository call so the utils remain testable without I/O.
- `Session.isInFlowState()` is the existing domain method used to classify flow sessions; no new domain logic needed.

---

## VelocityCalculator API Contract

### Purpose

Tracks sessions/week and focus-hours/week over a rolling 4-week window to show
velocity trend and consistency at a glance.

### Constructor

```javascript
new VelocityCalculator(sessions)
// sessions: Session[] — array from FileSystemSessionRepository.findByDateRange()
```

### Method: `calculate()`

```javascript
calculate() => {
  weeksData: Array<{
    week: string,          // ISO week label e.g. "2026-W24"
    sessionCount: number,  // total sessions that started in this week
    focusHours: number,    // sum of session durations in hours (2 decimal places)
    consistency: number,   // days-with-sessions / 7, range [0, 1]
  }>,
  trend: 'up' | 'down' | 'stable',  // derived from linear regression slope of focusHours
  sparkline: string,                  // 8-char block sparkline of focusHours e.g. "▁▃▅█"
}
```

### Design Rules

- **Window:** 4 complete ISO weeks ending at the start of the current week (i.e., excludes the
  in-progress week so partial data does not skew trend).
- **Trend:** compare mean of weeks 3–4 vs weeks 1–2. If delta > +10% → `'up'`; < -10% → `'down'`; else `'stable'`.
- **Consistency:** count distinct calendar days that contain at least one session start, divided by 7.
- **Sparkline:** 4 values mapped to `▁▂▃▄▅▆▇█` (8 levels) proportional to max focusHours in window.

### Edge Cases

| Condition | Behaviour |
|---|---|
| Fewer than 4 weeks of history | Return only available weeks; trend = `'stable'` |
| Empty session array | Return `{ weeksData: [], trend: 'stable', sparkline: '' }` |
| Session with null duration | Skip session (treat as incomplete) |
| Session spanning midnight | Assign to the week containing `session.startTime` |

---

## PatternAnalyzer API Contract

### Purpose

Identifies day-of-week and hour-of-day productivity windows from a rolling 90-day
history, using `Session.isInFlowState()` to distinguish deep-work slots from routine ones.

### Constructor

```javascript
new PatternAnalyzer(sessions)
// sessions: Session[] — should cover ~90 days for meaningful output
```

### Method: `analyze()`

```javascript
analyze() => {
  bestDay: string,          // e.g. "Tuesday" — highest flowRate day
  bestHour: number,         // 0-23 — highest flowRate hour
  deadZones: Array<{        // slots with flowRate === 0 and sessionCount > 2
    day?: string,
    hour?: number,
    type: 'day' | 'hour',
  }>,
  flowRateByHour: Record<number, number>,  // key: 0-23, value: flow sessions / total sessions
  flowRateByDay: Record<string, number>,   // key: 'Monday'...'Sunday', value: flow/total
}
```

### Design Rules

- **Flow rate per slot:** `flowSessions / totalSessions` for that slot; slots with 0 sessions
  get `flowRate = null` (excluded from bestDay/bestHour ranking, not included in deadZones).
- **bestDay/bestHour:** slot with highest `flowRate` among slots that have >= 3 session observations
  (avoids single-session flukes).
- **deadZones:** slots where `flowRate === 0` AND `sessionCount >= 3` — confirmed non-productive,
  not just rarely used.
- **Hour assignment:** use `session.startTime` hour in local time (not UTC).

### Edge Cases

| Condition | Behaviour |
|---|---|
| Empty session array | Return all fields as null / empty objects |
| No flow sessions at all | `bestDay`/`bestHour` = null; `flowRateByHour`/`flowRateByDay` all 0 |
| All sessions in flow | `deadZones = []` |
| `isInFlowState()` not defined on session | Treat as `false` (log warning to stderr) |

---

## PredictionEngine API Contract

### Purpose

Per-project time calibration. Compares a user's proposed duration against their
historical session lengths for that project and returns a calibration factor with
Bayesian-style confidence.

### Constructor

```javascript
new PredictionEngine(sessions)
// sessions: Session[] — all history; engine filters by projectName internally
```

### Method: `calibrate(projectName, proposedDurationMinutes)`

```javascript
calibrate(projectName, proposedDurationMinutes) => {
  calibrationFactor: number,    // ratio: mean(actual) / mean(proposed); 1.0 = well-calibrated
  confidence: 'low' | 'medium' | 'high',  // based on historicalN
  adjustedEstimate: number,     // proposedDurationMinutes * calibrationFactor (rounded to integer)
  historicalN: number,          // count of completed sessions used for this project
}
```

### Design Rules

- **Filtering:** only use sessions where `session.projectName === projectName` AND
  `session.status === 'completed'` AND `session.duration > 0`.
- **calibrationFactor:** `mean(actualDurations) / proposedDurationMinutes`. If historical mean
  equals proposed, factor is `1.0`.
- **Bayesian prior:** start from `1.0` (no bias). With n samples, blend:
  `calibrationFactor = (priorWeight * 1.0 + n * empiricalFactor) / (priorWeight + n)`
  where `priorWeight = 3` (equivalent to 3 observations at 1.0x).
- **Confidence thresholds:** `n < 5` → `'low'`; `5 <= n < 10` → `'medium'`; `n >= 10` → `'high'`.
- **adjustedEstimate:** floor to nearest minute; minimum 1.

### Edge Cases

| Condition | Behaviour |
|---|---|
| No sessions for project | `calibrationFactor = 1.0`, `confidence = 'low'`, `adjustedEstimate = proposedDurationMinutes`, `historicalN = 0` |
| `proposedDurationMinutes <= 0` | Throw `RangeError('proposedDurationMinutes must be > 0')` |
| Single outlier session (>3σ from mean) | Exclude from mean calculation; note in return object as `outliersExcluded: number` |

---

## CLI Integration

### New flags on `atlas stats`

```
atlas stats --velocity          # Print VelocityCalculator output (4-week table + trend + sparkline)
atlas stats --patterns          # Print PatternAnalyzer output (best day/hour, dead zones)
atlas stats --calibrate <proj> <minutes>   # Print PredictionEngine output for one project
```

### Example output — `atlas stats --velocity`

```
Velocity (last 4 weeks)          trend: ↑ up
Week       Sessions  Focus hrs  Consistency
2026-W21   8         12.5h      ████░░░  (5/7 days)
2026-W22   10        14.2h      ██████░  (6/7 days)
2026-W23   9         13.1h      ████░░░  (5/7 days)
2026-W24   12        17.0h      ███████  (7/7 days)
Sparkline: ▃▄▄█
```

### Example output — `atlas stats --patterns`

```
Productivity patterns (last 90 days)
Best day:  Tuesday  (flow rate 68%)
Best hour: 09:00    (flow rate 72%)
Dead zones: Wednesday afternoons (14:00-16:00), Friday after 15:00
```

### Example output — `atlas stats --calibrate atlas 30`

```
Time calibration for "atlas" (30 min proposed)
Historical sessions: 23   Confidence: high
Calibration factor:  1.4x (you typically run 40% over)
Adjusted estimate:   42 min
```

---

## Dashboard Integration

### New AnalyticsView (preferred approach)

Add `AnalyticsView` as a new view state in the Ink dashboard state machine
(`src/cli/dashboard-ink/lib/stateMachine.ts`), accessible via keyboard shortcut `a`.

```
Dashboard keys (updated):
  f = Focus       T = Timeline    z = Zen
  e = Ecosystem   p = Plan        a = Analytics   ? = Help
```

`AnalyticsView` layout (SPLIT mode):
- **Left panel:** Velocity sparkline + 4-week table
- **Right panel:** Pattern heatmap (hour × day grid, color = flow rate)

### Alternative: extend EcosystemView

If AnalyticsView adds too much state-machine complexity for v0.10.0 MVP, add an
Analytics sub-tab inside EcosystemView (Tab key cycles sub-tabs). Defer to
implementation decision.

### Data hooks

| Hook | Refresh | Source |
|---|---|---|
| `useVelocity()` | 60s | `VelocityCalculator` over last 28 days |
| `usePatterns()` | 300s | `PatternAnalyzer` over last 90 days |

Hooks follow the same stale-while-revalidate pattern as existing v0.9.2 hooks
(`useRef` for last-good data, stderr logging on error).

---

## Test Plan

All three classes must be tested independently (no repository I/O in unit tests).
Test files go in `test/unit/utils/`.

### VelocityCalculator tests (`VelocityCalculator.test.js`)

- [ ] Returns 4 weeks when given 4+ weeks of sessions
- [ ] Returns fewer weeks when history is short
- [ ] Computes focusHours correctly (sum of durations in hours)
- [ ] Consistency = distinct days / 7
- [ ] Trend = `'up'` when recent 2 weeks exceed earlier 2 weeks by >10%
- [ ] Trend = `'down'` when recent 2 weeks lag earlier 2 weeks by >10%
- [ ] Trend = `'stable'` within ±10%
- [ ] Empty array returns stable defaults
- [ ] Sessions with null duration are skipped

### PatternAnalyzer tests (`PatternAnalyzer.test.js`)

- [ ] bestDay is the day with highest flow rate (>= 3 observations)
- [ ] bestHour is the hour with highest flow rate (>= 3 observations)
- [ ] Slots with < 3 sessions excluded from bestDay/bestHour ranking
- [ ] deadZones excludes slots with flowRate > 0
- [ ] deadZones excludes slots with sessionCount < 3
- [ ] flowRateByHour and flowRateByDay cover all 24 hours and 7 days
- [ ] Empty array returns null fields

### PredictionEngine tests (`PredictionEngine.test.js`)

- [ ] Returns 1.0 factor with zero history for project
- [ ] Factor increases when historical sessions run long
- [ ] Factor decreases when historical sessions run short
- [ ] Bayesian prior pulls extreme factors toward 1.0 (test with n=1)
- [ ] Confidence = `'low'` for n < 5
- [ ] Confidence = `'medium'` for 5 <= n < 10
- [ ] Confidence = `'high'` for n >= 10
- [ ] Throws RangeError for proposedDurationMinutes <= 0
- [ ] Outlier sessions (>3σ) excluded from mean

### Integration smoke test

- [ ] `atlas stats --velocity` exits 0 and prints "Velocity" heading
- [ ] `atlas stats --patterns` exits 0 and prints "Productivity patterns"
- [ ] `atlas stats --calibrate <project> 30` exits 0 with valid numeric output

---

## v0.10.0 Scope Table

| Feature | v0.10.0 MVP | Deferred to v0.11 |
|---|---|---|
| VelocityCalculator core logic | Yes | — |
| PatternAnalyzer core logic | Yes | — |
| PredictionEngine core logic | Yes | — |
| `atlas stats --velocity` CLI flag | Yes | — |
| `atlas stats --patterns` CLI flag | Yes | — |
| `atlas stats --calibrate` CLI flag | Yes | — |
| Unit tests for all 3 utils | Yes | — |
| AnalyticsView in Ink dashboard | Yes (stretch goal) | If too complex, defer |
| `useVelocity` / `usePatterns` hooks | With AnalyticsView | If view deferred |
| Dead-zone calendar export (iCal) | No | v0.11 |
| Multi-project calibration comparison | No | v0.11 |
| Outlier drill-down in CLI | No | v0.11 |
| ML-based pattern detection | No | v0.11+ |
| PredictionEngine persistence (save calibration) | No | v0.11 |
