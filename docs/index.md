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
Track productivity with `atlas stats`. Weekly/monthly summaries, streaks, velocity, and flow patterns.
</div>

<div class="feature-card" markdown>
### :heavy_check_mark: Task Management
CRUD tasks with `atlas task add/list/done/rm`. Filter by priority, due date, and project.
</div>

<div class="feature-card" markdown>
### :calendar: Agenda & Schedule
Merged chronological view of tasks and schedule records with `atlas agenda`.
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
Ink-powered TUI with SINGLE/SPLIT/TRIPLE layouts. Sidebar, inspector, Pomodoro timer, and analytics view.
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
| [What's New](WHAT-S-NEW.md) | Release highlights |
| [Changelog](https://github.com/Data-Wise/atlas/blob/main/CHANGELOG.md) | Full version history (Keep a Changelog) |
| [Tutorial](TUTORIAL.md) | Step-by-step introduction (15 min) |
| [Quick Reference](REFCARD.md) | Printable command cheat sheet |
| [Cheatsheet](CHEATSHEET.md) | Compact command reference |
| [Workflows](user-guide/workflows/WORKFLOWS.md) | ADHD-friendly workflow patterns |
| [Visual Guide](VISUAL-GUIDE.md) | Themes, focus score, sparklines, heatmap |
| [CLI Reference](CLI-REFERENCE.md) | Complete command documentation |
| [Configuration](CONFIGURATION.md) | All settings and preferences |
| [Architecture](ARCHITECTURE.md) | System design and patterns |
| [API Guide](API-GUIDE.md) | Using Atlas as a library |
| [MCP Server](MCP-SERVER.md) | Claude integration via MCP |
| [Integrations](INTEGRATIONS.md) | Dev-tools ecosystem map |

## :sparkles: What's New (v0.13.1)

!!! success "YAML Passthrough + Inbox Flags"
    - **YAML passthrough (#65)** — `StatusFileGateway` uses `yaml.stringify()`/`yaml.parse()` instead of hand-rolled template; unknown fields (research metadata, custom fields like `venue`, `tasks`) survive read-write round-trip
    - **`atlas inbox --type`** — filter captures by type (`idea`, `task`, `bug`, `note`, `question`, `parked`, `win`)
    - **`atlas inbox --limit`** — cap the number of items returned
    - **Win capture type** — `'win'` added to `Capture.TYPES` for quick-win tracking
    - **E2E tests** — 6 new tests covering inbox flags, YAML round-trip, and help output

!!! info "Previous Releases"
    See the [full changelog](https://github.com/Data-Wise/atlas/blob/main/CHANGELOG.md) for details on all releases.

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
- [What's New](WHAT-S-NEW.md)
