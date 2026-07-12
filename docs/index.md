# Atlas

<div class="hero" markdown>

# :rocket: Atlas
**Project State Engine for ADHD-Friendly Workflow**

[![Tests](https://github.com/Data-Wise/atlas/actions/workflows/test.yml/badge.svg)](https://github.com/Data-Wise/atlas/actions/workflows/test.yml)
[![GitHub release](https://img.shields.io/github/v/release/Data-Wise/atlas)](https://github.com/Data-Wise/atlas/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

Atlas is a project state management engine that helps developers track projects, sessions, and context. Designed with ADHD-friendly features like streak tracking, gentle time awareness, and celebration helpers.

</div>

## :sparkles: Core Features

<div class="feature-grid" markdown>

<div class="feature-card" markdown>
### :file_folder: Project Registry
Track every project with status, tags, and metadata. Sync from `.STATUS` files or register manually.
</div>

<div class="feature-card" markdown>
### :clock3: Session Tracking
Start work sessions, measure flow, and restore context automatically when you return.
</div>

<div class="feature-card" markdown>
### :bulb: Quick Capture
Capture ideas, tasks, and bugs without breaking flow — then triage your inbox later.
</div>

<div class="feature-card" markdown>
### :chart_with_upwards_trend: Analytics
`atlas stats` for streaks, velocity, and flow patterns. Spot trends before they slip.
</div>

<div class="feature-card" markdown>
### :desktop_computer: Dashboard
Ink-powered TUI with SINGLE/SPLIT/TRIPLE layouts, a Pomodoro timer, and an analytics view.
</div>

<div class="feature-card" markdown>
### :robot: MCP Server
Expose Atlas to Claude via the Model Context Protocol — 10 tools for sessions, captures, and context.
</div>

</div>

## :zap: Install

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

## :books: Where to Next

| Guide | Description |
|-------|-------------|
| [Getting Started](getting-started/installation.md) | Install and configure Atlas |
| [Tutorial](TUTORIAL.md) | Step-by-step introduction (15 min) |
| [Guides](user-guide/adhd-guide/core-principles.md) | ADHD-friendly workflows and principles |
| [CLI Reference](CLI-REFERENCE.md) | Complete command documentation |
| [MCP Server](MCP-SERVER.md) | Claude integration via MCP |
| [What's New](WHAT-S-NEW.md) | Latest release highlights |

## :heart: Built for ADHD Minds

- **Streak Tracking** — visual motivation through consecutive-day tracking
- **Time Blindness Helper** — gentle time cues without breaking flow
- **Celebration Helper** — positive reinforcement on achievements
- **Context Restoration** — "Last time you were…" on session start
- **Anti-Perfectionism** — "good enough" session endings that actually ship

## :link: Links

- [GitHub Repository](https://github.com/Data-Wise/atlas)
- [Issue Tracker](https://github.com/Data-Wise/atlas/issues)
- [Changelog](https://github.com/Data-Wise/atlas/blob/main/CHANGELOG.md)
