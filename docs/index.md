# Atlas

<div class="hero" markdown>
# :rocket: Atlas
**Project State Engine for ADHD-Friendly Workflow**

[![Tests](https://github.com/Data-Wise/atlas/actions/workflows/test.yml/badge.svg)](https://github.com/Data-Wise/atlas/actions/workflows/test.yml)
[![GitHub release](https://img.shields.io/github/v/release/Data-Wise/atlas)](https://github.com/Data-Wise/atlas/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
</div>

---

Atlas is a project state management engine that helps developers track projects, sessions, and context. Designed with ADHD-friendly features like streak tracking, gentle time awareness, and celebration helpers.

## :sparkles: Features

<div class="feature-grid" markdown>

<div class="feature-card" markdown>
### :file_folder: Project Registry
Track all your projects with status, tags, and metadata. Sync from `.STATUS` files or register manually.
</div>

<div class="feature-card" markdown>
### :clock3: Session Tracking
Start work sessions, track duration, and get flow state insights. Context restoration on session start.
</div>

<div class="feature-card" markdown>
### :bulb: Quick Capture
Capture ideas, tasks, and bugs without breaking flow. Triage inbox when ready.
</div>

<div class="feature-card" markdown>
### :footprints: Breadcrumb Trail
Leave context markers for "where was I?" moments. Never lose your place again.
</div>

<div class="feature-card" markdown>
### :chart_with_upwards_trend: Session Analytics
Track productivity with `atlas stats`. Weekly/monthly summaries, streaks, and flow metrics.
</div>

<div class="feature-card" markdown>
### :tomato: Task-Based Focus
Pomodoro timer with task prompts. Set what you'll focus on, track completion outcomes.
</div>

<div class="feature-card" markdown>
### :calendar: Calendar Export
Export sessions to iCal/ICS format. Import your work history into any calendar app.
</div>

<div class="feature-card" markdown>
### :brain: ADHD-Friendly
Streak tracking, time blindness helpers, celebrations, and anti-perfectionism features.
</div>

<div class="feature-card" markdown>
### :desktop_computer: Multi-Panel Dashboard
Ink-powered TUI with SINGLE/SPLIT/TRIPLE layouts. Sidebar, inspector, and Pomodoro timer.
</div>

<div class="feature-card" markdown>
### :robot: MCP Server
Expose Atlas to Claude via Model Context Protocol. 10 tools for sessions, captures, and context.
</div>

</div>

## :zap: Quick Start

=== "Homebrew"

    ```bash
    brew tap data-wise/tap
    brew install atlas
    ```

=== "curl"

    ```bash
    curl -fsSL https://raw.githubusercontent.com/Data-Wise/atlas/main/install.sh | bash
    ```

=== "npm"

    ```bash
    npm install -g @data-wise/atlas
    ```

=== "From Source"

    ```bash
    git clone https://github.com/Data-Wise/atlas.git
    cd atlas && npm install && npm link
    ```

## :movie_camera: See It In Action

![Getting Started Demo](demos/getting-started.gif)

[:material-play-circle: View all demos](DEMOS.md){ .md-button }

## :computer: Basic Usage

```bash
# Initialize atlas
atlas init

# Start a work session
atlas session start myproject

# Quick capture an idea
atlas catch "check VanderWeele 2015 appendix"

# Show context
atlas where

# View analytics
atlas stats

# End session with celebration
atlas session end "Completed initial implementation"

# Launch dashboard
atlas dash
```

## :books: Documentation

| Guide | Description |
|-------|-------------|
| [Tutorial](TUTORIAL.md) | Step-by-step introduction (15 min) |
| [Quick Reference](REFCARD.md) | Printable command cheat sheet |
| [Workflows](WORKFLOWS.md) | ADHD-friendly workflow patterns |
| [Visual Guide](VISUAL-GUIDE.md) | Themes, focus score, sparklines, heatmap |
| [CLI Reference](CLI-REFERENCE.md) | Complete command documentation |
| [Configuration](CONFIGURATION.md) | All settings and preferences |
| [Architecture](ARCHITECTURE.md) | System design and patterns |
| [API Guide](API-GUIDE.md) | Using Atlas as a library |
| [MCP Server](MCP-SERVER.md) | Claude integration via MCP |
| [Integrations](INTEGRATIONS.md) | Dev-tools ecosystem map |

## :sparkles: What's New in v0.10.0

!!! success "Temporal Intelligence"
    Three new read-only analytics utilities mine your existing session history — no new data collection:

    - **`atlas stats --velocity`** — 4-week rolling velocity: sessions/week, focus hours, consistency bar, trend arrow (↑/↓/→)
    - **`atlas stats --patterns`** — Productivity patterns from 90 days: best day, best hour, dead zones (slots with 0 flow)
    - **`atlas stats --calibrate <project> --minutes <n>`** — Bayesian time calibration: how much you historically over/under-run a project, with confidence level
    - **3 pure utility classes** in `src/utils/`: `VelocityCalculator`, `PatternAnalyzer`, `PredictionEngine` (31 unit tests)

## :sparkles: What's New in v0.9.3

!!! success "flow-cli Integration"
    atlas now honors the CLI flags flow-cli already calls — closing contract drift between the two tools:

    - **`session status --format json`** — structured output (`{project, durationMinutes, state, task, startedAt}`) for shell conflict-detection
    - **`project list --count` / `--suggest`** — bare count, and the most-recently-touched active project
    - **`inbox --count`** — pending inbox count for shell badges
    - **`trail --limit <n>`** — cap breadcrumbs to the N most recent
    - **Fix:** `project list --status` now resolves status from project metadata (previously matched nothing)

    See [Integrations](INTEGRATIONS.md) for the full flow-cli ↔ atlas contract.

## :sparkles: What's New in v0.9.2

!!! success "Real Data Pipeline"
    The dashboard now displays **live data** from `~/.atlas` — all mock data removed:

    - **4 React Hooks**: `useProjects`, `useActiveSession`, `useProjectStats`, `usePendingCaptures`
    - **AtlasContext**: DI Container injected via React Context for clean data access
    - **Smart Filtering**: Removes tmp.* junk, archived projects, and duplicates (196 raw → ~59 displayed)
    - **Polling**: Projects 5s, Session 5s + 1s tick, Stats/Captures 10s

!!! tip "Focus Score & Tiers"
    Understand your work quality at a glance:

    - **● Deep** (80-100): Sustained, flow-rich sessions
    - **◕ Strong** (60-79): Good balance of duration and flow
    - **◑ Steady** (40-59): Regular engagement
    - **◔ Warming** (20-39): Building momentum
    - **○ Drift** (0-19): Getting started

    See [Visual Guide](VISUAL-GUIDE.md) for the full calculation formula.

!!! info "Activity Heatmap"
    13-week activity overview with two display modes:

    - **Full mode** (InspectorPanel): 7 rows — all days of the week
    - **Compact mode** (EcosystemView): 4 rows — Mon/Wed/Fri/Sat
    - Shows streak, total sessions, and best day summary

!!! note "Theme System (v0.9.1)"
    Five color themes optimized for terminal readability:

    - `default` — Purple accents, warm grays
    - `nord` — Arctic blue palette
    - `solarized` — Ethan Schoonover's classic
    - `mono` — Pure grayscale
    - `high-contrast` — Maximum readability

??? note "Previous Releases"
    - **v0.9.1**: Visual Enhancements — themes, focus score, sparklines, heatmap
    - **v0.9.0**: Ink TUI Modernization, Multi-Panel Dashboard, 73% code reduction
    - **v0.8.0**: Ecosystem Hub, Morning Ritual, MCP Server, Time Estimation
    - **v0.7.0**: Task-Based Focus, Calendar Export, Timeline View
    - **v0.6.x**: Session analytics, stats export

## :heart: ADHD-Friendly Design

Atlas is designed with ADHD in mind:

- **Streak Tracking**: Visual motivation with consecutive day tracking
- **Time Blindness Helper**: Gentle time cues without breaking flow
- **Celebration Helper**: Positive reinforcement on achievements
- **Context Restoration**: "Last time you were..." on session start
- **Anti-Perfectionism**: "Good enough" session endings
- **Quick Capture**: Don't lose thoughts - capture instantly

## :link: Links

- [GitHub Repository](https://github.com/Data-Wise/atlas)
- [Issue Tracker](https://github.com/Data-Wise/atlas/issues)
- [Changelog](https://github.com/Data-Wise/atlas/blob/main/CHANGELOG.md)
