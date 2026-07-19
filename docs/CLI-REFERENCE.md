# Atlas CLI Command Reference

Complete reference for all Atlas CLI commands, options, and usage examples.

## Installation

### Homebrew (macOS)

```bash
brew tap data-wise/tap
brew install atlas
```

### Direct Install (curl)

```bash
curl -fsSL https://raw.githubusercontent.com/Data-Wise/atlas/main/install.sh | bash
```

### From Source

```bash
git clone https://github.com/Data-Wise/atlas.git
cd atlas && npm install
npm link  # Makes 'atlas' available globally
```

---

## Global Options

```bash
atlas [OPTIONS] <command> [arguments]

Options:
  --storage <type>    Storage backend: 'filesystem' (default) or 'sqlite'
  -V, --version       Show version number
  -h, --help          Show help
```

---

## Core 5 (start here)

Five commands cover most day-to-day use. Everything else is a **Power** command (used
occasionally) or a **Legacy** command (kept for compatibility) — both are collapsed below
their normal section so this page stays scannable.

| Command | What it does | Full docs |
|---------|---------------|-----------|
| `atlas init` | One-time setup of `~/.atlas` | [Initialization & Templates](#initialization-templates) |
| `atlas session start <project>` | Begin a tracked work session | [Session Management](#session-management) |
| `atlas catch "idea"` | Capture a thought without breaking flow | [Quick Capture](#quick-capture) |
| `atlas` (no arguments) | The digest — one glanceable "what am I doing / what's next" screen | [The Digest](#the-digest-atlas-no-arguments) |
| `atlas session end` | Close the session with a "good enough" summary | [Session Management](#session-management) |

!!! tip "Core loop"
    ```bash
    atlas init
    atlas session start myproject
    atlas catch "check X later"
    atlas session end "shipped the thing"
    ```

!!! note "No `flush` command yet"
    `atlas flush` (vault write-through queue drain) is scaffolded on a held feature branch and
    ships when the Obsidian `obs write` dependency lands — see
    `docs/specs/SPEC-obsidian-captures-scope-2026-07-19.md`.

## The Digest (`atlas` — no arguments)

Running `atlas` with no arguments prints the digest: one glanceable screen answering
"what am I doing / what's next," merging the read paths of `where`, `plan`, and `status`.

```
📋 ATLAS DIGEST
────────────────────────────────────────
🎯 Active: atlas (12m)
📁 Project: atlas
   Focus: WS3 digest implementation
   Next: ship the digest
📥 Inbox: 3
🔥 Streak: 4

💡 Suggestions:
   → P1 focus: atlas (atlas session start atlas)
```

`where`, `plan`, `session status --format json`, `inbox --count`, and `trail --limit`
keep their existing exact output (the flow-cli contract) — the digest is additive.

**Happy path (v0.14.0):** `atlas` → `atlas session start <project>` → `atlas session end`.

---

## Project Management

### `atlas project add`

Register a project in the Atlas registry.

```bash
atlas project add [path] [options]

Options:
  -t, --tags <tags>         Comma-separated tags
  -s, --status <status>     Initial status (active|paused|blocked|archived|complete)
  --description <text>      Project description
```

**Examples:**
```bash
# Register current directory
atlas project add

# Register specific path with tags
atlas project add ~/projects/myapp --tags=node,active

# Register with status and description
atlas project add ./api --status active --description "REST API service"
```

### `atlas project list`

List all registered projects.

```bash
atlas project list [options]

Options:
  -s, --status <status>    Filter by status
  -t, --tag <tag>          Filter by tag
  --kind <kind>            Filter by kind (manuscript|program|package) — research registry
  --format <format>        Output format: table (default), json, names
  --count                  Print only the number of matching projects
  --suggest                Print the single most-recently-touched active project
```

**Examples:**
```bash
# List all projects as table
atlas project list

# List active projects only
atlas project list --status active

# List projects with specific tag
atlas project list --tag r-package

# Get project names for scripting
atlas project list --format names

# Count matching projects (e.g. active project count)
atlas project list --status active --count

# Suggest one project to work on (most recent active)
atlas project list --suggest

# Research registry: list programs/manuscripts; JSON carries kind/target/taskCount/progress/next/priority
atlas project list --kind program
atlas project list --kind manuscript --format json
```

### `atlas project show`

Show detailed information about a project.

```bash
atlas project show <name> [options]

Options:
  --format <format>    Output format: table (default), json, shell
```

**Examples:**
```bash
# Show project details
atlas project show myproject

# Get JSON output for parsing
atlas project show myproject --format json

# Shell-friendly output for scripts
atlas project show myproject --format shell
```

### `atlas project remove`

Unregister a project from Atlas by its name (case-insensitive) or project path/ID (does not delete files).

```bash
atlas project remove <name-or-id>
```

**Behavior:**
*   **Case-Insensitive Resolution**: Matches registered projects by name case-insensitively.
*   **UUID/Path Fallback**: Falls back to direct path/ID matching if no name matches.
*   **Ambiguity Guard**: If multiple registered projects share the same name, Atlas aborts and lists conflicting paths/IDs to avoid accidental deletion.

**Example:**
```bash
# Remove by name
atlas project remove old-project

# Remove by ID/path (e.g. if names collide)
atlas project remove /Users/dt/projects/old-project
```

---

## Session Management

### `atlas session start`

Start a new work session.

```bash
atlas session start [project] [options]

Arguments:
  project    Project name (optional if in project directory)

Options:
  -t, --task <task>           Task description
  -e, --estimate <minutes>    Estimated duration in minutes
  --energy <level>            Energy level: high, medium, low
```

**Examples:**
```bash
# Start session for current project
atlas session start

# Start session with project name
atlas session start myproject

# Start with task description
atlas session start myproject -t "Implement user authentication"

# Start with estimate and energy level
atlas session start myproject -t "Fix bug" -e 30 --energy high
```

**Output includes:**
- Context restoration ("Last time you were...")
- Current streak display
- Session start confirmation

### `atlas session end`

End the current work session.

```bash
atlas session end [note]

Arguments:
  note    Optional session summary or note
```

**Examples:**
```bash
# End session without note
atlas session end

# End with summary
atlas session end "Completed login flow, needs testing"
```

**Output includes:**
- Session duration
- **Evidence** (v0.14.0): the git delta since session start — commits and files touched,
  computed via the project's git history. Non-git projects, or sessions with zero commits,
  degrade gracefully (no evidence block, or an explicit "no commits" line).
- If stdin is a TTY, one confirm prompt for the outcome (`completed`/`cancelled`/`interrupted`,
  default `completed`). Non-interactive runs (CI, flow-cli, piped input) keep the prior
  default-completed behavior unchanged.
- A registry sync scoped to the session's project runs automatically after the session ends —
  no more manual `atlas sync --from-status` to keep the registry current.
- Celebration message
- Streak update

### `atlas session status`

Show current session status.

```bash
atlas session status [options]

Options:
  --format <format>     Output format: table (default), json
```

**Output includes:**
- Active session project and task
- Duration and flow state
- Or "No active session" message

**JSON output** (`--format json`) emits a single object for scripting, or `null` when no session is active:

```json
{ "project": "atlas", "durationMinutes": 42, "state": "active", "task": "spec writing", "startedAt": "2026-06-13T09:14:00.000Z" }
```

### `atlas session export`

Export sessions to iCal/ICS format for calendar apps.

```bash
atlas session export [file] [options]

Arguments:
  file    Output file path (defaults to stdout or auto-named file)

Options:
  -d, --days <n>        Number of days to export (default: 30)
  -p, --project <name>  Filter by project name
  --period <period>     Preset period: week, month, year, all
  --format <format>     Output format: ical (default), json
```

**Examples:**
```bash
# Export last 30 days to iCal file
atlas session export sessions.ics

# Export to stdout (for piping)
atlas session export

# Export last week
atlas session export --period week

# Export specific project sessions
atlas session export --project myproject -d 60 project-sessions.ics

# Export as JSON
atlas session export --format json > sessions.json
```

**iCal Output:**
- Standard RFC 5545 format
- Compatible with Apple Calendar, Google Calendar, Outlook
- Each session becomes a calendar event
- Event summary includes project name
- Event description includes session notes

### `atlas stats`

Show session analytics and productivity insights.

```bash
atlas stats [period] [options]

Arguments:
  period    Preset period: 'week' (7 days), 'month' (30 days)

Options:
  -d, --days <n>        Custom number of days to analyze (default: 7)
  -p, --project <name>  Filter analytics by project
  --format <format>     Output format: table (default), json, text, md
  -e, --export [file]   Export to file (auto-names if no file given)

Temporal Intelligence (v0.10.0):
  --velocity            4-week rolling velocity: sessions/week, focus hours, trend
  --patterns            Productivity patterns from last 90 days (best day/hour, dead zones)
  --calibrate <proj>    Time calibration factor for a project (use with --minutes)
  --minutes <n>         Proposed duration in minutes for --calibrate (default: 30)
```

**Examples:**
```bash
# Weekly summary (default)
atlas stats

# Monthly summary
atlas stats month

# Last 2 weeks
atlas stats --days 14

# Specific project analytics
atlas stats --project myproject

# JSON output for scripting
atlas stats --format json

# Concise text summary
atlas stats --format text

# Markdown format
atlas stats --format md

# Export to auto-named file (atlas-stats-YYYY-MM-DD.md)
atlas stats --export

# Export to specific file
atlas stats --export weekly-report.md

# Export JSON data
atlas stats --format json --export stats.json

# Export monthly report
atlas stats month --export monthly-review.md

# Velocity trend (last 4 complete weeks)
atlas stats --velocity

# Productivity patterns (best day/hour, dead zones)
atlas stats --patterns

# Time calibration for a project (30 min proposed)
atlas stats --calibrate atlas --minutes 30
```

**Output includes:**
- Total sessions and time
- Daily average duration
- Flow sessions percentage (sessions ≥ 15 min)
- Completion rate
- Current and longest streak
- Best day highlight
- Focus score with tier classification (v0.9.1)
- Per-project breakdown (when not filtering)

**Table Output Example:**
```
Session Analytics (Last 7 Days)
═══════════════════════════════════════════════════

  Total Sessions:    12
  Total Time:        8h 45m
  Daily Average:     1h 15m
  Flow Sessions:     8 (67%)
  Completion Rate:   75%

  Focus Score:       ◕ 72 strong
  Streak:            🔥 3 days (longest: 15)
  Best Day:          Tuesday (2h 30m)

  By Project:
  ┌──────────────┬──────────┬─────────┬──────────┐
  │ Project      │ Sessions │ Time    │ Flow %   │
  ├──────────────┼──────────┼─────────┼──────────┤
  │ atlas        │ 5        │ 3h 20m  │ 80%      │
  │ flow-cli     │ 4        │ 2h 45m  │ 75%      │
  └──────────────┴──────────┴─────────┴──────────┘
```

**Focus Score** (v0.9.1) is a weighted quality metric:

| Component | Weight | What it measures |
|-----------|--------|------------------|
| Duration | 30% | Average session length (45m = excellent) |
| Flow | 30% | Percentage of flow sessions (≥15 min) |
| Completion | 25% | Session completion rate |
| Consistency | 15% | Streak-based regularity |

Tiers: ● deep (80+), ◕ strong (60-79), ◑ steady (40-59), ◔ warming (20-39), ○ drift (0-19)

---

## Status & Progress

### `atlas status`

Show or update project status.

```bash
atlas status [project] [options]

Options:
  --set <status>           Set status (active|paused|blocked|archived|complete)
  --progress <percent>     Set progress (0-100)
  --focus <text>           Set current focus/checkpoint
  --next <actions>         Set next actions (comma-separated)
  --complete               Mark current action as done
  --then <action>          Add action after completing current
  --increment <amount>     Increase progress (default: 10)
  --create                 Create .STATUS file if missing
```

**Examples:**
```bash
# Show global workflow status
atlas status

# Show specific project status
atlas status myproject

# Update project status
atlas status myproject --set active --progress 50

# Set next actions
atlas status myproject --next "Write tests,Update docs"

# Complete current action and set next
atlas status myproject --complete --then "Deploy to staging"

# Increment progress by 10%
atlas status myproject --increment

# Increment by specific amount
atlas status myproject --increment 25
```

**`--complete` evidence (v0.14.0):** when completing a next action, `--complete` records
closing evidence into the `.STATUS` `metrics.closingEvidence` block — the active session id
(if any) and the current git HEAD sha (if the project is a git repo). "Done" backed by
evidence, not an unchecked claim.

### `atlas focus`

Get or set project focus.

```bash
atlas focus <project> [text]

Arguments:
  project    Project name
  text       Focus text (optional, omit to get current focus)
```

**Examples:**
```bash
# Get current focus
atlas focus myproject

# Set new focus
atlas focus myproject "Optimizing database queries"
```

---

## Quick Capture

### `atlas catch`

Quickly capture an idea, task, or note.

```bash
atlas catch <text> [options]
atlas catch <project> <text>

Options:
  -p, --project <name>    Associate with project
  -t, --type <type>       Capture type: idea (default), task, bug, note, question
```

**Examples:**
```bash
# Quick capture
atlas catch "Check VanderWeele 2015 appendix"

# Capture for specific project
atlas catch myproject "Add input validation"

# Capture as bug
atlas catch "Login fails on Safari" --type bug

# Capture as task
atlas catch --project api "Implement rate limiting" --type task
```

### `atlas inbox`

View and manage captured items.

```bash
atlas inbox [options]

Options:
  -p, --project <name>    Filter by project
  --type <type>           Filter by capture type (idea, task, bug, note, question, parked, win)
  --limit <n>             Maximum items to return
  --stats                 Show inbox statistics
  --count                 Print only the pending inbox count
  --triage                Interactive triage mode
```

**Examples:**
```bash
# Show all inbox items
atlas inbox

# Show items for specific project
atlas inbox --project myproject

# Show only win captures
atlas inbox --type win

# Show latest 5 items
atlas inbox --limit 5

# Show only tasks, limited to 10
atlas inbox --type task --limit 10

# Show statistics
atlas inbox --stats

# Start interactive triage
atlas inbox --triage
```

---

## Context & Breadcrumbs

### `atlas where`

Show current context ("Where was I?").

```bash
atlas where [project]

Arguments:
  project    Project name (optional)
```

**Examples:**
```bash
# Show global context
atlas where

# Show project-specific context
atlas where myproject
```

**Output includes:**
- Current focus
- Active session info
- Recent breadcrumbs
- Recent captures

### `atlas crumb` ⚠️ Deprecated

> **Deprecated (v0.14.0), removal planned v0.15.0.** Folds into session notes —
> use `atlas session note <text>` instead. `crumb` still works and prints a
> one-line stderr pointer; output is otherwise unchanged.

Leave a breadcrumb marker for later context.

```bash
atlas crumb <text> [options]

Options:
  -p, --project <name>    Associate with project
```

**Examples:**
```bash
# Leave a breadcrumb
atlas crumb "Stuck on variance estimation"

# Breadcrumb for specific project
atlas crumb "Need to refactor auth module" --project api
```

### `atlas trail` ⚠️ Deprecated

> **Deprecated (v0.14.0), removal planned v0.15.0.** Use bare `atlas` (the digest) or
> `atlas where` instead. `trail` still works and prints a one-line stderr pointer; its
> `--limit`/JSON-adjacent output is unchanged (flow-cli contract, `trail --limit`
> stays byte-compatible until flow-cli releases off it).

View breadcrumb trail.

```bash
atlas trail [project] [options]

Options:
  -d, --days <number>    Days to look back (default: 7)
  --limit <n>            Max breadcrumbs to show (most recent first)
```

**Examples:**
```bash
# Show recent trail
atlas trail

# Show project-specific trail
atlas trail myproject

# Show last 30 days
atlas trail --days 30

# Show only the 5 most recent breadcrumbs
atlas trail --limit 5
```

---

## Daily Planning (v0.8.0+)

### `atlas plan`

Start the morning ritual - a guided daily planning flow.

```bash
atlas plan [options]

Options:
  --ecosystem <path>    Scan ecosystem path for project statuses
  --json                Output as JSON
```

**Examples:**
```bash
# Start morning planning ritual
atlas plan

# Include ecosystem scan
atlas plan --ecosystem ~/projects/dev-tools

# Output plan as JSON
atlas plan --json
```

**The planning ritual includes:**
- Yesterday's work summary
- Current streak display
- Inbox items for quick triage
- Smart suggestions for today
- Energy level selection (high/medium/low)
- Focus selection for the day

**Output:**
```
🌅 Morning Planning Ritual
═══════════════════════════════════════════════════

Yesterday's Sessions:
  atlas     2h 15m  ████████████░░░░  Completed: Phase 5 dashboard
  flow-cli  45m     █████░░░░░░░░░░░  WIP: Template system

🔥 Current streak: 5 days

📥 Inbox (3 items):
  • Check VanderWeele appendix (idea)
  • Add rate limiting (task)
  • Safari login bug (bug)

💡 Suggestions:
  → Continue atlas session (2h 15m yesterday)
  → Triage 3 inbox items

Energy level today? [H]igh / [M]edium / [L]ow
```

---

## Task Management (v0.13.0+)

### `atlas task`

Manage tasks with CRUD operations.

```bash
atlas task [command]

Commands:
  add <description>    Add a new task
  list [options]       List tasks
  done <id>            Mark task as completed
  rm <id>              Delete a task
```

### `atlas task add`

Add a new task.

```bash
atlas task add <description> [options]

Options:
  -p, --priority <level>    Priority: low, medium, high (default: medium)
  --due <date>              Due date (YYYY-MM-DD)
  --project <name>          Associate with project
```

**Examples:**
```bash
# Simple task
atlas task add "Write documentation"

# High priority with due date
atlas task add "Fix login bug" --priority high --due 2026-07-10

# Project-specific
atlas task add "Add tests" --project myapp --priority medium
```

### `atlas task list`

List tasks with optional filters.

```bash
atlas task list [options]

Options:
  --completed          Show completed tasks only
  --incomplete         Show incomplete tasks only
  --overdue            Show overdue tasks only
  --due-soon           Show tasks due soon only
  --project <name>     Filter by project
  --format <format>    Output format: table (default), json
```

**Examples:**
```bash
# All incomplete tasks
atlas task list --incomplete

# Overdue tasks for a project
atlas task list --overdue --project myapp

# JSON output
atlas task list --format json
```

### `atlas task done`

Mark a task as completed.

```bash
atlas task done <task-id>
```

### `atlas task rm`

Delete a task.

```bash
atlas task rm <task-id>
```

---

## Schedule & Agenda (v0.13.0+)

### `atlas schedule push`

Push schedule data from external tools (e.g., flow-cli agenda).

```bash
atlas schedule push [options]

Options:
  --data <json>        JSON data payload (array of schedule records)
  --format <format>    Output format (default: json)
```

**Schedule record format:**
```json
[
  {
    "date": "2026-07-04",
    "label": "Write documentation",
    "type": "task",
    "source": "flow-cli",
    "priority": "high"
  }
]
```

**Examples:**
```bash
# Push schedule data
atlas schedule push --data '[{"date":"2026-07-04","label":"Write docs","source":"flow-cli"}]'
```

### `atlas agenda`

Show a merged chronological view of tasks and pushed schedule records.

```bash
atlas agenda [window-days] [options]

Arguments:
  window-days    Number of days to include (default: 7)

Options:
  --format <format>    Output format: table (default), json
```

**Examples:**
```bash
# Default 7-day window
atlas agenda

# 14-day window as JSON
atlas agenda 14 --format json
```

---

## Context Parking (v0.5.1+)

> **Deprecated (v0.14.0), removal planned v0.15.0.** `park`/`unpark`/`parked` fold into a
> single parking concept on Capture (session pause stays `session pause`). All three still
> work and print a one-line stderr pointer; output is otherwise unchanged.

### `atlas park` ⚠️ Deprecated

Park current context for later restoration.

```bash
atlas park [note] [options]

Options:
  -f, --force           Park even without active session
  -k, --keep-session    Park but keep session running
```

**Examples:**
```bash
# Park with note
atlas park "switching to urgent bug fix"

# Park but keep session running
atlas park --keep-session "quick context save"

# Force park without active session
atlas park --force "saving context"
```

**Saved context includes:**
- Project name
- Current task
- Session duration
- Recent breadcrumbs
- Park note

### `atlas parked` ⚠️ Deprecated

List all parked contexts.

```bash
atlas parked
```

**Output shows:**
- Context ID
- Project name
- Task
- Duration at park time
- Park note
- When parked

### `atlas unpark` ⚠️ Deprecated

Restore a parked context.

```bash
atlas unpark [id]

Arguments:
  id    Context ID (optional, defaults to most recent)
```

**Examples:**
```bash
# Restore most recent
atlas unpark

# Restore specific context
atlas unpark abc123
```

**Restoration includes:**
- Starts new session with saved project/task
- Shows "where you left off" summary

---

## Dashboard

### `atlas dashboard` / `atlas dash`

Launch the interactive TUI dashboard.

```bash
atlas dashboard
atlas dash
```

**Keyboard Shortcuts:**

| Key         | Action                                    |
| ----------- | ----------------------------------------- |
| `↑↓` / `j`/`k` | Navigate projects                     |
| `Enter`     | Open project detail                       |
| `Esc`       | Back / Exit current view                  |
| `a`         | Analytics view (v0.13.0)                  |
| `f`         | Enter focus mode (Pomodoro)               |
| `z`         | Zen mode                                  |
| `T`         | Timeline view (time blocks)               |
| `e`         | Ecosystem view (multi-project overview)   |
| `p`         | Plan view (morning ritual)                |
| `c`         | Quick capture                             |
| `t`         | Cycle themes                              |
| `Tab`       | Cycle layout: SINGLE → SPLIT → TRIPLE    |
| `Shift+Tab` | Cycle panel focus in split/triple layouts |
| `q`         | Quit                                      |
| `?`         | Show help                                 |

> **Note:** The legacy blessed dashboard (`atlas dash --blessed`) uses different
> bindings: `e` = End session, `s` = Start session, `p` = Filter paused,
> `a` = Filter active, `/` = Search.

**Focus Mode Keys:**

| Key     | Action             |
| ------- | ------------------ |
| `Space` | Pause/Resume timer |
| `r`     | Reset timer        |
| `+`     | Add 5 minutes      |
| `-`     | Subtract 5 minutes |
| `c`     | Quick capture      |
| `Esc`   | Exit focus mode    |

**Task-Based Focus (v0.7.0):**

When starting a Pomodoro:
1. Dashboard prompts "What will you focus on?"
2. Task is displayed during focus session
3. After timer completes, asks for completion status:
   - `c` - Completed
   - `p` - Partial progress
   - `n` - Pivoted to something else

**Timeline View (v0.7.0):**

Press `T` (Shift+T) to enter the time block view:
- Visual timeline of today's sessions
- Color-coded by project
- Shows session durations and gaps
- Helps identify work patterns

**Analytics View (v0.13.0):**

Press `a` to enter the full-screen analytics view:
- **Focus Velocity** — 30-day ASCII sparkline, trend indicator, and 4-week summary table
- **Flow Patterns** — 7×24 hour-day heatmap for productivity distribution, including best day/hour and dead zone callouts
- **Navigation** — Tab-locked single-panel layout with project cycling (← →)
- Quick-links to Focus (`f`) and Detail (`Enter`)

**Ecosystem View (v0.8.0):**

Press `e` to see all projects across your ecosystem:
- Scans ~/projects/dev-tools for .STATUS files
- Shows project status, progress, and priority
- Displays focus/next action for selected project
- Navigate with arrow keys, `Enter` for detail
- Useful for managing 10+ projects

**Plan View (v0.8.0):**

Press `p` to enter the morning planning ritual:
- Yesterday's session summary
- Current streak display
- Inbox items pending triage
- Smart suggestions based on history
- Helps start the day with intention

**Real Data (v0.9.2):**

The dashboard displays live data from `~/.atlas` via 4 React hooks with automatic polling:

| Data | Hook | Refresh |
|------|------|---------|
| Project list + focus scores | `useProjects` | 5s |
| Active session + elapsed timer | `useActiveSession` | 5s + 1s tick |
| Heatmap, streak, breadcrumbs | `useProjectStats` | 10s |
| Inbox count | `usePendingCaptures` | 10s |

Projects are filtered to remove temporary directories (`tmp.*`), archived entries, and duplicates.

**Multi-Panel Layout (v0.9.1):**

Press `Tab` to cycle through three layout modes:

```
▣ SINGLE (default) ▥ SPLIT             ▦ TRIPLE
┌─────────────┐     ┌────┬───────┬─────────┬────┐
│ Full View    │     │Side│ Main  │     │Side│ Main  │Inspector│
│              │     │    │       │     │    │       │         │
│ All 7 views  │     ┬────┴───────┘     ┴────┴───────┴─────────┴────┘
└─────────────┘     28% + 72%         25% + 47% + 28%
```

- **`Tab`** → cycles `Single → Split → Triple → Single`
- **`Shift+Tab`** → cycles keyboard focus between visible panels
- Layout mode indicator `▣/▥/▦` shown in command bar
- SINGLE mode is a transparent pass-through (no overhead)

**Sidebar Panel (Split and Triple modes):**

The sidebar shows a compact project list at 25–28% width:

```
┌────────────────────────┬ ...
│ Projects 5  📥2 │     <- header: count + inbox badge
├────────────────────────┤
│ ● atlas       75% ▂▃▅█│  <- focus tier + name + progress + sparkline
│ ◔ flow-cli    95% █▅▃▂│  <- ◔ warming tier (yellow)
│ ● mcp-server  80% ▃▃▅▆⏱│ <- ⏱ = has active session
│ ◑ rmediation  60% ▂▁░░│  <- ◑ steady tier (cyan)
├────────────────────────┤
│ j/k: nav Enter: open  │  <- focus hint (changes when inactive)
└────────────────────────┘
```

| Feature       | Detail                                                                      |
| ------------- | --------------------------------------------------------------------------- |
| Row format    | `tier name   xx% sparkline` (14-char name, 4-char progress, 5-char spark)  |
| Focus tiers   | `●` deep, `◕` strong, `◑` steady, `◔` warming, `○` drift (v0.9.1)        |
| Sparklines    | 5-day activity chart using ▁▂▃▄▅▆▇█ with trend coloring (v0.9.1)          |
| Session badge | `⏱` appended to row with a running timer                                    |
| Inbox badge   | `📥N` in header when N captures are unprocessed                              |
| Windowing     | 12 visible rows with scroll indicator `1-12/25`                             |
| Navigation    | `j`/`k` or `↑`/`↓`, only fires when sidebar has focus                       |
| Select        | `Enter` opens project in main panel                                         |

**Inspector Panel (Triple mode only — right column):**

Shows the selected project's detail, focus score, Pomodoro timer, and activity heatmap:

```
┌────────────────────────┐
│ Inspector              │  ← cyan when focused
├────────────────────────┤
│ 🎯 atlas               │  name (18-char trunc)
│ node-package           │  type
│ ● active  75% ██████░░ │  status + 8-char bar
│ Focus  ◕ 72 strong     │  focus score + tier (v0.9.1)
│ ────────────────────── │
│ Focus                  │
│ Implementing auth…     │  22-char trunc
│ Next                   │
│ · Add OAuth provider   │  up to 3 items
│ ────────────────────── │
│ ⏱ SESSION              │
│ 24:10  ██████░░        │  live countdown
│ ● FOCUSING             │  → ◑ PAUSED → ☕ BREAK TIME
│ ────────────────────── │
│ Activity (13w)         │  heatmap header (v0.9.1)
│ Mon ·░▒▓█·░▒▓█·░▒     │  7-day × 13-week grid
│ Tue ·····░░▒▒▓▓█       │  using ·░▒▓█ chars
│ ...                    │
│ Sun ░░·····░░▒▓█       │
│     less ·░▒▓█ more    │  legend
│ 🔥 4d streak  23 sess  │  summary line
│ ────────────────────── │
│ Recent                 │
│ · stuck on OAuth…      │  last 3 breadcrumbs
└────────────────────────┘
│ Space: pause r: reset  │  only when inspector focused
```

| Feature       | Detail                                                               |
| ------------- | -------------------------------------------------------------------- |
| Progress bar  | 8-char `████░░░░` (clamped 0-100)                                    |
| Focus score   | `◕ 72 strong` — weighted metric with tier symbol (v0.9.1)           |
| Timer         | MM:SS countdown from `pomodoroLength` (default 25 min)               |
| States        | `● FOCUSING` (green) → `◑ PAUSED` (yellow) → `☕ BREAK TIME` (yellow) |
| Heatmap       | 7-row × 13-col activity grid with 5-level Unicode chars (v0.9.1)    |
| `Space`       | Pause/resume (only when inspector is focused via Shift+Tab)          |
| `r`           | Reset timer (only when paused + inspector focused)                   |
| Empty state   | Shows "Select a project" when no project is selected                 |
| Breadcrumbs   | Newest-first, max 3 displayed                                        |
| Next actions | Parsed from `project.next` via comma or newline, max 3 shown         |

---

## Initialization & Templates

### `atlas init`

Initialize Atlas configuration.

```bash
atlas init [options]

Options:
  -g, --global              Initialize global config
  -t, --template <id>       Use project template
  -n, --name <name>         Project name for template
  --list-templates          List available templates
```

**Examples:**
```bash
# Initialize Atlas
atlas init

# List available templates
atlas init --list-templates

# Create project from template
atlas init --template node --name my-app

# Create R package
atlas init --template r-package --name mypackage
```

**Built-in Templates:**
- `node` - Node.js/npm package
- `r-package` - R package with roxygen2/testthat
- `python` - Python package with pytest
- `quarto` - Quarto document/presentation
- `research` - Academic research project
- `minimal` - Bare .STATUS file

### `atlas template list`

List all available templates.

```bash
atlas template list
```

### `atlas template show`

Display template content.

```bash
atlas template show <id>
```

### `atlas template create`

Create a custom template.

```bash
atlas template create <id> [options]

Options:
  -n, --name <name>           Template display name
  -d, --description <text>    Template description
  -f, --from <id>             Copy from existing template
  -e, --extends <id>          Inherit from template (v0.5.2+)
```

**Examples:**
```bash
# Create empty template
atlas template create my-template

# Copy from existing
atlas template create my-node --from node

# Extend existing (inherit + customize)
atlas template create custom-node --extends node
```

### `atlas template export`

Export built-in template for customization.

```bash
atlas template export <id>
```

### `atlas template delete`

Delete a custom template.

```bash
atlas template delete <id>
```

### `atlas template dir`

Show custom templates directory.

```bash
atlas template dir
```

---

## Sync & Registry

### `atlas sync`

Synchronize projects from .STATUS files.

```bash
atlas sync [options]

Options:
  -d, --dry-run           Preview without making changes
  -w, --watch             Watch mode (5s interval)
  -p, --paths <paths>     Comma-separated paths to scan
  --remove-orphans        Remove projects whose paths no longer exist
  --from-status           Scan for .STATUS files in ecosystem
  --research              Research-aware sync (alias for --from-status; defaults to ~/projects/research)
  --report                Show ecosystem summary without syncing
```

**Examples:**
```bash
# Sync from configured paths
atlas sync

# Preview sync
atlas sync --dry-run

# Watch for changes
atlas sync --watch

# Sync specific paths
atlas sync --paths ~/projects,~/work

# Scan ecosystem for .STATUS files
atlas sync --from-status

# Generate ecosystem status report
atlas sync --report

# Research registry: parse kind/target/tasks from research .STATUS
atlas sync --from-status --paths ~/projects/research

# Same thing, shorter (defaults to ~/projects/research)
atlas sync --research
```

> **Research registry:** with `--from-status`, atlas also parses `kind:` (manuscript|program|package), `target:`/`venue:`, `cran_state:` (package-kind only), and a `tasks:` block (proposals → task entries on the program). Surfaced via `project list --kind`, `--format json` (as `cranState`), and MCP `atlas_get_projects`. See [Research Registry](user-guide/tutorials/research-registry.md).
>
> **Ownership:** `--from-status` (or its `--research` alias) is the **authority** for research metadata — a plain `atlas sync` is packages-only and *preserves* existing `kind`/`target`/`cranState`/`tasks` but does not re-parse them, and now **warns**, naming the research projects it did not refresh, with the remedy. Re-run `--from-status` after editing a manuscript's `.STATUS`. *(Plain sync previously stripped these — fixed in 0.11.1, issue #36; ownership contract: docs-standards ADR-002.)*
>
> **Parse warnings:** `--from-status` surfaces (never blocks on) two classes of `.STATUS` issue: a non-numeric `progress:` value (parsed as `0`, with the bad value quoted) and a duplicate top-level key (last occurrence wins, both line numbers named — common in files with a stale "preserved original content" block below an active header). Warnings print under the sync summary; also available via `atlas doctor` (below).
>
> **Orphaned entries:** `--remove-orphans` deletes registry entries whose `path` no longer exists on disk — checked against the real filesystem, not against what the current scan happened to discover, so a narrow `--paths` scope never orphans unrelated registered projects. With `--dry-run`, orphaned entries are reported (name + path) but not deleted.

### `atlas doctor`

Audit every project against the **Project Settings Contract** (docs-standards `adr/ADR-001`): `.STATUS` (required), `CLAUDE.md` (required), `.flow/obsidian-sync.yml` (info — owned by savant's `/obs:sync` / `research-scaffold`), and any `.STATUS` parse warnings for that project.

```bash
atlas doctor [options]

Options:
  --kind <kind>        Only audit a kind (manuscript|program|package)
  --all                List all audited projects, not just those with gaps
  --all-registered     Include worktrees / tmp / non-project registry entries
  --fix                Create missing CLAUDE.md (preview unless --write)
  --write              With --fix, actually write the files
  --format <format>    table (default) | json
```

Exit code **1** when any project is missing `.STATUS` (a drift guard for CI / launchd); **0** otherwise. By default worktrees, `/tmp`, and `node_modules` paths are excluded — pass `--all-registered` to include them.

**Examples:**
```bash
atlas doctor                              # audit real projects
atlas doctor --kind program --format json # research programs, as JSON
atlas doctor --fix                        # preview missing CLAUDE.md
atlas doctor --fix --write                # actually create them
```

> The `.flow/obsidian-sync.yml` column is informational — it's owned by savant's `research-scaffold`
> skill (`--mode repo` auto-scaffolds it) or the `/obs:sync` command, not by atlas. Rows also carry
> `parseWarnings` (`.STATUS` non-numeric progress / duplicate-key issues) when present. See
> [Research Registry](user-guide/tutorials/research-registry.md).
>
> **Orphaned & duplicate-named entries:** a registered project whose `path` no longer exists on
> disk is flagged 💀 orphaned (distinct from "missing CLAUDE.md" — its contract checks are all
> skipped, not failed) and excluded from `--fix`. Two or more entries sharing the same `name` (most
> often a stale duplicate left behind by a repo move or monorepo archival) print their `path` in
> brackets so the real project is never mistaken for the dead one. Run `atlas sync --remove-orphans`
> to clean up orphaned entries.

---

## Configuration

### `atlas config show`

Display all configuration.

```bash
atlas config show
```

### `atlas config paths`

Show configured scan paths.

```bash
atlas config paths
```

### `atlas config add-path`

Add a scan path.

```bash
atlas config add-path <path>
```

### `atlas config remove-path`

Remove a scan path.

```bash
atlas config remove-path <path>
```

### `atlas config setup`

Interactive configuration wizard.

```bash
atlas config setup
```

### `atlas config prefs`

Manage underlying preferences for Atlas.

#### `atlas config prefs show`
Display all preferences.
```bash
atlas config prefs show
```

#### `atlas config prefs get`
Get a specific preference value.
```bash
atlas config prefs get <path>
atlas config prefs get adhd.showStreak
```

#### `atlas config prefs set`
Set a specific preference value.
```bash
atlas config prefs set <path> <value>
atlas config prefs set adhd.celebrationLevel enthusiastic
```

#### `atlas config prefs reset`
Reset all preferences to default.
```bash
atlas config prefs reset
```

#### `atlas config prefs defaults`
Show the default preference values.
```bash
atlas config prefs defaults
```

**Common Preferences:**
```bash
# ADHD settings
atlas config prefs set adhd.showStreak true
atlas config prefs set adhd.showTimeCues true
atlas config prefs set adhd.celebrationLevel normal  # minimal|normal|enthusiastic

# Session settings
atlas config prefs set session.pomodoroLength 25
atlas config prefs set session.breakLength 5

# Template variables
atlas config prefs set templateVariables.author "Your Name"
atlas config prefs set templateVariables.github_user youruser
```

---

## Storage & Migration

??? note "Legacy — `atlas migrate` (rarely needed; most users stay on the default filesystem backend)"

    ### `atlas migrate`

    Migrate between storage backends.

    ```bash
    atlas migrate [options]

    Options:
      -f, --from <type>    Source backend (filesystem|sqlite)
      -t, --to <type>      Target backend (filesystem|sqlite)
      --dry-run            Preview migration
    ```

    **Examples:**
    ```bash
    # Migrate to SQLite
    atlas migrate --to sqlite

    # Migrate back to filesystem
    atlas migrate --to filesystem

    # Preview migration
    atlas migrate --to sqlite --dry-run
    ```

    ### `atlas migrate --status` (v0.14.0+)

    Convert a legacy `.STATUS` file (markdown `## Key:` headers or bare `key: value` lines) to
    canonical YAML frontmatter (schema `atlas/v1` — see [STATUS-SCHEMA.md](STATUS-SCHEMA.md)).
    Dry-run by default; nothing is written until `--apply` is passed.

    ```bash
    atlas migrate --status [path] [options]

    Options:
      --status         Migrate a .STATUS file (or directory of them, with --all-scanned)
      --apply          Write the migration (default is dry-run: prints a field-level diff)
      --all-scanned    Batch-migrate every .STATUS found under [path]
    ```

    **Examples:**
    ```bash
    # Dry-run against the current directory's .STATUS — prints a diff, writes nothing
    atlas migrate --status

    # Apply the migration
    atlas migrate --status ~/projects/research/pmed-modern --apply

    # Batch-migrate every .STATUS under a research root
    atlas migrate --status ~/projects/research --all-scanned --apply
    ```

    An already-canonical file is skipped (reported, not touched). Writing a legacy file directly via
    `StatusFileGateway.write()` (e.g. from `sync`) refuses with an error naming this command unless
    the caller opts in via `{ migrate: true }`.

    ### Using SQLite Backend

    ```bash
    # Use SQLite for single command
    atlas --storage sqlite status

    # Set as default in config
    atlas config prefs set storage sqlite
    ```

---

## Shell Completions

### `atlas completions`

Generate shell completion scripts.

```bash
atlas completions [shell]

Arguments:
  shell    Shell type: zsh, bash, fish
```

**Installation:**
```bash
# Zsh — write to fpath (recommended)
atlas completions zsh > ~/.config/zsh/completions/_atlas
# Add to ~/.zshrc:
#   fpath=(~/.config/zsh/completions $fpath)
#   autoload -Uz compinit && compinit

# Bash
atlas completions bash > ~/.bash_completion.d/atlas
# Add to ~/.bashrc: source ~/.bash_completion.d/atlas

# Fish
atlas completions fish > ~/.config/fish/completions/atlas.fish
```

---

## Environment Variables

| Variable        | Description           | Default      |
| --------------- | --------------------- | ------------ |
| `ATLAS_CONFIG`  | Config directory path | `~/.atlas`   |
| `ATLAS_STORAGE` | Storage backend       | `filesystem` |

---

## Exit Codes

| Code | Meaning           |
| ---- | ----------------- |
| 0    | Success           |
| 1    | General error     |
| 2    | Invalid arguments |
| 3    | Project not found |
| 4    | Session error     |

---

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [Programmatic API Guide](./API-GUIDE.md)
- [Configuration Reference](./CONFIGURATION.md)


---

**Now what?** → [Quick Reference Card](./REFCARD.md)
