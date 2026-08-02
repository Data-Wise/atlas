# What's New in Atlas

Release highlights for each version. See the [full changelog](https://github.com/Data-Wise/atlas/blob/main/CHANGELOG.md) for complete details.

---

## v0.18.1 — `sync --from-status` hardened against non-numeric priorities

!!! success "Non-numeric `priority:` values no longer crash the sync"
    A `.STATUS` file written in YAML frontmatter with a non-numeric `priority:` (e.g. `priority: P1`)
    used to crash the sync with a `TypeError`. Non-numeric priorities are now normalized to the
    numeric 1-3 scale (default `3`, with the raw label preserved), and the sync gained end-to-end
    and dogfood regression coverage.

---

## v0.18.0 — Dashboard Nudge Awareness

!!! success "See fired reminders without leaving `atlas dash`"
    The Now view now surfaces fired-but-unacked wall-clock nudges directly — a banner (up to 3
    fired nudges + `+N more`), `●N`/`○N` fired/pending badges on the sidebar, and a status-bar
    chip visible from every view. Press `a` in Now to ack every fired nudge in one keystroke.

See `docs/specs/SPEC-dashboard-nudge-awareness-2026-08-01.md` in the repo for the full design,
including the poll/ack race hazard the implementation guards against.

---

## v0.17.0 — Wall-Clock Nudges & Multi-Repo Day Activity

!!! success "Reminders that actually fire, and a cross-repo memory aid"
    `atlas nudge add "23:00" "wrap up"` schedules a reminder that fires as a real macOS
    notification via `launchd` — even with every Claude surface fully closed. `atlas day`
    rolls up commits, `.STATUS` changes, and tracked session time across your four project
    trees for a given date, feeding tools like savant's `research-day-log` skill.

See `docs/specs/SPEC-cross-surface-nudges-and-day-activity-2026-08-01.md` in the repo for the
full design, including two real bugs found via live end-to-end testing (a `launchd` PATH
resolution issue, and a macOS Notification Alert Style gotcha — both documented in
`docs/CLI-REFERENCE.md`'s Wall-Clock Nudges section).

---

## v0.16.0 — ADHD-Friendly Docs-Site Redesign

!!! success "Same information, easier to scan"
    The docs site nav collapsed from 7 tabs to Home + 4 color pills (Learn/Do/Build/Code) with a
    sidebar search filter, the sidebar is now a single-open accordion with item counts, and the
    homepage leads with a 6-card grid and a scannable chip row instead of a table.

See `docs/specs/PROPOSAL-docs-site-design-audit-2026-07-19.md` in the repo for the full rationale.

---

## v0.15.0 — XDG Base Directory Support

!!! success "New installs get a tidier home; existing ones are untouched until you say so"
    Atlas now follows the XDG Base Directory convention by default — `~/.atlas` still works exactly as before, and moving is always your choice.

### `atlas migrate --xdg`

```bash
atlas migrate --xdg              # dry-run — shows what would move
atlas migrate --xdg --apply      # actually move it
```

Relocates `~/.atlas` to `$XDG_CONFIG_HOME/atlas` (or `~/.config/atlas`). Refuses to overwrite an existing target, and won't run out from under a live `atlas-mcp`/`atlas dash` (guarded by a process lock — `--force` overrides a stale one). See [Migrating to the XDG location](CONFIGURATION.md#migrating-to-the-xdg-location).

### `atlas doctor` nudge

If you're still on the legacy path, `atlas doctor` mentions it — informational only, never a warning. `doctor --fix --write` can apply the move for you through the same guarded path.

---

## v0.14.0 — TUI Consolidation & Evidence-Linked Workflow

!!! success "3 views, not 8 — plus a status-file schema that won't rot"
    The dashboard got smaller and the workflow got sharper: one digest command, one canonical `.STATUS` format, one Pomodoro implementation.

### The bare `atlas` digest

```bash
atlas    # no args — "what am I doing / what's next", right now
```

`atlas plan` and `atlas where` are now views onto the same digest data instead of separate code paths.

### Evidence-linked session end

`atlas session end` shows the git delta for the session and auto-syncs the registry — no more guessing what actually got done.

### `.STATUS` atlas/v1 frontmatter

Canonical YAML frontmatter schema (see [.STATUS Schema](STATUS-SCHEMA.md)). Legacy `## Status:` / `## Progress:` markdown headers still read correctly — nothing is silently rewritten.

```bash
atlas migrate --status [path]              # dry-run: field-level diff
atlas migrate --status [path] --apply      # writes canonical frontmatter
atlas migrate --status [path] --all-scanned --apply   # batch a directory tree
```

### 3-view dashboard (Now / Timer / Plan)

8 views collapsed to 3, 8 state-machine states to 3, one Pomodoro implementation (was 3), a single `lib/keymap.ts` source of truth, and a new `?` help overlay. See [Architecture](ARCHITECTURE.md) and [REFCARD](REFCARD.md#keyboard-shortcuts-dashboard) for the full keymap.

### SwiftBar plugin

A menu-bar digest that doesn't need the dashboard open — see [SwiftBar](user-guide/swiftbar.md).

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


---

**Now what?** → [Roadmap](./ROADMAP.md)
