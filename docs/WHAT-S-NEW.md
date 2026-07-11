# What's New in Atlas

Release highlights for each version. See the [full changelog](https://github.com/Data-Wise/atlas/blob/main/CHANGELOG.md) for complete details.

---

## v0.13.1 — YAML Passthrough & Inbox Flags

!!! success "Bug Fixes & Enhancements"
    - **YAML passthrough (#65)** — `StatusFileGateway` uses `yaml.stringify()`/`yaml.parse()` instead of hand-rolled template; unknown fields (research metadata, custom fields like `venue`, `tasks`) survive read-write round-trip
    - **`atlas inbox --type`** — filter captures by type (`idea`, `task`, `bug`, `note`, `question`, `parked`, `win`)
    - **`atlas inbox --limit`** — cap the number of items returned
    - **Win capture type** — `'win'` added to `Capture.TYPES` for quick-win tracking
    - **E2E tests** — 6 new tests covering inbox flags, YAML round-trip, and help output
    - **Man pages** — 4 man pages: `atlas(1)`, `atlas-session(1)`, `atlas-project(1)`, `atlas-status(1)`
    - **Zsh completions** — full rewrite with 26 commands, all subcommands, dynamic project/template completion

---

## v0.13.0 — Task CLI, Schedule Push & Agenda

!!! success "Task Management + Analytics Dashboard"
    Two major additions: a native task CLI for CRUD operations, and a full-screen analytics view in the dashboard.

### Task CLI

Manage tasks directly from the command line:

```bash
atlas task add "Implement OAuth" --priority high --project myapp
atlas task list --incomplete --project myapp
atlas task done <task-id>
atlas task rm <task-id>
```

Filters: `--completed`, `--incomplete`, `--overdue`, `--due-soon`.

### Schedule Push

Receive pre-normalized dated records from external tools (e.g., flow-cli agenda):

```bash
atlas schedule push --format json --data '[{"date":"2026-07-04","label":"Write docs","source":"flow-cli"}]'
```

### Merged Agenda

Chronological view merging native tasks + pushed schedule records:

```bash
atlas agenda          # Default: 7-day window
atlas agenda 14       # Custom window (days)
atlas agenda --format json
```

### AnalyticsView Dashboard

Press `a` in the dashboard for deep productivity insights:

- **Focus Velocity** — 30-day ASCII sparkline, trend indicator, and 4-week summary table
- **Flow Patterns** — 7×24 hour-day heatmap for productivity distribution, including best day/hour and dead zone callouts
- **Navigation** — Tab-locked single-panel layout with project cycling (← →) and quick-links to Focus (`f`) and Detail (`Enter`)

### StatusBar

Unified 3-zone status bar for the Ink dashboard:

- **Session Zone** — Active session dot, project name, and elapsed timer
- **Key Hints Zone** — Context-aware key-binding hints for the current view state
- **Layout Zone** — Current layout mode icon and pending capture count

### Other

- **CLI project remove fix** — Case-insensitive name resolution; handles duplicate collisions with path/UUID disambiguation
- **Testing infrastructure** — Vitest + `ink-testing-library` for component-level E2E, Playwright for CLI subprocess E2E

---

## v0.12.2 — ESLint Adoption

- **ESLint flat config** — `eslint.config.js` lints all plain-JS sources + tests
- **CI lint gate** — `Lint` job on every PR; exits non-zero on errors
- **Zero-warning cleanup** — all 135 pre-existing `no-unused-vars` warnings pruned

## v0.12.1 — Node 26 + Stability

- **Node 26 support** — `better-sqlite3` bumped to `^12.11.1`
- **FW-30 id convergence** — plain `atlas sync` resolves by path, avoiding duplicates
- **PatternAnalyzer crash fix** — unparseable `startTime` strings skipped
- **+42 edge tests** across research-sync and temporal-intelligence modules

## v0.12.0 — Research-Safe Sync

- **`atlas sync --research`** — research-aware alias (defaults to `~/projects/research`)
- **Plain-sync warning** — names research projects it preserved-but-skipped
- **`.atlas-scan-children` marker** — opt-in umbrella scanning for monorepo layouts
- **Venue comment strip** — `CSDA # was JASA` → `CSDA`

## v0.11.0 — Research Registry + Doctor

- **Research registry** — `sync --from-status` parses `kind:`, `target:`/`venue:`, `tasks:` from research `.STATUS` files
- **`atlas project list --kind manuscript|program|package`** — filter by project type
- **`atlas doctor`** — read-only audit of the Project Settings Contract with `--fix`
- **`project list --json`** — now also returns `progress`, `next`, `priority`

## v0.10.0 — Temporal Intelligence

- **`atlas stats --velocity`** — 4-week rolling velocity: sessions/week, focus hours, trend arrow
- **`atlas stats --patterns`** — Productivity patterns from 90 days: best day, best hour, dead zones
- **`atlas stats --calibrate <project> --minutes <n>`** — Bayesian time calibration with confidence level

## v0.9.3 — flow-cli Integration

- **`session status --format json`** — structured output for shell scripting
- **`project list --count` / `--suggest`** — bare count and most-recent active project
- **`inbox --count`** — pending inbox count for shell badges
- **`trail --limit <n>`** — cap breadcrumbs to the N most recent

## v0.9.2 — Real Data Pipeline

- **4 React Hooks** — `useProjects`, `useActiveSession`, `useProjectStats`, `usePendingCaptures`
- **AtlasContext** — DI Container injected via React Context
- **Smart Filtering** — removes tmp.*, archived, duplicates
- **Polling** — Projects 5s, Session 5s + 1s tick, Stats/Captures 10s

## v0.9.1 — Visual Enhancements

- **Theme System** — 5 themes (default, nord, solarized, mono, high-contrast)
- **Focus Score** — weighted quality metric with tier classification (● deep, ◕ strong, ◑ steady, ◔ warming, ○ drift)
- **Sidebar Sparklines** — 5-day activity charts with trend coloring
- **Activity Heatmap** — GitHub-style grid in full and compact modes

## v0.9.0 — Ink TUI Modernization

- **React Ink** replaces blessed (7 views migrated)
- **LayoutManager** — SINGLE/SPLIT/TRIPLE modes (`Tab` key)
- **SidebarPanel + InspectorPanel** with live Pomodoro timer
- **73% code reduction** in dashboard layer

## v0.8.0 — Ecosystem Hub & Morning Ritual

- **`atlas plan`** — Guided daily planning with energy tracking
- **`atlas sync --from-status`** — Import from .STATUS files
- **EcosystemView** (`e` key) — Cross-project dashboard
- **PlanView** (`p` key) — Morning ritual in dashboard

## v0.7.0 — Session Export & Task-Based Focus

- **`atlas session export`** — Export to iCal/ICS format
- **Task-Based Focus** — Pomodoro with task prompts and outcome tracking
- **Timeline View** (`T` key) — Visual time blocks for today

---

[:material-arrow-left: Back to Home](index.md)
